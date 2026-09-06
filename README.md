# LandChain — Blockchain Land Registry & Fraud Detection

LandChain is a blockchain-based land registry platform designed to provide transparent property records, blockchain-backed ownership tracking, document integrity verification, and fraud detection.

## 🌐 Live Website

**[Open LandChain](https://land-chain-sepia.vercel.app/)**

## 📌 Project Overview

Traditional land records can face problems such as document tampering, fragmented records, and difficulty verifying ownership history. LandChain uses blockchain technology to create a tamper-resistant digital record of registered properties and their ownership changes.

The platform combines a React frontend, FastAPI backend, Ethereum smart contracts, and MetaMask to provide an end-to-end land registration and verification workflow.

## ✨ Key Features

- 🔐 **Blockchain-based Land Registration** — Register property records on Ethereum.
- 👤 **Ownership Management** — Track and transfer property ownership.
- 📜 **Ownership History** — View previous ownership records stored on-chain.
- 🔎 **Property Verification** — Verify whether a property exists and its recorded owner.
- 🧾 **Document Hashing** — Generate SHA-256 fingerprints for property documents.
- 🛡️ **Fraud Detection** — Compare submitted document hashes with blockchain records to detect tampering.
- 🦊 **MetaMask Integration** — Use wallet-based blockchain transactions.
- 🌍 **Sepolia Deployment** — Smart contract deployed on the Ethereum Sepolia test network.
- ☁️ **Cloud Deployment** — React frontend deployed on Vercel and FastAPI backend deployed on Render.

## 🏗️ Architecture

```text
┌──────────────────────┐
│   React + Vite       │
│   Frontend           │
│      Vercel          │
└──────────┬───────────┘
           │ HTTPS
           ▼
┌──────────────────────┐
│   FastAPI Backend    │
│      Render          │
└──────────┬───────────┘
           │ Web3 RPC
           ▼
┌──────────────────────┐
│ Ethereum Sepolia     │
│ LandRegistry.sol     │
└──────────────────────┘
           ▲
           │
      MetaMask Wallet
```

## 🛠️ Technology Stack

### Frontend
- React
- Vite
- JavaScript
- CSS
- Ethers.js

### Backend
- Python
- FastAPI
- Uvicorn
- Web3.py
- Pydantic
- SHA-256

### Blockchain
- Solidity
- Hardhat
- Ethereum
- Sepolia Testnet
- MetaMask

### Deployment
- Vercel — Frontend
- Render — Backend
- GitHub — Source Code & CI/CD

## ⛓️ Smart Contract

**Network:** Ethereum Sepolia

**Contract Address:**
`0x0d4AbB070F0064cdf41dd3C1E3B503457786f116`

The smart contract supports property registration, ownership transfer, ownership-history retrieval, and document-hash verification.

## 🔍 Fraud Detection Workflow

1. User uploads a property document.
2. LandChain generates a SHA-256 hash.
3. The hash is associated with the registered property.
4. A document can later be submitted for verification.
5. The new SHA-256 hash is compared with the blockchain-recorded hash.
6. A matching hash indicates that the document content matches the registered fingerprint; a different hash indicates possible tampering or a different document.

> **Note:** LandChain is a prototype/academic project. A blockchain record does not by itself establish legal title or replace government land-record authorities.

## 🚀 Running Locally

### Frontend

```bash
cd frontend
npm install
npm run dev
```

### Backend

```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload
```

### Blockchain

```bash
cd blockchain
npm install
npx hardhat node
```

For local development, deploy the contract using the project's Hardhat deployment script and configure the frontend/backend for the local network.

## 📂 Project Structure

```text
LandChain/
├── frontend/       # React + Vite application
├── backend/        # FastAPI + Web3.py API
├── blockchain/     # Solidity smart contract + Hardhat configuration
├── documents/      # Local document storage used during development
└── .gitignore
```

## 🎯 Future Enhancements

- Two-party ownership transfer with buyer acceptance
- Mandatory document verification before transfer
- Multi-factor authorization for property transfers
- Government/authorized-verifier integration
- IPFS or decentralized document storage
- Role-based access control for owners, verifiers, and administrators

## 👨‍💻 Project

**LandChain — Blockchain Land Registry & Fraud Detection**

Built as an academic blockchain project demonstrating decentralized property records, ownership tracking, document integrity verification, and fraud detection.
