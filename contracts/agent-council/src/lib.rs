#![cfg_attr(not(test), no_std)]
//! AgentCouncil — ARIA Multi-Sig Voting Contract
//!
//! Manages a council of up to 4 AI agents. Any RWA proposal requires
//! `threshold` approvals (default: 3-of-4) before it is considered approved.

use odra::prelude::*;

// ─── Errors ──────────────────────────────────────────────────────────────────

#[odra::odra_error]
pub enum Error {
    Unauthorized = 1,
    AgentAlreadyRegistered = 2,
    AgentNotRegistered = 3,
    AlreadyVoted = 4,
    AlreadyFinalized = 5,
    MaxAgentsReached = 6,
    InvalidThreshold = 7,
    OwnerNotSet = 8,
}

// ─── Events ──────────────────────────────────────────────────────────────────

#[odra::event]
pub struct AgentRegistered {
    pub agent: Address,
    pub index: u8,
}

#[odra::event]
pub struct VoteCast {
    pub rwa_id: String,
    pub agent: Address,
    pub approve: bool,
    pub confidence: u8,
}

#[odra::event]
pub struct ConsensusReached {
    pub rwa_id: String,
    pub approved: bool,
    pub approve_count: u32,
    pub total_votes: u32,
}

#[odra::event]
pub struct WeightUpdated {
    pub agent: Address,
    pub new_weight: u32,
}

// ─── Contract ─────────────────────────────────────────────────────────────────

#[odra::module(
    events = [AgentRegistered, VoteCast, ConsensusReached, WeightUpdated],
    errors = Error
)]
pub struct AgentCouncil {
    owner: Var<Address>,
    threshold: Var<u32>,
    max_agents: Var<u32>,
    agent_count: Var<u8>,
    agents: Mapping<u8, Address>,
    is_agent: Mapping<Address, bool>,
    agent_weight: Mapping<Address, u32>,

    // Per-RWA voting tallies
    approve_count: Mapping<String, u32>,
    reject_count: Mapping<String, u32>,
    vote_count: Mapping<String, u32>,
    is_finalized: Mapping<String, bool>,
    rwa_approved: Mapping<String, bool>,

    // Per-(rwa_id, agent) deduplication
    has_voted: Mapping<(String, Address), bool>,
    agent_vote: Mapping<(String, Address), bool>,
}

#[odra::module]
impl AgentCouncil {
    pub fn init(&mut self, threshold: u32, max_agents: u32) {
        if threshold == 0 || threshold > max_agents {
            self.env().revert(Error::InvalidThreshold);
        }
        let caller = self.env().caller();
        self.owner.set(caller);
        self.threshold.set(threshold);
        self.max_agents.set(max_agents);
        self.agent_count.set(0u8);
    }

    // ─── Owner-only management ─────────────────────────────────────────────

    pub fn register_agent(&mut self, agent: Address) {
        self.assert_owner();
        if self.is_agent.get_or_default(&agent) {
            self.env().revert(Error::AgentAlreadyRegistered);
        }
        let count = self.agent_count.get_or_default();
        if count as u32 >= self.max_agents.get_or_default() {
            self.env().revert(Error::MaxAgentsReached);
        }
        self.agents.set(&count, agent);
        self.is_agent.set(&agent, true);
        self.agent_weight.set(&agent, 100u32);
        self.agent_count.set(count + 1);
        self.env().emit_event(AgentRegistered { agent, index: count });
    }

    pub fn update_weights(&mut self, agent: Address, weight: u32) {
        self.assert_owner();
        if !self.is_agent.get_or_default(&agent) {
            self.env().revert(Error::AgentNotRegistered);
        }
        self.agent_weight.set(&agent, weight);
        self.env().emit_event(WeightUpdated { agent, new_weight: weight });
    }

    // ─── Voting ────────────────────────────────────────────────────────────

    pub fn cast_vote(&mut self, rwa_id: String, approve: bool, confidence: u8) {
        let caller = self.env().caller();
        if !self.is_agent.get_or_default(&caller) {
            self.env().revert(Error::AgentNotRegistered);
        }
        if self.is_finalized.get_or_default(&rwa_id) {
            self.env().revert(Error::AlreadyFinalized);
        }
        let key = (rwa_id.clone(), caller);
        if self.has_voted.get_or_default(&key) {
            self.env().revert(Error::AlreadyVoted);
        }

        self.has_voted.set(&key, true);
        self.agent_vote.set(&key, approve);
        self.vote_count.add(&rwa_id, 1u32);

        if approve {
            self.approve_count.add(&rwa_id, 1u32);
        } else {
            self.reject_count.add(&rwa_id, 1u32);
        }

        self.env().emit_event(VoteCast {
            rwa_id,
            agent: caller,
            approve,
            confidence,
        });
    }

    pub fn finalize_vote(&mut self, rwa_id: String) {
        if self.is_finalized.get_or_default(&rwa_id) {
            self.env().revert(Error::AlreadyFinalized);
        }
        let approve_count = self.approve_count.get_or_default(&rwa_id);
        let vote_count = self.vote_count.get_or_default(&rwa_id);
        let threshold = self.threshold.get_or_default();

        let approved = approve_count >= threshold;
        self.rwa_approved.set(&rwa_id, approved);
        self.is_finalized.set(&rwa_id, true);

        self.env().emit_event(ConsensusReached {
            rwa_id,
            approved,
            approve_count,
            total_votes: vote_count,
        });
    }

    // ─── View queries ──────────────────────────────────────────────────────

    pub fn is_rwa_approved(&self, rwa_id: String) -> bool {
        self.rwa_approved.get_or_default(&rwa_id)
    }

    pub fn is_rwa_finalized(&self, rwa_id: String) -> bool {
        self.is_finalized.get_or_default(&rwa_id)
    }

