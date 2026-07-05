#![cfg_attr(not(test), no_std)]
//! SettlementEngine — ARIA Yield Router and Maturity Processor
//!
//! Handles the full RWA lifecycle after approval:
//!   1. Registers approved instruments with face value, rate, and maturity.
//!   2. Processes repayments (principal + interest) on maturity.
//!   3. Distributes yield net of protocol fee to the LiquidityVault.
//!   4. Triggers liquidation events for defaulted instruments.

use odra::prelude::*;
use odra::casper_types::U512;

// ─── Errors ──────────────────────────────────────────────────────────────────

#[odra::odra_error]
pub enum Error {
    Unauthorized = 1,
    RwaNotFound = 2,
    RwaAlreadyRegistered = 3,
    AlreadySettled = 4,
    AlreadyLiquidated = 5,
    InvalidFee = 6,
    ZeroAmount = 7,
    OwnerNotSet = 8,
}

// Instrument status stored as u8
const STATUS_ACTIVE: u8 = 0u8;
const STATUS_SETTLED: u8 = 1u8;
const STATUS_LIQUIDATED: u8 = 2u8;

// ─── Events ──────────────────────────────────────────────────────────────────

#[odra::event]
pub struct InstrumentRegistered {
    pub rwa_id: String,
    pub face_value: U512,
    pub financing_rate_bps: u32,
    pub maturity_timestamp: u64,
}

#[odra::event]
pub struct RepaymentProcessed {
    pub rwa_id: String,
    pub repayment_amount: U512,
    pub yield_distributed: U512,
    pub protocol_fee: U512,
}

#[odra::event]
pub struct YieldDistributed {
    pub rwa_id: String,
    pub amount: U512,
    pub recipient_vault: Address,
}

#[odra::event]
pub struct LiquidationTriggered {
    pub rwa_id: String,
    pub collateral_seized: U512,
    pub triggered_by: Address,
}

#[odra::event]
pub struct FeeUpdated {
    pub new_fee_bps: u32,
}

// ─── Contract ─────────────────────────────────────────────────────────────────

#[odra::module(
    events = [
        InstrumentRegistered, RepaymentProcessed, YieldDistributed,
        LiquidationTriggered, FeeUpdated
    ],
    errors = Error
)]
pub struct SettlementEngine {
    owner: Var<Address>,
    protocol_fee_bps: Var<u32>,
    vault_address: Var<Address>,
    total_protocol_fees: Var<U512>,

    // Per-RWA instrument data
    instrument_face_value: Mapping<String, U512>,
    instrument_rate_bps: Mapping<String, u32>,
    instrument_maturity: Mapping<String, u64>,
    instrument_status: Mapping<String, u8>,
    instrument_repaid: Mapping<String, U512>,
    instrument_yield_paid: Mapping<String, U512>,

    total_principal_settled: Var<U512>,
    total_yield_distributed: Var<U512>,
}

#[odra::module]
impl SettlementEngine {
    pub fn init(&mut self, protocol_fee_bps: u32, vault_address: Address) {
        if protocol_fee_bps > 2000 {
            self.env().revert(Error::InvalidFee);
        }
        let caller = self.env().caller();
        self.owner.set(caller);
        self.protocol_fee_bps.set(protocol_fee_bps);
        self.vault_address.set(vault_address);
        self.total_protocol_fees.set(U512::zero());
        self.total_principal_settled.set(U512::zero());
        self.total_yield_distributed.set(U512::zero());
    }

    // ─── Owner management ──────────────────────────────────────────────────

    pub fn set_vault_address(&mut self, vault: Address) {
        self.assert_owner();
        self.vault_address.set(vault);
    }

    pub fn update_protocol_fee(&mut self, new_fee_bps: u32) {
        self.assert_owner();
        if new_fee_bps > 2000 {
            self.env().revert(Error::InvalidFee);
        }
        self.protocol_fee_bps.set(new_fee_bps);
        self.env().emit_event(FeeUpdated { new_fee_bps });
    }

    // ─── Instrument lifecycle ──────────────────────────────────────────────

    pub fn register_instrument(
        &mut self,
        rwa_id: String,
        face_value: U512,
        financing_rate_bps: u32,
        maturity_timestamp: u64,
    ) {
        self.assert_owner();
        if self.instrument_face_value.get_or_default(&rwa_id) > U512::zero() {
            self.env().revert(Error::RwaAlreadyRegistered);
        }
        if face_value == U512::zero() {
            self.env().revert(Error::ZeroAmount);
        }

        self.instrument_face_value.set(&rwa_id, face_value);
        self.instrument_rate_bps.set(&rwa_id, financing_rate_bps);
        self.instrument_maturity.set(&rwa_id, maturity_timestamp);
        self.instrument_status.set(&rwa_id, STATUS_ACTIVE);
        self.instrument_repaid.set(&rwa_id, U512::zero());
        self.instrument_yield_paid.set(&rwa_id, U512::zero());

        self.env().emit_event(InstrumentRegistered {
            rwa_id,
            face_value,
            financing_rate_bps,
            maturity_timestamp,
        });
    }

