from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from hashlib import sha256
from pathlib import Path
from datetime import datetime
from pydantic import BaseModel
from web3 import Web3
import os

from blockchain import (
    blockchain_status,
    w3,
    land_registry
)


# ============================================
# SEPOLIA DEPLOYMENT WALLET
# ============================================
# The private key is NOT stored in this source file.
#
# It must be provided through the environment variable:
#
# SEPOLIA_PRIVATE_KEY
#
# Example in PowerShell:
#
# $env:SEPOLIA_PRIVATE_KEY="YOUR_PRIVATE_KEY"
#
# NEVER commit the private key to GitHub.
# NEVER send the private key to anyone.
# ============================================

SEPOLIA_PRIVATE_KEY = os.getenv("SEPOLIA_PRIVATE_KEY")


def get_backend_account():
    """
    Load the backend signing wallet from the
    SEPOLIA_PRIVATE_KEY environment variable.
    """

    if not SEPOLIA_PRIVATE_KEY:
        raise RuntimeError(
            "SEPOLIA_PRIVATE_KEY is not configured. "
            "Set the private key in the environment before "
            "starting the backend."
        )

    try:
        account = w3.eth.account.from_key(
            SEPOLIA_PRIVATE_KEY
        )

        return Web3.to_checksum_address(
            account.address
        )

    except Exception as e:
        raise RuntimeError(
            f"Invalid SEPOLIA_PRIVATE_KEY: {str(e)}"
        )


def get_backend_signer():
    """
    Return the Web3 account object used to sign
    Sepolia blockchain transactions.
    """

    if not SEPOLIA_PRIVATE_KEY:
        raise RuntimeError(
            "SEPOLIA_PRIVATE_KEY is not configured."
        )

    try:
        return w3.eth.account.from_key(
            SEPOLIA_PRIVATE_KEY
        )

    except Exception as e:
        raise RuntimeError(
            f"Unable to load signing account: {str(e)}"
        )


def send_signed_transaction(transaction):
    """
    Sign and send a blockchain transaction using
    the backend deployment wallet.
    """

    signer = get_backend_signer()

    signed_transaction = signer.sign_transaction(
        transaction
    )

    tx_hash = w3.eth.send_raw_transaction(
        signed_transaction.raw_transaction
    )

    return tx_hash


# ============================================
# FASTAPI APPLICATION
# ============================================

app = FastAPI(
    title="LandChain API",
    description="Blockchain-based Land Registry and Fraud Detection API",
    version="1.0.0"
)


# ============================================
# CORS CONFIGURATION
# ============================================

