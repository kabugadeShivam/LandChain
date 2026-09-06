from web3 import Web3
from pathlib import Path
import json

from config import BLOCKCHAIN_RPC_URL, LAND_REGISTRY_ADDRESS


# ============================================
# CONNECT TO SEPOLIA BLOCKCHAIN
# ============================================

w3 = Web3(
    Web3.HTTPProvider(BLOCKCHAIN_RPC_URL)
)


# ============================================
# LOAD CONTRACT ABI
# ============================================

# Render deploys the backend from the /backend directory.
# Keep the ABI inside backend so the API does not depend
# on Hardhat build artifacts being present on the server.
ABI_PATH = Path(__file__).parent / "contract_abi.json"


with open(ABI_PATH, "r", encoding="utf-8") as file:
    CONTRACT_ABI = json.load(file)


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