    /// Process a repayment. Attach the repayment CSPR to this call.
    #[odra(payable)]
    pub fn process_repayment(&mut self, rwa_id: String) {
        self.assert_owner();
        self.assert_active(&rwa_id);

        let repayment = self.env().attached_value();
        if repayment == U512::zero() {
            self.env().revert(Error::ZeroAmount);
        }

        let face_value = self.instrument_face_value.get_or_default(&rwa_id);

        // Yield portion = repayment - principal
        let yield_portion = if repayment > face_value {
            repayment - face_value
        } else {
            U512::zero()
        };

        // Protocol fee from yield
        let fee_bps = self.protocol_fee_bps.get_or_default();
        let protocol_fee = if yield_portion > U512::zero() {
            yield_portion * U512::from(fee_bps) / U512::from(10_000u32)
        } else {
            U512::zero()
        };
        let net_yield = if yield_portion > protocol_fee {
            yield_portion - protocol_fee
        } else {
            U512::zero()
        };

        self.instrument_repaid.add(&rwa_id, repayment);
        self.instrument_yield_paid.add(&rwa_id, net_yield);
        self.total_protocol_fees.add(protocol_fee);
        let principal_portion = if repayment < face_value { repayment } else { face_value };
        self.total_principal_settled.add(principal_portion);
        self.total_yield_distributed.add(net_yield);
        self.instrument_status.set(&rwa_id, STATUS_SETTLED);

        // Emit yield distribution event (actual transfer handled off-chain via vault)
        if net_yield > U512::zero() {
            let vault = if let Some(addr) = self.vault_address.get() {
                addr
            } else {
                self.env().revert(Error::OwnerNotSet)
            };
            self.env().emit_event(YieldDistributed {
                rwa_id: rwa_id.clone(),
                amount: net_yield,
                recipient_vault: vault,
            });
        }

        self.env().emit_event(RepaymentProcessed {
            rwa_id,
            repayment_amount: repayment,
            yield_distributed: net_yield,
            protocol_fee,
        });
    }

    pub fn trigger_liquidation(&mut self, rwa_id: String) {
        self.assert_owner();
        self.assert_active(&rwa_id);

        let face_value = self.instrument_face_value.get_or_default(&rwa_id);
        self.instrument_status.set(&rwa_id, STATUS_LIQUIDATED);

        let caller = self.env().caller();
        self.env().emit_event(LiquidationTriggered {
            rwa_id,
            collateral_seized: face_value,
            triggered_by: caller,
        });
    }

    /// Owner withdraws accumulated protocol fees.
    pub fn claim_protocol_fees(&mut self) {
        self.assert_owner();
        let fees = self.total_protocol_fees.get_or_default();
        if fees == U512::zero() {
            self.env().revert(Error::ZeroAmount);
        }
        self.total_protocol_fees.set(U512::zero());
        let owner = if let Some(addr) = self.owner.get() {
            addr
        } else {
            self.env().revert(Error::OwnerNotSet)
        };
        self.env().transfer_tokens(&owner, &fees);
    }

    // ─── View queries ──────────────────────────────────────────────────────

    pub fn get_instrument_status(&self, rwa_id: String) -> u8 {
        self.instrument_status.get_or_default(&rwa_id)
    }

    pub fn is_instrument_settled(&self, rwa_id: String) -> bool {
        self.instrument_status.get_or_default(&rwa_id) == STATUS_SETTLED
    }

    pub fn is_instrument_liquidated(&self, rwa_id: String) -> bool {
        self.instrument_status.get_or_default(&rwa_id) == STATUS_LIQUIDATED
    }

    pub fn get_face_value(&self, rwa_id: String) -> U512 {
        self.instrument_face_value.get_or_default(&rwa_id)
    }

    pub fn get_repaid_amount(&self, rwa_id: String) -> U512 {
        self.instrument_repaid.get_or_default(&rwa_id)
    }

    pub fn get_yield_paid(&self, rwa_id: String) -> U512 {
        self.instrument_yield_paid.get_or_default(&rwa_id)
    }

    pub fn get_protocol_fee_bps(&self) -> u32 {
        self.protocol_fee_bps.get_or_default()
    }

    pub fn get_total_protocol_fees(&self) -> U512 {
        self.total_protocol_fees.get_or_default()
    }

    pub fn get_total_yield_distributed(&self) -> U512 {
        self.total_yield_distributed.get_or_default()
    }

