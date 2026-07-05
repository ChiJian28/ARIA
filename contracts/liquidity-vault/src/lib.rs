#![cfg_attr(not(test), no_std)]
//! LiquidityVault — ARIA CEP-18-compatible LP Token Vault
//!
//! LPs deposit CSPR and receive ARIA-LP tokens. The vault tracks collateral
//! locked against approved RWA instruments.

use odra::prelude::*;
use odra::casper_types::U512;

// ─── Errors ──────────────────────────────────────────────────────────────────

#[odra::odra_error]
pub enum Error {
    Unauthorized = 1,
    InsufficientBalance = 2,
    InsufficientLiquidity = 3,
    CollateralAlreadyLocked = 4,
    CollateralNotFound = 5,
    ZeroAmount = 6,
    WithdrawalExceedsAvailable = 7,
    OwnerNotSet = 8,
}

// ─── Events ──────────────────────────────────────────────────────────────────

#[odra::event]
pub struct Deposited {
    pub depositor: Address,
    pub cspr_amount: U512,
    pub lp_minted: U512,
}

#[odra::event]
pub struct Withdrawn {
    pub withdrawer: Address,
    pub lp_burned: U512,
    pub cspr_returned: U512,
}

#[odra::event]
pub struct CollateralLocked {
    pub rwa_id: String,
    pub amount: U512,
}

#[odra::event]
pub struct CollateralReleased {
    pub rwa_id: String,
    pub amount: U512,
}

#[odra::event]
pub struct YieldAccrued {
    pub rwa_id: String,
    pub yield_amount: U512,
}

// ─── Contract ─────────────────────────────────────────────────────────────────

#[odra::module(
    events = [Deposited, Withdrawn, CollateralLocked, CollateralReleased, YieldAccrued],
    errors = Error
)]
pub struct LiquidityVault {
    owner: Var<Address>,
    name: Var<String>,
    symbol: Var<String>,
    decimals: Var<u8>,

    // LP token state
    total_lp_supply: Var<U512>,
    lp_balance: Mapping<Address, U512>,

    // CSPR pool tracking
    total_cspr: Var<U512>,
    locked_cspr: Var<U512>,
    user_cspr_deposited: Mapping<Address, U512>,

    // Per-RWA collateral
    collateral_locked: Mapping<String, U512>,

    // Yield accrual
    total_yield_received: Var<U512>,
}

#[odra::module]
impl LiquidityVault {
    pub fn init(&mut self, name: String, symbol: String) {
        let caller = self.env().caller();
        self.owner.set(caller);
        self.name.set(name);
        self.symbol.set(symbol);
        self.decimals.set(9u8);
        self.total_lp_supply.set(U512::zero());
        self.total_cspr.set(U512::zero());
        self.locked_cspr.set(U512::zero());
        self.total_yield_received.set(U512::zero());
    }

    // ─── LP token operations ───────────────────────────────────────────────

    /// Deposit CSPR and receive LP tokens. Call with attached CSPR value.
    #[odra(payable)]
    pub fn deposit(&mut self) {
        let caller = self.env().caller();
        let amount = self.env().attached_value();

        if amount == U512::zero() {
            self.env().revert(Error::ZeroAmount);
        }

        let lp_to_mint = self.calc_lp_for_deposit(amount);
        self.total_cspr.add(amount);
        self.lp_balance.add(&caller, lp_to_mint);
        self.total_lp_supply.add(lp_to_mint);
        self.user_cspr_deposited.add(&caller, amount);

        self.env().emit_event(Deposited {
            depositor: caller,
            cspr_amount: amount,
            lp_minted: lp_to_mint,
        });
    }