app.add_middleware(
    CORSMiddleware,
    allow_origin_regex=r"^https?://(localhost|127\.0\.0\.1)(:\d+)?$",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ============================================
# DOCUMENT STORAGE
# ============================================

DOCUMENT_FOLDER = (
    Path(__file__).parent / "../documents"
).resolve()

DOCUMENT_FOLDER.mkdir(
    parents=True,
    exist_ok=True
)


# ============================================
# LAND REGISTRATION MODEL
# ============================================

class LandRegistration(BaseModel):
    land_id: int
    location: str
    document_hash: str


# ============================================
# OWNERSHIP TRANSFER MODEL
# ============================================

class OwnershipTransfer(BaseModel):
    land_id: int
    new_owner: str


# ============================================
# ROOT
# ============================================

@app.get("/")
def root():
    return {
        "message": "LandChain API is running",
        "status": "success"
    }


# ============================================
# HEALTH CHECK
# ============================================

@app.get("/health")
def health():
    return {
        "status": "healthy"
    }


# ============================================
# DOCUMENT HASH
# ============================================

@app.post("/documents/hash")
async def generate_document_hash(
    file: UploadFile = File(...)
):

    if not file.filename:
        raise HTTPException(
            status_code=400,
            detail="No file selected"
        )

    contents = await file.read()

    document_hash = sha256(
        contents
    ).hexdigest()

    file_path = (
        DOCUMENT_FOLDER / file.filename
    )

    with open(file_path, "wb") as buffer:
        buffer.write(contents)

    return {
        "filename": file.filename,
        "document_hash": document_hash,
        "algorithm": "SHA-256",
        "size_bytes": len(contents),
        "uploaded_at": datetime.now().isoformat(),
        "message": "Document hashed successfully"
    }


# ============================================
# BLOCKCHAIN STATUS
# ============================================

@app.get("/blockchain/status")
def get_blockchain_status():

    return blockchain_status()


# ============================================
# REGISTER LAND ON BLOCKCHAIN
# ============================================

@app.post("/lands/register")
def register_land(data: LandRegistration):

    try:

        # ====================================
        # GET BACKEND WALLET
        # ====================================

        owner_account = get_backend_account()

        # ====================================
        # GET NONCE
        # ====================================

        nonce = w3.eth.get_transaction_count(
            owner_account,
            "pending"
        )

        # ====================================
        # BUILD TRANSACTION
        # ====================================

        transaction = land_registry.functions.registerLand(
            data.land_id,
            data.location,
            data.document_hash
        ).build_transaction({
            "from": owner_account,
            "nonce": nonce,
            "chainId": w3.eth.chain_id,
            "gas": 500000,
            "gasPrice": w3.eth.gas_price
        })

        # ====================================
        # SIGN AND SEND
        # ====================================

        tx_hash = send_signed_transaction(
            transaction
        )

        # ====================================
        # WAIT FOR CONFIRMATION
        # ====================================

        receipt = w3.eth.wait_for_transaction_receipt(
            tx_hash
        )

        # ====================================
        # CHECK TRANSACTION STATUS
        # ====================================

        if receipt.status != 1:

            return {
                "status": "error",
                "message": "Blockchain transaction reverted",
                "transaction_hash": tx_hash.hex()
            }

        return {
            "status": "success",
            "message": "Land registered successfully",
            "land_id": data.land_id,
            "location": data.location,
            "document_hash": data.document_hash,
            "owner": owner_account,
            "transaction_hash": tx_hash.hex(),
            "block_number": receipt.blockNumber
        }

    except Exception as e:

        return {
            "status": "error",
            "message": str(e)
        }


# ============================================
# GET LAND FROM BLOCKCHAIN
# ============================================

@app.get("/lands/{land_id}")
def get_land(land_id: int):

    try:

        land = land_registry.functions.getLand(
            land_id
        ).call()

        return {
            "status": "success",
            "land_id": land[0],
            "location": land[1],
            "document_hash": land[2],
            "owner": land[3],
            "registered_at": land[4],
            "exists": land[5]
        }

    except Exception as e:

        return {
            "status": "error",
            "message": str(e)
        }


# ============================================
# TRANSFER LAND OWNERSHIP
# ============================================

@app.post("/lands/transfer")
def transfer_land(data: OwnershipTransfer):

    try:

        # ====================================
        # GET BACKEND WALLET
        # ====================================

        current_owner = get_backend_account()

        # ====================================
        # VALIDATE NEW OWNER ADDRESS
        # ====================================

        if not Web3.is_address(data.new_owner):

            raise HTTPException(
                status_code=400,
                detail="Invalid Ethereum address"
            )

        new_owner = Web3.to_checksum_address(
            data.new_owner
        )

        # ====================================
        # PREVENT SAME OWNER TRANSFER
        # ====================================

        if new_owner.lower() == current_owner.lower():

            raise HTTPException(
                status_code=400,
                detail="New owner must be different from current owner"
            )

        # ====================================
        # CHECK LAND
        # ====================================

        land = land_registry.functions.getLand(
            data.land_id
        ).call()

        if not land[5]:

            raise HTTPException(
                status_code=404,
                detail="Land record does not exist"
            )

        # ====================================
        # IMPORTANT OWNERSHIP CHECK
        # ====================================
        # The backend wallet can only perform the
        # transfer if it is actually the current
        # blockchain owner.
        #
        # This prevents the backend from attempting
        # an invalid ownership transfer.

        blockchain_owner = Web3.to_checksum_address(
            land[3]
        )

        if blockchain_owner.lower() != current_owner.lower():

            raise HTTPException(
                status_code=403,
                detail=(
                    "Unauthorized transfer. "
                    "Backend wallet is not the current "
                    "blockchain owner of this property."
                )
            )

        # ====================================
        # GET NONCE
        # ====================================

        nonce = w3.eth.get_transaction_count(
            current_owner,
            "pending"
        )

        # ====================================
        # BUILD TRANSACTION
        # ====================================

        transaction = land_registry.functions.transferOwnership(
            data.land_id,
            new_owner
        ).build_transaction({
            "from": current_owner,
            "nonce": nonce,
            "chainId": w3.eth.chain_id,
            "gas": 500000,
            "gasPrice": w3.eth.gas_price
        })

        # ====================================
        # SIGN AND SEND
        # ====================================

        tx_hash = send_signed_transaction(
            transaction
        )

        # ====================================
        # WAIT FOR CONFIRMATION
        # ====================================

        receipt = w3.eth.wait_for_transaction_receipt(
            tx_hash
        )

        # ====================================
        # CHECK TRANSACTION STATUS
        # ====================================

        if receipt.status != 1:

            return {
                "status": "error",
                "message": "Ownership transfer transaction reverted",
                "transaction_hash": tx_hash.hex()
            }

        return {
            "status": "success",
            "message": "Land ownership transferred successfully",
            "land_id": data.land_id,
            "previous_owner": current_owner,
            "new_owner": new_owner,
            "transaction_hash": tx_hash.hex(),
            "block_number": receipt.blockNumber
        }

    except HTTPException:
        raise

    except Exception as e:

        return {
            "status": "error",
            "message": str(e)
        }


# ============================================
# GET OWNERSHIP HISTORY
# ============================================

@app.get("/lands/{land_id}/history")
def get_ownership_history(land_id: int):

    try:

        history = land_registry.functions.getOwnershipHistory(
            land_id
        ).call()

        records = []

        for record in history:

            records.append({
                "owner": record[0],
                "timestamp": record[1]
            })

        return {
            "status": "success",
            "land_id": land_id,
            "ownership_history": records,
            "total_transfers": max(len(records) - 1, 0)
        }

    except Exception as e:

        return {
            "status": "error",
            "message": str(e)
        }


# ============================================
# VERIFY DOCUMENT AUTHENTICITY
# ============================================

@app.post("/lands/{land_id}/verify-document")
async def verify_document(
    land_id: int,
    file: UploadFile = File(...)
):

    try:

        # ====================================
        # CHECK FILE
        # ====================================

        if not file.filename:

            raise HTTPException(
                status_code=400,
                detail="No file selected"
            )

        # ====================================
        # READ DOCUMENT
        # ====================================

        contents = await file.read()

        # ====================================
        # GENERATE SHA-256 HASH
        # ====================================

        document_hash = sha256(
            contents
        ).hexdigest()

        # ====================================
        # VERIFY HASH AGAINST BLOCKCHAIN
        # ====================================

        is_genuine = land_registry.functions.verifyDocumentHash(
            land_id,
            document_hash
        ).call()

        return {
            "status": "success",
            "land_id": land_id,
            "filename": file.filename,
            "calculated_hash": document_hash,
            "genuine": is_genuine,
            "verdict": (
                "GENUINE DOCUMENT"
                if is_genuine
                else "TAMPERED OR INVALID DOCUMENT"
            )
        }

    except HTTPException:
        raise

    except Exception as e:

        return {
            "status": "error",
            "message": str(e)
        }


# ============================================
# PROPERTY VERIFICATION
# ============================================

@app.get("/lands/{land_id}/verify")
def verify_property(land_id: int):

    try:

        # ====================================
        # GET LAND
        # ====================================

        land = land_registry.functions.getLand(
            land_id
        ).call()

        # ====================================
        # GET OWNERSHIP HISTORY
        # ====================================

        history = land_registry.functions.getOwnershipHistory(
            land_id
        ).call()

        return {
            "status": "success",
            "verified": True,

            "property": {
                "land_id": land[0],
                "location": land[1],
                "current_owner": land[3],
                "document_hash": land[2],
                "registered_at": land[4],
                "exists": land[5]
            },

            "ownership": {
                "total_records": len(history),
                "total_transfers": max(len(history) - 1, 0),
                "current_owner": (
                    history[-1][0]
                    if history
                    else land[3]
                )
            },

            "verification": {
                "blockchain_record_exists": land[5],
                "ownership_history_exists": len(history) > 0,
                "document_hash_exists": bool(land[2]),
                "message": "Property record verified from blockchain"
            }
        }

    except Exception as e:

        return {
            "status": "error",
            "verified": False,
            "message": str(e)
        }