    pub fn get_vault_address(&self) -> Option<Address> {
        self.vault_address.get()
    }

    pub fn get_maturity(&self, rwa_id: String) -> u64 {
        self.instrument_maturity.get_or_default(&rwa_id)
    }

    // ─── Internal helpers ──────────────────────────────────────────────────

    fn stored_owner(&self) -> Address {
        if let Some(addr) = self.owner.get() {
            addr
        } else {
            self.env().revert(Error::OwnerNotSet)
        }
    }

    fn assert_owner(&self) {
        if self.env().caller() != self.stored_owner() {
            self.env().revert(Error::Unauthorized);
        }
    }

    fn assert_active(&self, rwa_id: &String) {
        let status = self.instrument_status.get_or_default(rwa_id);
        if status == STATUS_SETTLED {
            self.env().revert(Error::AlreadySettled);
        }
        if status == STATUS_LIQUIDATED {
            self.env().revert(Error::AlreadyLiquidated);
        }
        if self.instrument_face_value.get_or_default(rwa_id) == U512::zero() {
            self.env().revert(Error::RwaNotFound);
        }
    }
}

// ─── Tests ────────────────────────────────────────────────────────────────────

#[cfg(test)]
mod tests {
    use super::*;
    use odra::host::{Deployer, HostEnv, HostRef};

    fn setup() -> (HostEnv, SettlementEngineHostRef) {
        let env = odra_test::env();
        let vault_addr = env.get_account(5);
        let contract = SettlementEngine::deploy(
            &env,
            SettlementEngineInitArgs {
                protocol_fee_bps: 50u32,
                vault_address: vault_addr,
            },
        );
        (env, contract)
    }

    #[test]
    fn test_deploy() {
        let (_env, engine) = setup();
        assert_eq!(engine.get_protocol_fee_bps(), 50u32);
        assert_eq!(engine.get_total_yield_distributed(), U512::zero());
    }

    #[test]
    fn test_register_instrument() {
        let (env, mut engine) = setup();
        let owner = env.get_account(0);
        env.set_caller(owner);

        let rwa_id = "rwa-settlement-test".to_string();
        let face_value = U512::from(50_000u64);
        engine.register_instrument(rwa_id.clone(), face_value, 800u32, 1_800_000_000u64);

        assert_eq!(engine.get_face_value(rwa_id.clone()), face_value);
        assert_eq!(engine.get_instrument_status(rwa_id.clone()), STATUS_ACTIVE);
        assert!(!engine.is_instrument_settled(rwa_id.clone()));
        assert!(!engine.is_instrument_liquidated(rwa_id));
    }

    #[test]
    fn test_repayment_processing() {
        let (env, mut engine) = setup();
        let owner = env.get_account(0);
        env.set_caller(owner);

        let rwa_id = "rwa-repayment-test".to_string();
        let face_value = U512::from(100_000u64);
        engine.register_instrument(rwa_id.clone(), face_value, 800u32, 1_800_000_000u64);

        // Repay principal (100k) + 8% yield (8k) = 108k motes
        let total_repayment = U512::from(108_000u64);
        engine.with_tokens(total_repayment).process_repayment(rwa_id.clone());

        assert!(engine.is_instrument_settled(rwa_id.clone()));
        assert_eq!(engine.get_repaid_amount(rwa_id.clone()), total_repayment);

        // Protocol fee = 0.5% of yield (8000 * 50 / 10000 = 40)
        assert_eq!(engine.get_total_protocol_fees(), U512::from(40u64));
    }

    #[test]
    fn test_liquidation() {
        let (env, mut engine) = setup();
        let owner = env.get_account(0);
        env.set_caller(owner);

        let rwa_id = "rwa-liquidate-test".to_string();
        engine.register_instrument(rwa_id.clone(), U512::from(50_000u64), 800u32, 1_800_000_000u64);
        engine.trigger_liquidation(rwa_id.clone());
        assert!(engine.is_instrument_liquidated(rwa_id));
    }

    #[test]
    fn test_double_settle_rejected() {
        let (env, mut engine) = setup();
        let owner = env.get_account(0);
        env.set_caller(owner);

        let rwa_id = "rwa-double-settle".to_string();
        engine.register_instrument(rwa_id.clone(), U512::from(1000u64), 800u32, 1_800_000_000u64);
        engine.with_tokens(U512::from(1080u64)).process_repayment(rwa_id.clone());

        let result = engine
            .with_tokens(U512::from(1000u64))
            .try_process_repayment(rwa_id);
        assert!(result.is_err());
    }

    #[test]
    fn test_fee_update() {
        let (env, mut engine) = setup();
        let owner = env.get_account(0);
        env.set_caller(owner);
        engine.update_protocol_fee(100u32);
        assert_eq!(engine.get_protocol_fee_bps(), 100u32);
    }
}