    /// Burn LP tokens and receive proportional CSPR.
    pub fn withdraw(&mut self, lp_amount: U512) {
        let caller = self.env().caller();

        if lp_amount == U512::zero() {
            self.env().revert(Error::ZeroAmount);
        }
        let balance = self.lp_balance.get_or_default(&caller);
        if lp_amount > balance {
            self.env().revert(Error::InsufficientBalance);
        }

        let cspr_to_return = self.calc_cspr_for_lp(lp_amount);
        let available = self.available_cspr();

        if cspr_to_return > available {
            self.env().revert(Error::WithdrawalExceedsAvailable);
        }

        self.lp_balance.subtract(&caller, lp_amount);
        self.total_lp_supply.subtract(lp_amount);
        self.total_cspr.subtract(cspr_to_return);
        self.env().transfer_tokens(&caller, &cspr_to_return);

        self.env().emit_event(Withdrawn {
            withdrawer: caller,
            lp_burned: lp_amount,
            cspr_returned: cspr_to_return,
        });
    }

    // ─── Collateral management (owner-only) ────────────────────────────────

    pub fn lock_collateral(&mut self, rwa_id: String, amount: U512) {
        self.assert_owner();
        if amount == U512::zero() {
            self.env().revert(Error::ZeroAmount);
        }
        if self.collateral_locked.get_or_default(&rwa_id) > U512::zero() {
            self.env().revert(Error::CollateralAlreadyLocked);
        }
        let available = self.available_cspr();
        if amount > available {
            self.env().revert(Error::InsufficientLiquidity);
        }

        self.collateral_locked.set(&rwa_id, amount);
        self.locked_cspr.add(amount);
        self.env().emit_event(CollateralLocked { rwa_id, amount });
    }

    pub fn release_collateral(&mut self, rwa_id: String) {
        self.assert_owner();
        let amount = self.collateral_locked.get_or_default(&rwa_id);
        if amount == U512::zero() {
            self.env().revert(Error::CollateralNotFound);
        }
        self.collateral_locked.set(&rwa_id, U512::zero());
        self.locked_cspr.subtract(amount);
        self.env().emit_event(CollateralReleased { rwa_id, amount });
    }

    /// Record yield received from an RWA repayment (payable).
    #[odra(payable)]
    pub fn receive_yield(&mut self, rwa_id: String) {
        self.assert_owner();
        let yield_amount = self.env().attached_value();
        if yield_amount == U512::zero() {
            self.env().revert(Error::ZeroAmount);
        }
        self.total_cspr.add(yield_amount);
        self.total_yield_received.add(yield_amount);
        self.env().emit_event(YieldAccrued { rwa_id, yield_amount });
    }

    // ─── CEP-18 view queries ───────────────────────────────────────────────

    pub fn name(&self) -> String {
        self.name.get_or_default()
    }

    pub fn symbol(&self) -> String {
        self.symbol.get_or_default()
    }

    pub fn decimals(&self) -> u8 {
        self.decimals.get_or_default()
    }

    pub fn total_supply(&self) -> U512 {
        self.total_lp_supply.get_or_default()
    }

    pub fn balance_of(&self, address: Address) -> U512 {
        self.lp_balance.get_or_default(&address)
    }

    // ─── Vault statistics ──────────────────────────────────────────────────

    pub fn total_value_locked(&self) -> U512 {
        self.total_cspr.get_or_default()
    }

    pub fn get_locked_cspr(&self) -> U512 {
        self.locked_cspr.get_or_default()
    }

    pub fn available_cspr(&self) -> U512 {
        let total = self.total_cspr.get_or_default();
        let locked = self.locked_cspr.get_or_default();
        if locked >= total { U512::zero() } else { total - locked }
    }

    pub fn get_collateral_for_rwa(&self, rwa_id: String) -> U512 {
        self.collateral_locked.get_or_default(&rwa_id)
    }

    pub fn get_total_yield_received(&self) -> U512 {
        self.total_yield_received.get_or_default()
    }

    pub fn get_user_deposited(&self, address: Address) -> U512 {
        self.user_cspr_deposited.get_or_default(&address)
    }

    pub fn get_lp_for_cspr(&self, cspr_amount: U512) -> U512 {
        self.calc_lp_for_deposit(cspr_amount)
    }

    pub fn get_cspr_for_lp(&self, lp_amount: U512) -> U512 {
        self.calc_cspr_for_lp(lp_amount)
    }

