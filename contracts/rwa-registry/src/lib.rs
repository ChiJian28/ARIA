#![cfg_attr(not(test), no_std)]
//! RwaRegistry — ARIA On-Chain RWA + Agent Reputation NFT Registry
//!
//! Mints a unique NFT token for every approved RWA (trade finance instrument).
//! Also maintains non-transferable Reputation tracking for each AI agent.

use odra::prelude::*;

// ─── Errors ──────────────────────────────────────────────────────────────────

#[odra::odra_error]
pub enum Error {
    Unauthorized = 1,
    RwaAlreadyMinted = 2,
    AlreadyBurned = 3,
    InvalidOwner = 4,
    OwnerNotSet = 5,
}

// ─── Events ──────────────────────────────────────────────────────────────────

#[odra::event]
pub struct RwaMinted {
    pub token_id: u64,
    pub rwa_id: String,
    pub owner: Address,
}

#[odra::event]
pub struct RwaBurned {
    pub token_id: u64,
    pub rwa_id: String,
}

#[odra::event]
pub struct RwaLiquidated {
    pub token_id: u64,
    pub rwa_id: String,
    pub liquidated_by: Address,
}

#[odra::event]
pub struct ReputationUpdated {
    pub agent: Address,
    pub total_votes: u32,
    pub correct_votes: u32,
    pub reputation_score: u32,
}

#[odra::event]
pub struct Transfer {
    pub token_id: u64,
    pub from: Address,
    pub to: Address,
}

// ─── Contract ─────────────────────────────────────────────────────────────────

#[odra::module(
    events = [RwaMinted, RwaBurned, RwaLiquidated, ReputationUpdated, Transfer],
    errors = Error
)]
pub struct RwaRegistry {
    owner: Var<Address>,
    /// Address authorised to mint RWA tokens (council or backend deployer)
    minter: Var<Address>,

    // ── RWA NFT state ──────────────────────────────────────────────────────
    next_token_id: Var<u64>,
    token_owner: Mapping<u64, Address>,
    token_metadata: Mapping<u64, String>,
    token_active: Mapping<u64, bool>,
    rwa_to_token: Mapping<String, u64>,
    token_to_rwa: Mapping<u64, String>,
    total_supply: Var<u64>,

    // ── Agent Reputation ──────────────────────────────────────────────────
    agent_total_votes: Mapping<Address, u32>,
    agent_correct_votes: Mapping<Address, u32>,
    agent_reputation_score: Mapping<Address, u32>,
}

#[odra::module]
impl RwaRegistry {
    pub fn init(&mut self, minter: Address) {
        let caller = self.env().caller();
        self.owner.set(caller);
        self.minter.set(minter);
        self.next_token_id.set(1u64);
        self.total_supply.set(0u64);
    }

    // ─── Owner management ──────────────────────────────────────────────────

    pub fn set_minter(&mut self, minter: Address) {
        self.assert_owner();
        self.minter.set(minter);
    }

    // ─── RWA NFT minting ───────────────────────────────────────────────────

    pub fn mint_rwa(
        &mut self,
        rwa_id: String,
        owner_address: Address,
        metadata_json: String,
    ) -> u64 {
        self.assert_minter();
        if self.rwa_to_token.get_or_default(&rwa_id) != 0u64 {
            self.env().revert(Error::RwaAlreadyMinted);
        }

        let token_id = self.next_token_id.get_or_default();
        self.next_token_id.set(token_id + 1);

        self.token_owner.set(&token_id, owner_address);
        self.token_metadata.set(&token_id, metadata_json);
        self.token_active.set(&token_id, true);
        self.rwa_to_token.set(&rwa_id, token_id);
        self.token_to_rwa.set(&token_id, rwa_id.clone());
        self.total_supply.add(1u64);

        self.env().emit_event(RwaMinted {
            token_id,
            rwa_id,
            owner: owner_address,
        });

        token_id
    }

    pub fn burn_rwa(&mut self, token_id: u64) {
        let caller = self.env().caller();
        let is_privileged = self.is_owner_or_minter(caller);
        let is_token_owner = self.token_owner.get(&token_id) == Some(caller);

        if !is_privileged && !is_token_owner {
            self.env().revert(Error::Unauthorized);
        }
        if !self.token_active.get_or_default(&token_id) {
            self.env().revert(Error::AlreadyBurned);
        }

        self.token_active.set(&token_id, false);
        let rwa_id = self.token_to_rwa.get_or_default(&token_id);
        self.total_supply.subtract(1u64);

        self.env().emit_event(RwaBurned { token_id, rwa_id });
    }

    pub fn liquidate_rwa(&mut self, token_id: u64) {
        let caller = self.env().caller();
        if !self.is_owner_or_minter(caller) {
            self.env().revert(Error::Unauthorized);
        }
        if !self.token_active.get_or_default(&token_id) {
            self.env().revert(Error::AlreadyBurned);
        }

        self.token_active.set(&token_id, false);
        let rwa_id = self.token_to_rwa.get_or_default(&token_id);
        self.total_supply.subtract(1u64);

        self.env().emit_event(RwaLiquidated {
            token_id,
            rwa_id,
            liquidated_by: caller,
        });
    }

    pub fn transfer_rwa(&mut self, token_id: u64, to: Address) {
        let caller = self.env().caller();
        if self.token_owner.get(&token_id) != Some(caller) {
            self.env().revert(Error::InvalidOwner);
        }
        if !self.token_active.get_or_default(&token_id) {
            self.env().revert(Error::AlreadyBurned);
        }
        self.token_owner.set(&token_id, to);
        self.env().emit_event(Transfer {
            token_id,
            from: caller,
            to,
        });
    }