    pub fn get_approve_count(&self, rwa_id: String) -> u32 {
        self.approve_count.get_or_default(&rwa_id)
    }

    pub fn get_vote_count(&self, rwa_id: String) -> u32 {
        self.vote_count.get_or_default(&rwa_id)
    }

    pub fn get_agent_count(&self) -> u8 {
        self.agent_count.get_or_default()
    }

    pub fn get_threshold(&self) -> u32 {
        self.threshold.get_or_default()
    }

    pub fn get_agent_weight(&self, agent: Address) -> u32 {
        self.agent_weight.get_or_default(&agent)
    }

    pub fn agent_has_voted(&self, rwa_id: String, agent: Address) -> bool {
        self.has_voted.get_or_default(&(rwa_id, agent))
    }

    pub fn get_agent_vote(&self, rwa_id: String, agent: Address) -> bool {
        self.agent_vote.get_or_default(&(rwa_id, agent))
    }

    pub fn get_owner(&self) -> Option<Address> {
        self.owner.get()
    }

    // ─── Internal helpers ──────────────────────────────────────────────────

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
    use odra::host::{Deployer, HostEnv};

    const THRESHOLD: u32 = 3;
    const MAX_AGENTS: u32 = 4;

    fn setup() -> (HostEnv, AgentCouncilHostRef) {
        let env = odra_test::env();
        let contract = AgentCouncil::deploy(
            &env,
            AgentCouncilInitArgs {
                threshold: THRESHOLD,
                max_agents: MAX_AGENTS,
            },
        );
        (env, contract)
    }

    #[test]
    fn test_deploy_and_config() {
        let (_env, council) = setup();
        assert_eq!(council.get_threshold(), THRESHOLD);
        assert_eq!(council.get_agent_count(), 0u8);
    }

    #[test]
    fn test_register_agents() {
        let (env, mut council) = setup();
        let agent0 = env.get_account(0);
        let agent1 = env.get_account(1);
        let agent2 = env.get_account(2);
        let agent3 = env.get_account(3);

        council.register_agent(agent0);
        council.register_agent(agent1);
        council.register_agent(agent2);
        council.register_agent(agent3);

        assert_eq!(council.get_agent_count(), 4u8);
        assert_eq!(council.get_agent_weight(agent0), 100u32);
    }

    #[test]
    fn test_three_of_four_approval() {
        let (env, mut council) = setup();

        let owner = env.get_account(0);
        let agent0 = env.get_account(1);
        let agent1 = env.get_account(2);
        let agent2 = env.get_account(3);
        let agent3 = env.get_account(4);

        env.set_caller(owner);
        council.register_agent(agent0);
        council.register_agent(agent1);
        council.register_agent(agent2);
        council.register_agent(agent3);

        let rwa_id = "550e8400-e29b-41d4-a716-446655440001".to_string();

        env.set_caller(agent0);
        council.cast_vote(rwa_id.clone(), true, 92u8);

        env.set_caller(agent1);
        council.cast_vote(rwa_id.clone(), true, 87u8);

        env.set_caller(agent2);
        council.cast_vote(rwa_id.clone(), true, 85u8);

        env.set_caller(agent3);
        council.cast_vote(rwa_id.clone(), false, 55u8);

        assert_eq!(council.get_approve_count(rwa_id.clone()), 3u32);
        assert_eq!(council.get_vote_count(rwa_id.clone()), 4u32);
        assert!(!council.is_rwa_finalized(rwa_id.clone()));

        env.set_caller(owner);
        council.finalize_vote(rwa_id.clone());

        assert!(council.is_rwa_finalized(rwa_id.clone()));
        assert!(council.is_rwa_approved(rwa_id));
    }

    #[test]
    fn test_two_of_four_rejection() {
        let (env, mut council) = setup();

        let owner = env.get_account(0);
        let agent0 = env.get_account(1);
        let agent1 = env.get_account(2);
        let agent2 = env.get_account(3);
        let agent3 = env.get_account(4);

        env.set_caller(owner);
        council.register_agent(agent0);
        council.register_agent(agent1);
        council.register_agent(agent2);
        council.register_agent(agent3);

        let rwa_id = "rwa-reject-test".to_string();

        env.set_caller(agent0);
        council.cast_vote(rwa_id.clone(), true, 70u8);

        env.set_caller(agent1);
        council.cast_vote(rwa_id.clone(), false, 80u8);

        env.set_caller(agent2);
        council.cast_vote(rwa_id.clone(), false, 75u8);

        env.set_caller(agent3);
        council.cast_vote(rwa_id.clone(), false, 90u8);

        env.set_caller(owner);
        council.finalize_vote(rwa_id.clone());

        assert!(council.is_rwa_finalized(rwa_id.clone()));
        assert!(!council.is_rwa_approved(rwa_id));
    }

    #[test]
    fn test_double_vote_rejected() {
        let (env, mut council) = setup();
        let owner = env.get_account(0);
        let agent0 = env.get_account(1);

        env.set_caller(owner);
        council.register_agent(agent0);

        let rwa_id = "rwa-double-vote".to_string();

        env.set_caller(agent0);
        council.cast_vote(rwa_id.clone(), true, 80u8);

        let result = council.try_cast_vote(rwa_id, false, 50u8);
        assert!(result.is_err());
    }

    #[test]
    fn test_update_agent_weight() {
        let (env, mut council) = setup();
        let owner = env.get_account(0);
        let agent0 = env.get_account(1);

        env.set_caller(owner);
        council.register_agent(agent0);
        assert_eq!(council.get_agent_weight(agent0), 100u32);

        council.update_weights(agent0, 120u32);
        assert_eq!(council.get_agent_weight(agent0), 120u32);
    }
}