    // ─── Internal helpers ──────────────────────────────────────────────────

    fn calc_lp_for_deposit(&self, cspr_amount: U512) -> U512 {
        let total_lp = self.total_lp_supply.get_or_default();
        let total_cspr = self.total_cspr.get_or_default();
        if total_lp == U512::zero() || total_cspr == U512::zero() {
            cspr_amount
        } else {
            cspr_amount * total_lp / total_cspr
        }
    }

    fn calc_cspr_for_lp(&self, lp_amount: U512) -> U512 {
        let total_lp = self.total_lp_supply.get_or_default();
        let total_cspr = self.total_cspr.get_or_default();
        if total_lp == U512::zero() {
            U512::zero()
        } else {
            lp_amount * total_cspr / total_lp
        }
    }

    fn assert_owner(&self) {
        let owner = if let Some(addr) = self.owner.get() {
            addr
        } else {
            self.env().revert(Error::OwnerNotSet)
        };
        if self.env().caller() != owner {
            self.env().revert(Error::Unauthorized);
        }
    }
}

// ─── Tests ────────────────────────────────────────────────────────────────────

#[cfg(test)]
mod tests {
    use super::*;
    use odra::host::{Deployer, HostEnv, HostRef};

    fn setup() -> (HostEnv, LiquidityVaultHostRef) {
        let env = odra_test::env();
        let contract = LiquidityVault::deploy(
            &env,
            LiquidityVaultInitArgs {
                name: "ARIA LP Token".to_string(),
                symbol: "ARIA-LP".to_string(),
            },
        );
        (env, contract)
    }

    #[test]
    fn test_deploy() {
        let (_env, vault) = setup();
        assert_eq!(vault.name(), "ARIA LP Token".to_string());
        assert_eq!(vault.symbol(), "ARIA-LP".to_string());
        assert_eq!(vault.decimals(), 9u8);
        assert_eq!(vault.total_supply(), U512::zero());
        assert_eq!(vault.total_value_locked(), U512::zero());
    }

    #[test]
    fn test_deposit_and_withdraw() {
        let (env, mut vault) = setup();
        let lp = env.get_account(1);

        let deposit_amount = U512::from(1_000u64);
        env.set_caller(lp);
        vault.with_tokens(deposit_amount).deposit();

        assert_eq!(vault.balance_of(lp), deposit_amount);
        assert_eq!(vault.total_supply(), deposit_amount);
        assert_eq!(vault.total_value_locked(), deposit_amount);

        let lp_to_burn = U512::from(500u64);
        vault.withdraw(lp_to_burn);

        assert_eq!(vault.balance_of(lp), U512::from(500u64));
        assert_eq!(vault.total_supply(), U512::from(500u64));
    }

    #[test]
    fn test_lock_and_release_collateral() {
        let (env, mut vault) = setup();
        let owner = env.get_account(0);
        let lp = env.get_account(1);

        env.set_caller(lp);
        vault.with_tokens(U512::from(10_000u64)).deposit();

        env.set_caller(owner);
        let rwa_id = "rwa-collateral-test".to_string();
        vault.lock_collateral(rwa_id.clone(), U512::from(5_000u64));

        assert_eq!(vault.get_locked_cspr(), U512::from(5_000u64));
        assert_eq!(vault.available_cspr(), U512::from(5_000u64));

        vault.release_collateral(rwa_id.clone());
        assert_eq!(vault.get_locked_cspr(), U512::zero());
        assert_eq!(vault.available_cspr(), U512::from(10_000u64));
    }

    #[test]
    fn test_withdrawal_blocked_when_all_locked() {
        let (env, mut vault) = setup();
        let owner = env.get_account(0);
        let lp = env.get_account(1);

        env.set_caller(lp);
        vault.with_tokens(U512::from(1_000u64)).deposit();

        env.set_caller(owner);
        vault.lock_collateral("rwa-lock-all".to_string(), U512::from(1_000u64));

        env.set_caller(lp);
        let result = vault.try_withdraw(U512::from(1_000u64));
        assert!(result.is_err());
    }
}