    // ─── Agent reputation ──────────────────────────────────────────────────

    pub fn update_reputation(&mut self, agent: Address, correct: bool) {
        self.assert_owner();

        let total = self.agent_total_votes.get_or_default(&agent) + 1;
        self.agent_total_votes.set(&agent, total);

        let correct_count = if correct {
            let c = self.agent_correct_votes.get_or_default(&agent) + 1;
            self.agent_correct_votes.set(&agent, c);
            c
        } else {
            self.agent_correct_votes.get_or_default(&agent)
        };

        let score = if total == 0 {
            50u32
        } else {
            (correct_count * 100) / total
        };
        self.agent_reputation_score.set(&agent, score);

        self.env().emit_event(ReputationUpdated {
            agent,
            total_votes: total,
            correct_votes: correct_count,
            reputation_score: score,
        });
    }

    // ─── View queries ──────────────────────────────────────────────────────

    pub fn get_metadata(&self, token_id: u64) -> String {
        self.token_metadata.get_or_default(&token_id)
    }

    pub fn get_token_owner(&self, token_id: u64) -> Option<Address> {
        self.token_owner.get(&token_id)
    }

    pub fn is_active(&self, token_id: u64) -> bool {
        self.token_active.get_or_default(&token_id)
    }

    pub fn get_token_by_rwa(&self, rwa_id: String) -> u64 {
        self.rwa_to_token.get_or_default(&rwa_id)
    }

    pub fn get_total_supply(&self) -> u64 {
        self.total_supply.get_or_default()
    }

    pub fn get_agent_reputation(&self, agent: Address) -> u32 {
        self.agent_reputation_score.get_or_default(&agent)
    }

    pub fn get_agent_total_votes(&self, agent: Address) -> u32 {
        self.agent_total_votes.get_or_default(&agent)
    }

    pub fn get_agent_correct_votes(&self, agent: Address) -> u32 {
        self.agent_correct_votes.get_or_default(&agent)
    }

    pub fn get_minter(&self) -> Option<Address> {
        self.minter.get()
    }

    // ─── Internal helpers ──────────────────────────────────────────────────

    fn stored_owner(&self) -> Address {
        if let Some(addr) = self.owner.get() {
            addr
        } else {
            self.env().revert(Error::OwnerNotSet)
        }
    }

    fn stored_minter(&self) -> Address {
        if let Some(addr) = self.minter.get() {
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

    fn assert_minter(&self) {
        let caller = self.env().caller();
        if caller != self.stored_minter() && caller != self.stored_owner() {
            self.env().revert(Error::Unauthorized);
        }
    }

    fn is_owner_or_minter(&self, addr: Address) -> bool {
        addr == self.stored_owner() || addr == self.stored_minter()
    }
}

// ─── Tests ────────────────────────────────────────────────────────────────────

#[cfg(test)]
mod tests {
    use super::*;
    use odra::host::{Deployer, HostEnv};

    fn setup() -> (HostEnv, RwaRegistryHostRef) {
        let env = odra_test::env();
        let minter = env.get_account(1);
        let contract = RwaRegistry::deploy(&env, RwaRegistryInitArgs { minter });
        (env, contract)
    }

    #[test]
    fn test_mint_and_query() {
        let (env, mut registry) = setup();
        let minter = env.get_account(1);
        let asset_owner = env.get_account(2);

        env.set_caller(minter);
        let rwa_id = "550e8400-e29b-41d4-a716-446655440002".to_string();
        let metadata = r#"{"asset_type":"INVOICE","face_value":50000,"currency":"USD"}"#.to_string();

        let token_id = registry.mint_rwa(rwa_id.clone(), asset_owner, metadata.clone());
        assert_eq!(token_id, 1u64);
        assert_eq!(registry.get_total_supply(), 1u64);
        assert!(registry.is_active(1u64));
        assert_eq!(registry.get_metadata(1u64), metadata);
        assert_eq!(registry.get_token_by_rwa(rwa_id), 1u64);
    }

    #[test]
    fn test_duplicate_mint_rejected() {
        let (env, mut registry) = setup();
        let minter = env.get_account(1);
        let asset_owner = env.get_account(2);

        env.set_caller(minter);
        let rwa_id = "rwa-dup-test".to_string();
        registry.mint_rwa(rwa_id.clone(), asset_owner, "{}".to_string());

        let result = registry.try_mint_rwa(rwa_id, asset_owner, "{}".to_string());
        assert!(result.is_err());
    }

    #[test]
    fn test_burn_rwa() {
        let (env, mut registry) = setup();
        let minter = env.get_account(1);
        let asset_owner = env.get_account(2);

        env.set_caller(minter);
        registry.mint_rwa("burn-test-rwa".to_string(), asset_owner, "{}".to_string());
        assert_eq!(registry.get_total_supply(), 1u64);

        registry.burn_rwa(1u64);
        assert!(!registry.is_active(1u64));
        assert_eq!(registry.get_total_supply(), 0u64);
    }

    #[test]
    fn test_agent_reputation() {
        let (env, mut registry) = setup();
        let owner = env.get_account(0);
        let agent = env.get_account(3);

        // 3 correct, 1 wrong → score = 75
        env.set_caller(owner);
        registry.update_reputation(agent, true);
        registry.update_reputation(agent, true);
        registry.update_reputation(agent, true);
        registry.update_reputation(agent, false);

        assert_eq!(registry.get_agent_total_votes(agent), 4u32);
        assert_eq!(registry.get_agent_correct_votes(agent), 3u32);
        assert_eq!(registry.get_agent_reputation(agent), 75u32);
    }
}
