from web3 import Web3
from pathlib import Path
import json

from config import BLOCKCHAIN_RPC_URL, LAND_REGISTRY_ADDRESS


# ============================================
# CONNECT TO HARDHAT BLOCKCHAIN
# ============================================

w3 = Web3(
    Web3.HTTPProvider(BLOCKCHAIN_RPC_URL)
)


# ============================================
# LOAD CONTRACT ABI
# ============================================

ABI_PATH = (
    Path(__file__).parent
    / "../blockchain/artifacts/contracts/LandRegistry.sol/LandRegistry.json"
).resolve()


with open(ABI_PATH, "r") as file:
    contract_data = json.load(file)


CONTRACT_ABI = contract_data["abi"]


# ============================================
# CREATE CONTRACT INSTANCE
# ============================================

land_registry = w3.eth.contract(
    address=Web3.to_checksum_address(
        LAND_REGISTRY_ADDRESS
    ),
    abi=CONTRACT_ABI
)


# ============================================
# CONNECTION TEST
# ============================================

def blockchain_status():

    connected = w3.is_connected()

    return {
        "connected": connected,
        "network": w3.net.version if connected else None,
        "contract": LAND_REGISTRY_ADDRESS
    }