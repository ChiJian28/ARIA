.PHONY: build test clean check fmt sizes

CASPER_NODE_ADDRESS ?= https://node.testnet.casper.network
CHAIN_NAME         ?= casper-test
PAYMENT_AMOUNT     ?= 200000000000

TARGET_DIR := target/wasm32-unknown-unknown/release
WASM_DIR   := wasm

WASMOPT       ?= wasm-opt
WASMOPT_FLAGS := --enable-bulk-memory --llvm-memory-copy-fill-lowering --signext-lowering -O3

# Each crate needs its own ODRA_MODULE=StructName so Odra emits the `call` export
CONTRACTS := \
	AgentCouncil:agent-council:agent_council.wasm \
	RwaRegistry:rwa-registry:rwa_registry.wasm \
	LiquidityVault:liquidity-vault:liquidity_vault.wasm \
	SettlementEngine:settlement-engine:settlement_engine.wasm

define build_one
	@echo "Building $(1) (ODRA_MODULE=$(1))..."
	@ODRA_MODULE=$(1) cargo build --release --target wasm32-unknown-unknown -p $(2)
	@mkdir -p $(WASM_DIR)
	@$(WASMOPT) $(WASMOPT_FLAGS) $(TARGET_DIR)/$(3) -o $(WASM_DIR)/$(1).wasm
	@echo "  -> $(WASM_DIR)/$(1).wasm ($$(wc -c < $(WASM_DIR)/$(1).wasm | tr -d ' ') bytes)"
endef

build:
	@command -v $(WASMOPT) >/dev/null 2>&1 || { echo "ERROR: wasm-opt not found. Run: brew install binaryen"; exit 1; }
	@mkdir -p $(WASM_DIR)
	$(call build_one,AgentCouncil,agent-council,agent_council.wasm)
	$(call build_one,RwaRegistry,rwa-registry,rwa_registry.wasm)
	$(call build_one,LiquidityVault,liquidity-vault,liquidity_vault.wasm)
	$(call build_one,SettlementEngine,settlement-engine,settlement_engine.wasm)
	@echo ""
	@echo "Deployable WASM (with call export):"
	@ls -lh $(WASM_DIR)/*.wasm

test:
	cargo test --workspace

check:
	cargo check --workspace

fmt:
	cargo fmt --all

clean:
	cargo clean
	rm -rf $(WASM_DIR)

sizes: build

# Legacy casper-client deploy targets (prefer: cd ../backend && npm run deploy-contracts)
COUNCIL    := $(WASM_DIR)/AgentCouncil.wasm
REGISTRY   := $(WASM_DIR)/RwaRegistry.wasm
VAULT      := $(WASM_DIR)/LiquidityVault.wasm
SETTLEMENT := $(WASM_DIR)/SettlementEngine.wasm

deploy-council: $(COUNCIL)
	casper-client put-deploy \
		--node-address $(CASPER_NODE_ADDRESS) \
		--chain-name $(CHAIN_NAME) \
		--secret-key $(DEPLOYER_SECRET_KEY) \
		--payment-amount $(PAYMENT_AMOUNT) \
		--session-path $(COUNCIL) \
		--session-arg "odra_cfg_is_upgradable:bool='true'" \
		--session-arg "odra_cfg_is_upgrade:bool='false'" \
		--session-arg "odra_cfg_allow_key_override:bool='true'" \
		--session-arg "odra_cfg_package_hash_key_name:string='agent_council'" \
		--session-arg "threshold:u32='3'" \
		--session-arg "max_agents:u32='4'"

deploy-registry: $(REGISTRY)
	casper-client put-deploy \
		--node-address $(CASPER_NODE_ADDRESS) \
		--chain-name $(CHAIN_NAME) \
		--secret-key $(DEPLOYER_SECRET_KEY) \
		--payment-amount $(PAYMENT_AMOUNT) \
		--session-path $(REGISTRY) \
		--session-arg "odra_cfg_is_upgradable:bool='true'" \
		--session-arg "odra_cfg_is_upgrade:bool='false'" \
		--session-arg "odra_cfg_allow_key_override:bool='true'" \
		--session-arg "odra_cfg_package_hash_key_name:string='rwa_registry'" \
		--session-arg "minter:key='$(DEPLOYER_ACCOUNT_HASH)'"

deploy-vault: $(VAULT)
	casper-client put-deploy \
		--node-address $(CASPER_NODE_ADDRESS) \
		--chain-name $(CHAIN_NAME) \
		--secret-key $(DEPLOYER_SECRET_KEY) \
		--payment-amount $(PAYMENT_AMOUNT) \
		--session-path $(VAULT) \
		--session-arg "odra_cfg_is_upgradable:bool='true'" \
		--session-arg "odra_cfg_is_upgrade:bool='false'" \
		--session-arg "odra_cfg_allow_key_override:bool='true'" \
		--session-arg "odra_cfg_package_hash_key_name:string='liquidity_vault'" \
		--session-arg "name:string='ARIA LP Token'" \
		--session-arg "symbol:string='ARIA-LP'"

deploy-settlement: $(SETTLEMENT)
	casper-client put-deploy \
		--node-address $(CASPER_NODE_ADDRESS) \
		--chain-name $(CHAIN_NAME) \
		--secret-key $(DEPLOYER_SECRET_KEY) \
		--payment-amount $(PAYMENT_AMOUNT) \
		--session-path $(SETTLEMENT) \
		--session-arg "odra_cfg_is_upgradable:bool='true'" \
		--session-arg "odra_cfg_is_upgrade:bool='false'" \
		--session-arg "odra_cfg_allow_key_override:bool='true'" \
		--session-arg "odra_cfg_package_hash_key_name:string='settlement_engine'" \
		--session-arg "protocol_fee_bps:u32='50'" \
		--session-arg "vault_address:key='$(VAULT_ADDRESS)'"

deploy-testnet: deploy-council deploy-registry deploy-vault deploy-settlement
