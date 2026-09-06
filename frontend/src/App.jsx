import { useState } from "react";
import { ethers } from "ethers";
import "./index.css";

const API_URL = "http://127.0.0.1:8000";

const LAND_REGISTRY_ADDRESS =
  "0x5FbDB2315678afecb367f032d93F642f64180aa3";

// Minimal ABI needed by the frontend for MetaMask registration.
const LAND_REGISTRY_ABI = [
  "function registerLand(uint256 _landId, string _location, string _documentHash) public",
];

function App() {
  const [wallet, setWallet] = useState("");
  const [network, setNetwork] = useState("");
  const [activePage, setActivePage] = useState("Dashboard");

  const [landId, setLandId] = useState("");
  const [location, setLocation] = useState("");
  const [document, setDocument] = useState(null);

  const [hash, setHash] = useState("");
  const [hashing, setHashing] = useState(false);
  const [registering, setRegistering] = useState(false);
  const [success, setSuccess] = useState(null);
  const [error, setError] = useState("");

  // Ownership History
  const [historyLandId, setHistoryLandId] = useState("");
  const [ownershipHistory, setOwnershipHistory] = useState(null);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [historyError, setHistoryError] = useState("");

  // Ownership Transfer
  const [transferLandId, setTransferLandId] = useState("");
  const [newOwner, setNewOwner] = useState("");
  const [transferring, setTransferring] = useState(false);
  const [transferResult, setTransferResult] = useState(null);
  const [transferError, setTransferError] = useState("");

  // Verify Property
  const [verifyLandId, setVerifyLandId] = useState("");
  const [verificationData, setVerificationData] = useState(null);
  const [loadingVerification, setLoadingVerification] =
    useState(false);
  const [verificationError, setVerificationError] =
    useState("");

  // Fraud Detection / Document Integrity
  const [fraudLandId, setFraudLandId] = useState("");
  const [fraudDocument, setFraudDocument] = useState(null);
  const [fraudResult, setFraudResult] = useState(null);
  const [loadingFraud, setLoadingFraud] = useState(false);
  const [fraudError, setFraudError] = useState("");

  // Documents
  const [documentsLandId, setDocumentsLandId] = useState("");
  const [documentRecord, setDocumentRecord] = useState(null);
  const [loadingDocuments, setLoadingDocuments] = useState(false);
  const [documentsError, setDocumentsError] = useState("");

  const connectWallet = async () => {
    try {
      if (!window.ethereum) {
        alert("Please install MetaMask.");
        return;
      }

      const provider = new ethers.BrowserProvider(
        window.ethereum
      );

      const accounts = await provider.send(
        "eth_requestAccounts",
        []
      );

      const networkData = await provider.getNetwork();

      setWallet(accounts[0]);

      setNetwork(
        `${networkData.name} • ${networkData.chainId.toString()}`
      );
    } catch (err) {
      console.error(err);
      setError("Unable to connect wallet.");
    }
  };

  const shortAddress = wallet
    ? `${wallet.slice(0, 6)}...${wallet.slice(-4)}`
    : "Not connected";

  const menuItems = [
    { name: "Dashboard", icon: "⌂" },
    { name: "Register Property", icon: "＋" },
    { name: "Verify Property", icon: "✓" },
    { name: "Ownership History", icon: "↗" },
    { name: "Documents", icon: "▤" },
    { name: "Fraud Detection", icon: "◈" },
  ];

  const hashDocument = async () => {
    if (!document) {
      setError("Please select a document first.");
      return;
    }

    setError("");
    setSuccess(null);
    setHashing(true);

    try {
      const formData = new FormData();
      formData.append("file", document);

      const response = await fetch(
        `${API_URL}/documents/hash`,
        {
          method: "POST",
          body: formData,
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.detail || "Document hashing failed."
        );
      }

      setHash(data.document_hash);
    } catch (err) {
      console.error(err);
      setError(err.message);
    } finally {
      setHashing(false);
    }
  };

  const registerProperty = async (event) => {
    event.preventDefault();

    setError("");
    setSuccess(null);

    if (!landId) {
      setError("Please enter a Land ID.");
      return;
    }

    if (!location.trim()) {
      setError("Please enter the property location.");
      return;
    }

    if (!document) {
      setError("Please upload the land document.");
      return;
    }

    setRegistering(true);

    try {
      let documentHash = hash;

      if (!documentHash) {
        const formData = new FormData();
        formData.append("file", document);

        const hashResponse = await fetch(
          `${API_URL}/documents/hash`,
          {
            method: "POST",
            body: formData,
          }
        );

        const hashData = await hashResponse.json();

        if (!hashResponse.ok) {
          throw new Error(
            hashData.detail ||
              "Unable to generate document hash."
          );
        }

        documentHash = hashData.document_hash;
        setHash(documentHash);
      }

      if (!window.ethereum) {
        throw new Error(
          "Please install MetaMask to register a property."
        );
      }

      const provider = new ethers.BrowserProvider(
        window.ethereum
      );

      const networkData = await provider.getNetwork();
      const chainId = networkData.chainId.toString();

      if (chainId !== "31337") {
        throw new Error(
          "Please switch MetaMask to Hardhat Local (Chain ID 31337) before registering the property."
        );
      }

      const accounts = await provider.send(
        "eth_requestAccounts",
        []
      );

      if (!accounts || accounts.length === 0) {
        throw new Error(
          "Please connect a MetaMask wallet first."
        );
      }

      const signer = await provider.getSigner();
      const signerAddress = await signer.getAddress();

      setWallet(signerAddress);

      setNetwork(
        `${networkData.name} • ${chainId}`
      );

      const balance = await provider.getBalance(
        signerAddress
      );

      if (balance === 0n) {
        throw new Error(
          "Your MetaMask wallet has no ETH on Hardhat Local. Import or use a funded Hardhat account to pay the local transaction gas."
        );
      }

      const landRegistry = new ethers.Contract(
        LAND_REGISTRY_ADDRESS,
        LAND_REGISTRY_ABI,
        signer
      );

      // The transaction is signed by the connected MetaMask wallet.
      const transaction = await landRegistry.registerLand(
        Number(landId),
        location.trim(),
        documentHash
      );

      const receipt = await transaction.wait();

      if (!receipt) {
        throw new Error(
          "The blockchain transaction was not confirmed."
        );
      }

      const data = {
        status: "success",
        land_id: Number(landId),
        location: location.trim(),
        document_hash: documentHash,
        owner: signerAddress,
        transaction_hash: transaction.hash,
        block_number: receipt.blockNumber,
      };

      setSuccess(data);

      setLandId("");
      setLocation("");
      setDocument(null);
      setHash("");
    } catch (err) {
      console.error(err);

      if (err?.code === 4001) {
        setError(
          "MetaMask transaction was rejected by the user."
        );
      } else if (err?.code === "ACTION_REJECTED") {
        setError(
          "MetaMask transaction was rejected by the user."
        );
      } else if (err?.reason) {
        setError(err.reason);
      } else if (err?.shortMessage) {
        setError(err.shortMessage);
      } else {
        setError(
          err?.message ||
            "Blockchain registration failed."
        );
      }
    } finally {
      setRegistering(false);
    }
  };

  const fetchOwnershipHistory = async (event) => {
    event.preventDefault();

    setHistoryError("");
    setOwnershipHistory(null);

    if (!historyLandId) {
      setHistoryError("Please enter a Land ID.");
      return;
    }

    setLoadingHistory(true);

    try {
      const response = await fetch(
        `${API_URL}/lands/${historyLandId}/history`
      );

      const data = await response.json();

      if (!response.ok || data.status !== "success") {
        throw new Error(
          data.message ||
            "Unable to retrieve ownership history."
        );
      }

      setOwnershipHistory(data);
    } catch (err) {
      console.error(err);
      setHistoryError(err.message);
    } finally {
      setLoadingHistory(false);
    }
  };

  const transferOwnership = async (event) => {
    event.preventDefault();

    setTransferError("");
    setTransferResult(null);

    if (!transferLandId) {
      setTransferError("Please enter a Land ID.");
      return;
    }

    if (!newOwner.trim()) {
      setTransferError(
        "Please enter the new owner wallet address."
      );
      return;
    }

    setTransferring(true);

    try {
      const response = await fetch(
        `${API_URL}/lands/transfer`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            land_id: Number(transferLandId),
            new_owner: newOwner.trim(),
          }),
        }
      );

      const data = await response.json();

      if (!response.ok || data.status !== "success") {
        throw new Error(
          data.detail ||
            data.message ||
            "Unable to transfer property ownership."
        );
      }

      setTransferResult(data);
      setHistoryLandId(transferLandId);

      // Refresh the ownership timeline after a successful transfer.
      const historyResponse = await fetch(
        `${API_URL}/lands/${transferLandId}/history`
      );

      const historyData =
        await historyResponse.json();

      if (
        historyResponse.ok &&
        historyData.status === "success"
      ) {
        setOwnershipHistory(historyData);
      }
    } catch (err) {
      console.error(err);
      setTransferError(err.message);
    } finally {
      setTransferring(false);
    }
  };

  const verifyProperty = async (event) => {
    event.preventDefault();

    setVerificationError("");
    setVerificationData(null);

    if (!verifyLandId) {
      setVerificationError("Please enter a Land ID.");
      return;
    }

    setLoadingVerification(true);

    try {
      const response = await fetch(
        `${API_URL}/lands/${verifyLandId}/verify`
      );

      const data = await response.json();

      if (!response.ok || data.status !== "success") {
        throw new Error(
          data.message ||
            "Unable to verify property."
        );
      }

      setVerificationData(data);
    } catch (err) {
      console.error(err);
      setVerificationError(err.message);
    } finally {
      setLoadingVerification(false);
    }
  };

  const verifyDocumentIntegrity = async (event) => {
    event.preventDefault();

    setFraudError("");
    setFraudResult(null);

    if (!fraudLandId) {
      setFraudError("Please enter a Land ID.");
      return;
    }

    if (!fraudDocument) {
      setFraudError(
        "Please upload the document you want to verify."
      );
      return;
    }

    setLoadingFraud(true);

    try {
      const formData = new FormData();
      formData.append("file", fraudDocument);

      const response = await fetch(
        `${API_URL}/lands/${fraudLandId}/verify-document`,
        {
          method: "POST",
          body: formData,
        }
      );

      const data = await response.json();

      if (!response.ok || data.status !== "success") {
        throw new Error(
          data.message ||
            data.detail ||
            "Unable to verify document integrity."
        );
      }

      setFraudResult(data);
    } catch (err) {
      console.error(err);
      setFraudError(err.message);
    } finally {
      setLoadingFraud(false);
    }
  };

  const fetchDocumentRecord = async (event) => {
    event.preventDefault();

    setDocumentsError("");
    setDocumentRecord(null);

    if (!documentsLandId) {
      setDocumentsError("Please enter a Land ID.");
      return;
    }

    setLoadingDocuments(true);

    try {
      const response = await fetch(
        `${API_URL}/lands/${documentsLandId}`
      );

      const data = await response.json();

      if (!response.ok || data.status !== "success") {
        throw new Error(
          data.message ||
            data.detail ||
            "Unable to retrieve the document record."
        );
      }

      if (!data.exists) {
        throw new Error("This Land ID is not registered on the blockchain.");
      }

      setDocumentRecord(data);
    } catch (err) {
      console.error(err);
      setDocumentsError(err.message);
    } finally {
      setLoadingDocuments(false);
    }
  };

  const formatTimestamp = (timestamp) => {
    if (!timestamp) {
      return "Unknown date";
    }

    const date = new Date(
      Number(timestamp) * 1000
    );

    if (Number.isNaN(date.getTime())) {
      return "Unknown date";
    }

    return date.toLocaleString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getHistoryRecords = () => {
    if (!ownershipHistory) {
      return [];
    }

    return (
      ownershipHistory.history ||
      ownershipHistory.ownership_history ||
      ownershipHistory.records ||
      []
    );
  };

  const getVerificationDetails = () => {
    if (!verificationData) {
      return {
        land: null,
        verification: {},
        ownership: {},
        owner: "",
        propertyLocation: "",
        documentHash: "",
        registeredAt: "",
        historyCount: "",
        transferCount: "",
        verified: true,
      };
    }

    const land =
      verificationData.land ||
      verificationData.property ||
      verificationData;

    const verification =
      verificationData.verification || {};

    // Backend returns ownership information inside
    // verificationData.ownership.
    const ownership =
      verificationData.ownership || {};

    // Backend property response uses current_owner.
    // Keep owner as a fallback for compatibility.
    const owner =
      land?.current_owner ||
      land?.owner ||
      ownership.current_owner ||
      verificationData.current_owner ||
      verificationData.owner ||
      verification.current_owner ||
      verification.owner ||
      "";

    const propertyLocation =
      land?.location ||
      verificationData.location ||
      "";

    const documentHash =
      land?.documentHash ||
      land?.document_hash ||
      verificationData.document_hash ||
      verificationData.documentHash ||
      verification.document_hash ||
      verification.documentHash ||
      "";

    const registeredAt =
      land?.registeredAt ||
      land?.registered_at ||
      verificationData.registered_at ||
      verificationData.registeredAt ||
      "";

    // Backend returns:
    // ownership.total_records
    // ownership.total_transfers
    const historyCount =
      verificationData.history_count ??
      verificationData.ownership_records ??
      verificationData.total_records ??
      verificationData.ownership_history_count ??
      ownership.total_records ??
      verification.history_count ??
      verification.ownership_records ??
      "";

    const transferCount =
      verificationData.transfer_count ??
      verificationData.total_transfers ??
      verificationData.transfers ??
      ownership.total_transfers ??
      verification.transfer_count ??
      verification.total_transfers ??
      (typeof historyCount === "number" &&
      historyCount > 0
        ? historyCount - 1
        : "");

    const verified =
      verificationData.verified ??
      verificationData.blockchain_verified ??
      verification.verified ??
      true;

    return {
      land,
      verification,
      ownership,
      owner,
      propertyLocation,
      documentHash,
      registeredAt,
      historyCount,
      transferCount,
      verified,
    };
  };

  const Dashboard = () => (
    <>
      <section className="hero">
        <div className="hero-content">
          <div className="eyebrow">
            <span>●</span>
            BLOCKCHAIN LAND REGISTRY
          </div>

          <h2>
            Secure land ownership.
            <br />
            <span>Verified on blockchain.</span>
          </h2>

          <p>
            Register, verify and transfer property ownership
            through a transparent and tamper-resistant digital
            land registry.
          </p>

          <div className="hero-buttons">
            <button
              className="primary-button"
              onClick={() =>
                setActivePage("Register Property")
              }
            >
              Register Property
              <span>→</span>
            </button>

            <button
              className="secondary-button"
              onClick={() =>
                setActivePage("Verify Property")
              }
            >
              Verify Property
            </button>
          </div>
        </div>

        <div className="hero-visual">
          <div className="blockchain-orbit orbit-one"></div>
          <div className="blockchain-orbit orbit-two"></div>

          <div className="blockchain-core">
            <div className="core-icon">◆</div>
            <strong>BLOCKCHAIN</strong>
            <span>VERIFIED</span>
          </div>
        </div>
      </section>

      <section className="stats-grid">
        <div className="stat-card">
          <div className="stat-top">
            <span className="stat-label">
              REGISTERED PROPERTIES
            </span>
            <span className="stat-icon">⌂</span>
          </div>

          <div className="stat-value">128</div>

          <div className="stat-footer">
            <span className="positive">+12</span>
            <span>this month</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-top">
            <span className="stat-label">
              VERIFIED PROPERTIES
            </span>

            <span className="stat-icon">✓</span>
          </div>

          <div className="stat-value">121</div>

          <div className="stat-footer">
            <span className="positive">94.5%</span>
            <span>verification rate</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-top">
            <span className="stat-label">
              OWNERSHIP TRANSFERS
            </span>

            <span className="stat-icon">↗</span>
          </div>

          <div className="stat-value">34</div>

          <div className="stat-footer">
            <span>Blockchain recorded</span>
          </div>
        </div>

        <div className="stat-card alert-card">
          <div className="stat-top">
            <span className="stat-label">
              FRAUD ALERTS
            </span>

            <span className="stat-icon">!</span>
          </div>

          <div className="stat-value">03</div>

          <div className="stat-footer">
            <span className="warning">
              Requires review
            </span>
          </div>
        </div>
      </section>

      <section className="dashboard-grid">
        <div className="panel properties-panel">
          <div className="panel-header">
            <div>
              <h3>Recent Properties</h3>
              <p>Latest blockchain land records</p>
            </div>

            <button
              className="view-button"
              onClick={() =>
                setActivePage("Verify Property")
              }
            >
              View all →
            </button>
          </div>

          <div className="property-table">
            <div className="table-header">
              <span>LAND ID</span>
              <span>LOCATION</span>
              <span>OWNER</span>
              <span>STATUS</span>
            </div>

            <div className="table-row">
              <strong>#102</strong>
              <span>Panvel, Maharashtra</span>

              <span className="address">
                0x71...A92F
              </span>

              <span className="verified-badge">
                ✓ Verified
              </span>
            </div>

            <div className="table-row">
              <strong>#101</strong>
              <span>Navi Mumbai, Maharashtra</span>

              <span className="address">
                0x3B...F421
              </span>

              <span className="verified-badge">
                ✓ Verified
              </span>
            </div>

            <div className="table-row">
              <strong>#098</strong>
              <span>Thane, Maharashtra</span>

              <span className="address">
                0x91...18BD
              </span>

              <span className="verified-badge">
                ✓ Verified
              </span>
            </div>
          </div>
        </div>

        <div className="panel">
          <div className="panel-header">
            <div>
              <h3>Quick Actions</h3>
              <p>Common registry operations</p>
            </div>
          </div>

          <div className="quick-actions">
            <button
              onClick={() =>
                setActivePage("Register Property")
              }
            >
              <div className="action-icon blue">＋</div>

              <div>
                <strong>Register Property</strong>
                <span>Add a new land record</span>
              </div>

              <span className="action-arrow">→</span>
            </button>

            <button
              onClick={() =>
                setActivePage("Verify Property")
              }
            >
              <div className="action-icon green">✓</div>

              <div>
                <strong>Verify Property</strong>
                <span>Check ownership authenticity</span>
              </div>

              <span className="action-arrow">→</span>
            </button>

            <button
              onClick={() =>
                setActivePage("Documents")
              }
            >
              <div className="action-icon purple">▤</div>

              <div>
                <strong>Verify Document</strong>
                <span>Check document integrity</span>
              </div>

              <span className="action-arrow">→</span>
            </button>

            <button
              onClick={() =>
                setActivePage("Fraud Detection")
              }
            >
              <div className="action-icon orange">◈</div>

              <div>
                <strong>Fraud Detection</strong>
                <span>Review suspicious activity</span>
              </div>

              <span className="action-arrow">→</span>
            </button>
          </div>
        </div>
      </section>

      <section className="blockchain-panel">
        <div className="blockchain-status-icon">
          ✓
        </div>

        <div className="blockchain-status-text">
          <strong>
            Blockchain Network Connected
          </strong>

          <span>
            Your land records are protected by
            cryptographic verification and immutable
            ownership history.
          </span>
        </div>

        <div className="blockchain-meta">
          <div>
            <span>NETWORK</span>

            <strong>
              {network || "Hardhat Local"}
            </strong>
          </div>

          <div>
            <span>WALLET</span>

            <strong>
              {shortAddress}
            </strong>
          </div>
        </div>
      </section>
    </>
  );

  const RegisterProperty = () => (
    <section className="register-page">
      <div className="page-heading">
        <div>
          <div className="eyebrow">
            LAND REGISTRY
          </div>

          <h2>Register Property</h2>

          <p>
            Create a permanent blockchain-backed record
            for a land property.
          </p>
        </div>

        <div className="registration-step">
          <span>STEP 1</span>
          Property Registration
        </div>
      </div>

      {error && (
        <div className="form-alert error">
          <span>!</span>

          <div>
            <strong>Registration Error</strong>
            <p>{error}</p>
          </div>
        </div>
      )}

      {success && (
        <div className="form-alert success">
          <span>✓</span>

          <div>
            <strong>
              Property Registered Successfully
            </strong>

            <p>
              Land #{success.land_id} has been permanently
              recorded on the blockchain.
            </p>

            <small>
              Transaction: {success.transaction_hash}
            </small>
          </div>
        </div>
      )}

      <form
        className="registration-layout"
        onSubmit={registerProperty}
      >
        <div className="panel registration-form">
          <div className="form-section">
            <div className="form-section-title">
              <div className="form-number">01</div>

              <div>
                <h3>Property Information</h3>

                <p>
                  Enter the basic details of the property.
                </p>
              </div>
            </div>

            <div className="form-grid">
              <div className="form-group">
                <label>
                  Land ID
                  <span>*</span>
                </label>

                <input
                  type="number"
                  placeholder="e.g. 103"
                  value={landId}
                  onChange={(e) =>
                    setLandId(e.target.value)
                  }
                />

                <small>
                  A unique identification number for the land.
                </small>
              </div>

              <div className="form-group">
                <label>
                  Property Location
                  <span>*</span>
                </label>

                <input
                  type="text"
                  placeholder="e.g. Panvel, Maharashtra"
                  value={location}
                  onChange={(e) =>
                    setLocation(e.target.value)
                  }
                />

                <small>
                  Enter the registered property location.
                </small>
              </div>
            </div>
          </div>

          <div className="form-divider"></div>

          <div className="form-section">
            <div className="form-section-title">
              <div className="form-number">02</div>

              <div>
                <h3>Ownership Document</h3>

                <p>
                  Upload the official property document.
                </p>
              </div>
            </div>

            <label className="upload-box">
              <input
                type="file"
                accept=".pdf,.jpg,.jpeg,.png"
                onChange={(e) => {
                  setDocument(e.target.files[0]);
                  setHash("");
                  setSuccess(null);
                  setError("");
                }}
              />

              <div className="upload-icon">
                ↑
              </div>

              <strong>
                {document
                  ? document.name
                  : "Upload property document"}
              </strong>

              <span>
                PDF, JPG or PNG • Maximum 10 MB
              </span>
            </label>

            {document && (
              <div className="document-preview">
                <div className="document-file-icon">
                  PDF
                </div>

                <div className="document-info">
                  <strong>
                    {document.name}
                  </strong>

                  <span>
                    {(document.size / 1024).toFixed(1)} KB
                  </span>
                </div>

                <button
                  type="button"
                  className="hash-button"
                  onClick={hashDocument}
                  disabled={hashing}
                >
                  {hashing
                    ? "Generating..."
                    : "Generate Hash"}
                </button>
              </div>
            )}

            {hash && (
              <div className="hash-result">
                <div className="hash-result-top">
                  <span>
                    ✓ Document fingerprint generated
                  </span>

                  <strong>SHA-256</strong>
                </div>

                <code>{hash}</code>
              </div>
            )}
          </div>

          <div className="form-divider"></div>

          <div className="registration-review">
            <div>
              <span>PROPERTY</span>

              <strong>
                {landId
                  ? `Land #${landId}`
                  : "Not specified"}
              </strong>
            </div>

            <div>
              <span>LOCATION</span>

              <strong>
                {location || "Not specified"}
              </strong>
            </div>

            <div>
              <span>DOCUMENT</span>

              <strong>
                {hash
                  ? "Hash generated ✓"
                  : "Pending"}
              </strong>
            </div>
          </div>

          <button
            type="submit"
            className="register-button"
            disabled={registering}
          >
            {registering
              ? "Registering on Blockchain..."
              : "Register Property on Blockchain"}

            {!registering && <span>→</span>}
          </button>
        </div>

        <aside className="registration-info">
          <div className="panel">
            <div className="info-icon">
              ✓
            </div>

            <h3>
              Blockchain Protection
            </h3>

            <p>
              Once registered, the property record is
              stored on the blockchain and cannot be
              silently altered.
            </p>

            <div className="info-list">
              <div>
                <span>01</span>
                <p>Property details recorded</p>
              </div>

              <div>
                <span>02</span>
                <p>
                  Document converted to SHA-256 hash
                </p>
              </div>

              <div>
                <span>03</span>
                <p>Ownership linked to wallet</p>
              </div>

              <div>
                <span>04</span>
                <p>Transaction permanently recorded</p>
              </div>
            </div>
          </div>
        </aside>
      </form>
    </section>
  );

  const VerifyProperty = () => {
    const {
      owner,
      propertyLocation,
      documentHash,
      registeredAt,
      historyCount,
      transferCount,
      verified,
    } = getVerificationDetails();

    const displayOwner = owner
      ? `${owner.slice(0, 6)}...${owner.slice(-4)}`
      : "Unavailable";

    return (
      <section className="history-page">
        <div className="page-heading">
          <div>
            <div className="eyebrow">
              LAND REGISTRY
            </div>

            <h2>Verify Property</h2>

            <p>
              Verify property ownership and registry details
              directly from the blockchain.
            </p>
          </div>

          <div className="registration-step">
            <span>BLOCKCHAIN VERIFICATION</span>
            Tamper-resistant property record
          </div>
        </div>

        <div className="panel history-search-panel">
          <div className="history-search-heading">
            <div className="form-number">02</div>

            <div>
              <h3>Transfer Property Ownership</h3>

              <p>
                Record a new owner on the blockchain while
                preserving the complete ownership history.
              </p>
            </div>
          </div>

          <form
            className="history-search-form"
            onSubmit={transferOwnership}
          >
            <div className="history-input-group">
              <label>
                Land ID
                <span>*</span>
              </label>

              <input
                type="number"
                min="1"
                placeholder="e.g. 2"
                value={transferLandId}
                onChange={(e) =>
                  setTransferLandId(e.target.value)
                }
              />
            </div>

            <div className="history-input-group">
              <label>
                New Owner Wallet
                <span>*</span>
              </label>

              <input
                type="text"
                placeholder="0x..."
                value={newOwner}
                onChange={(e) =>
                  setNewOwner(e.target.value)
                }
              />
            </div>

            <button
              type="submit"
              className="history-search-button"
              disabled={transferring}
            >
              {transferring
                ? "Transferring..."
                : "Transfer Ownership"}

              {!transferring && <span>→</span>}
            </button>
          </form>

          {transferError && (
            <div className="history-alert error">
              <span>!</span>

              <div>
                <strong>
                  Ownership transfer failed
                </strong>

                <p>{transferError}</p>
              </div>
            </div>
          )}

          {transferResult && (
            <div className="history-alert success">
              <span>✓</span>

              <div>
                <strong>
                  Ownership transferred successfully
                </strong>

                <p>
                  Land #{transferResult.land_id} is now
                  recorded under the new owner.
                </p>

                {transferResult.transaction_hash && (
                  <p>
                    Transaction:{" "}
                    {transferResult.transaction_hash}
                  </p>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="panel history-search-panel">
          <div className="history-search-heading">
            <div className="form-number">01</div>

            <div>
              <h3>Find Property</h3>

              <p>
                Enter a Land ID to retrieve its blockchain
                verification record.
              </p>
            </div>
          </div>

          <form
            className="history-search-form"
            onSubmit={verifyProperty}
          >
            <div className="history-input-group">
              <label>
                Land ID
                <span>*</span>
              </label>

              <input
                type="number"
                placeholder="e.g. 103"
                value={verifyLandId}
                onChange={(e) =>
                  setVerifyLandId(e.target.value)
                }
              />
            </div>

            <button
              type="submit"
              className="history-search-button"
              disabled={loadingVerification}
            >
              {loadingVerification
                ? "Verifying..."
                : "Verify Property"}

              {!loadingVerification && <span>→</span>}
            </button>
          </form>

          {verificationError && (
            <div className="history-alert error">
              <span>!</span>

              <div>
                <strong>
                  Property Verification Failed
                </strong>

                <p>{verificationError}</p>
              </div>
            </div>
          )}
        </div>

        {verificationData && (
          <>
            <div className="history-summary-grid">
              <div className="stat-card">
                <div className="stat-top">
                  <span className="stat-label">
                    LAND ID
                  </span>

                  <span className="stat-icon">
                    ⌂
                  </span>
                </div>

                <div className="stat-value history-value">
                  #{verifyLandId}
                </div>

                <div className="stat-footer">
                  <span>
                    Blockchain property record
                  </span>
                </div>
              </div>

              <div className="stat-card">
                <div className="stat-top">
                  <span className="stat-label">
                    CURRENT OWNER
                  </span>

                  <span className="stat-icon">
                    ✓
                  </span>
                </div>

                <div className="current-owner-value">
                  {displayOwner}
                </div>

                <div className="stat-footer">
                  <span className="positive">
                    Owner verified
                  </span>
                </div>
              </div>

              <div className="stat-card">
                <div className="stat-top">
                  <span className="stat-label">
                    OWNERSHIP RECORDS
                  </span>

                  <span className="stat-icon">
                    ↗
                  </span>
                </div>

                <div className="stat-value">
                  {historyCount !== ""
                    ? historyCount
                    : "—"}
                </div>

                <div className="stat-footer">
                  <span>
                    Blockchain records
                  </span>
                </div>
              </div>

              <div className="stat-card current-owner-card">
                <div className="stat-top">
                  <span className="stat-label">
                    VERIFICATION STATUS
                  </span>

                  <span className="stat-icon">
                    ✓
                  </span>
                </div>

                <div className="current-owner-value">
                  {verified
                    ? "VERIFIED"
                    : "REVIEW"}
                </div>

                <div className="stat-footer">
                  <span
                    className={
                      verified
                        ? "positive"
                        : "warning"
                    }
                  >
                    {verified
                      ? "Blockchain record valid"
                      : "Requires review"}
                  </span>
                </div>
              </div>
            </div>

            <div className="panel history-panel">
              <div className="panel-header">
                <div>
                  <h3>
                    Property Verification Record
                  </h3>

                  <p>
                    Information retrieved from the LandChain
                    blockchain.
                  </p>
                </div>

                <div className="history-blockchain-badge">
                  ✓ Blockchain Verified
                </div>
              </div>

              <div className="registration-review">
                <div>
                  <span>LAND ID</span>

                  <strong>
                    #{verifyLandId}
                  </strong>
                </div>

                <div>
                  <span>LOCATION</span>

                  <strong>
                    {propertyLocation ||
                      "Unavailable"}
                  </strong>
                </div>

                <div>
                  <span>REGISTERED AT</span>

                  <strong>
                    {formatTimestamp(
                      registeredAt
                    )}
                  </strong>
                </div>

                <div>
                  <span>TRANSFERS</span>

                  <strong>
                    {transferCount !== ""
                      ? transferCount
                      : "—"}
                  </strong>
                </div>
              </div>
            </div>

            <div className="panel history-panel">
              <div className="panel-header">
                <div>
                  <h3>Current Ownership</h3>

                  <p>
                    The wallet address currently recorded as
                    the property owner.
                  </p>
                </div>

                <div className="history-blockchain-badge">
                  ✓ Verified
                </div>
              </div>

              <div className="timeline-details">
                <div className="owner-address">
                  <span>OWNER WALLET</span>

                  <strong>
                    {owner || "Unavailable"}
                  </strong>
                </div>

                <div className="owner-date">
                  <span>DISPLAY ADDRESS</span>

                  <strong>
                    {displayOwner}
                  </strong>
                </div>
              </div>
            </div>

            <div className="panel history-panel">
              <div className="panel-header">
                <div>
                  <h3>
                    Document Fingerprint
                  </h3>

                  <p>
                    SHA-256 fingerprint recorded with the
                    property on registration.
                  </p>
                </div>

                <div className="history-blockchain-badge">
                  ✓ On-chain Record
                </div>
              </div>

              {documentHash ? (
                <div className="hash-result">
                  <div className="hash-result-top">
                    <span>
                      ✓ Document hash found
                    </span>

                    <strong>
                      SHA-256
                    </strong>
                  </div>

                  <code>
                    {documentHash}
                  </code>
                </div>
              ) : (
                <div className="history-empty">
                  <div className="history-empty-icon">
                    ▤
                  </div>

                  <h3>
                    No Document Hash Available
                  </h3>

                  <p>
                    This property record does not currently
                    expose a document fingerprint.
                  </p>
                </div>
              )}
            </div>

            <div className="panel history-intro">
              <div className="history-intro-icon">
                ✓
              </div>

              <div>
                <h3>
                  Blockchain Verification Complete
                </h3>

                <p>
                  The property record above was retrieved
                  through the LandChain verification endpoint.
                  The blockchain record confirms the registered
                  property information and current ownership.
                  Uploaded-document comparison will be added
                  in the Documents module.
                </p>
              </div>
            </div>
          </>
        )}

        {!verificationData &&
          !verificationError &&
          !loadingVerification && (
            <div className="panel history-intro">
              <div className="history-intro-icon">
                ✓
              </div>

              <div>
                <h3>
                  Verify a Blockchain Property
                </h3>

                <p>
                  Enter a registered Land ID above to retrieve
                  its owner, location, registration timestamp,
                  ownership records and document fingerprint
                  directly from the LandChain backend.
                </p>
              </div>
            </div>
          )}
      </section>
    );
  };

  const OwnershipHistory = () => {
    const records = getHistoryRecords();

    const currentOwner =
      ownershipHistory?.current_owner ||
      (records.length > 0
        ? records[records.length - 1]?.owner
        : null);

    const totalRecords = records.length;

    const totalTransfers =
      ownershipHistory?.total_transfers ??
      Math.max(totalRecords - 1, 0);

    return (
      <section className="history-page">
        <div className="page-heading">
          <div>
            <div className="eyebrow">
              LAND REGISTRY
            </div>

            <h2>Ownership History</h2>

            <p>
              Trace every recorded ownership change on
              the blockchain.
            </p>
          </div>

          <div className="registration-step">
            <span>BLOCKCHAIN RECORD</span>
            Immutable ownership timeline
          </div>
        </div>

        <div className="panel history-search-panel">
          <div className="history-search-heading">
            <div className="form-number">01</div>

            <div>
              <h3>
                Find Property History
              </h3>

              <p>
                Enter a Land ID to retrieve its complete
                ownership record.
              </p>
            </div>
          </div>

          <form
            className="history-search-form"
            onSubmit={fetchOwnershipHistory}
          >
            <div className="history-input-group">
              <label>
                Land ID
                <span>*</span>
              </label>

              <input
                type="number"
                placeholder="e.g. 103"
                value={historyLandId}
                onChange={(e) =>
                  setHistoryLandId(e.target.value)
                }
              />
            </div>

            <button
              type="submit"
              className="history-search-button"
              disabled={loadingHistory}
            >
              {loadingHistory
                ? "Loading..."
                : "View Ownership History"}

              {!loadingHistory && <span>→</span>}
            </button>
          </form>

          {historyError && (
            <div className="history-alert error">
              <span>!</span>

              <div>
                <strong>
                  Unable to retrieve history
                </strong>

                <p>{historyError}</p>
              </div>
            </div>
          )}
        </div>

        {ownershipHistory && (
          <>
            <div className="history-summary-grid">
              <div className="stat-card">
                <div className="stat-top">
                  <span className="stat-label">
                    LAND ID
                  </span>

                  <span className="stat-icon">
                    ⌂
                  </span>
                </div>

                <div className="stat-value history-value">
                  #{historyLandId}
                </div>

                <div className="stat-footer">
                  <span>
                    Blockchain property record
                  </span>
                </div>
              </div>

              <div className="stat-card">
                <div className="stat-top">
                  <span className="stat-label">
                    OWNERSHIP RECORDS
                  </span>

                  <span className="stat-icon">
                    ↗
                  </span>
                </div>

                <div className="stat-value">
                  {totalRecords}
                </div>

                <div className="stat-footer">
                  <span>
                    Recorded on blockchain
                  </span>
                </div>
              </div>

              <div className="stat-card">
                <div className="stat-top">
                  <span className="stat-label">
                    TRANSFERS
                  </span>

                  <span className="stat-icon">
                    ⇢
                  </span>
                </div>

                <div className="stat-value">
                  {totalTransfers}
                </div>

                <div className="stat-footer">
                  <span>
                    Ownership changes
                  </span>
                </div>
              </div>

              <div className="stat-card current-owner-card">
                <div className="stat-top">
                  <span className="stat-label">
                    CURRENT OWNER
                  </span>

                  <span className="stat-icon">
                    ✓
                  </span>
                </div>

                <div className="current-owner-value">
                  {currentOwner
                    ? `${currentOwner.slice(
                        0,
                        6
                      )}...${currentOwner.slice(-4)}`
                    : "Unavailable"}
                </div>

                <div className="stat-footer">
                  <span className="positive">
                    Verified record
                  </span>
                </div>
              </div>
            </div>

            <div className="panel history-panel">
              <div className="panel-header">
                <div>
                  <h3>Ownership Timeline</h3>

                  <p>
                    Chronological history of property
                    ownership
                  </p>
                </div>

                <div className="history-blockchain-badge">
                  ✓ Blockchain Verified
                </div>
              </div>

              {records.length === 0 ? (
                <div className="history-empty">
                  <div className="history-empty-icon">
                    ↗
                  </div>

                  <h3>
                    No Ownership Records
                  </h3>

                  <p>
                    No ownership history was returned for
                    this property.
                  </p>
                </div>
              ) : (
                <div className="ownership-timeline">
                  {records.map((record, index) => {
                    const isCurrent =
                      index === records.length - 1;

                    const owner =
                      record.owner ||
                      record[0] ||
                      "Unknown";

                    const timestamp =
                      record.timestamp ||
                      record[1];

                    return (
                      <div
                        className={`timeline-item ${
                          isCurrent
                            ? "current"
                            : ""
                        }`}
                        key={`${owner}-${index}`}
                      >
                        <div className="timeline-marker">
                          <div className="timeline-number">
                            {index + 1}
                          </div>
                        </div>

                        <div className="timeline-content">
                          <div className="timeline-top">
                            <div>
                              <span className="timeline-label">
                                {index === 0
                                  ? "INITIAL OWNER"
                                  : isCurrent
                                  ? "CURRENT OWNER"
                                  : "OWNERSHIP TRANSFER"}
                              </span>

                              <h4>
                                {isCurrent
                                  ? "Current Owner"
                                  : index === 0
                                  ? "Property Registered"
                                  : "Ownership Transferred"}
                              </h4>
                            </div>

                            {isCurrent && (
                              <span className="current-badge">
                                ✓ CURRENT OWNER
                              </span>
                            )}
                          </div>

                          <div className="timeline-details">
                            <div className="owner-address">
                              <span>
                                OWNER WALLET
                              </span>

                              <strong>
                                {owner}
                              </strong>
                            </div>

                            <div className="owner-date">
                              <span>
                                RECORDED AT
                              </span>

                              <strong>
                                {formatTimestamp(
                                  timestamp
                                )}
                              </strong>
                            </div>
                          </div>

                          {index <
                            records.length - 1 && (
                            <div className="transfer-indicator">
                              <span>↓</span>
                              Ownership transferred
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </>
        )}

        {!ownershipHistory &&
          !historyError &&
          !loadingHistory && (
            <div className="panel history-intro">
              <div className="history-intro-icon">
                ↗
              </div>

              <div>
                <h3>
                  Explore Blockchain Ownership
                </h3>

                <p>
                  Search for a registered Land ID above
                  to see its complete ownership chain,
                  including the original owner, every
                  transfer and the current owner.
                </p>
              </div>
            </div>
          )}
      </section>
    );
  };

  const FraudDetection = () => {
    const genuine =
      fraudResult?.genuine === true;

    return (
      <section className="history-page">
        <div className="page-heading">
          <div>
            <div className="eyebrow">
              LANDCHAIN SECURITY
            </div>

            <h2>Fraud Detection</h2>

            <p>
              Compare a property document against its
              SHA-256 fingerprint recorded on the blockchain.
            </p>
          </div>

          <div className="registration-step">
            <span>DOCUMENT INTEGRITY</span>
            Blockchain-backed verification
          </div>
        </div>

        <div className="panel history-search-panel">
          <div className="history-search-heading">
            <div className="form-number">01</div>

            <div>
              <h3>
                Verify Document Authenticity
              </h3>

              <p>
                Upload a document for a registered Land ID.
                LandChain calculates its SHA-256 hash and
                compares it with the fingerprint stored
                on-chain.
              </p>
            </div>
          </div>

          <form
            className="history-search-form"
            onSubmit={verifyDocumentIntegrity}
          >
            <div className="history-input-group">
              <label>
                Land ID
                <span>*</span>
              </label>

              <input
                type="number"
                placeholder="e.g. 1"
                value={fraudLandId}
                onChange={(e) => {
                  setFraudLandId(e.target.value);
                  setFraudResult(null);
                  setFraudError("");
                }}
              />
            </div>

            <label className="upload-box">
              <input
                type="file"
                accept=".pdf,.jpg,.jpeg,.png"
                onChange={(e) => {
                  setFraudDocument(
                    e.target.files[0]
                  );

                  setFraudResult(null);
                  setFraudError("");
                }}
              />

              <div className="upload-icon">
                ↑
              </div>

              <strong>
                {fraudDocument
                  ? fraudDocument.name
                  : "Upload document to verify"}
              </strong>

              <span>
                PDF, JPG or PNG • Maximum 10 MB
              </span>
            </label>

            <button
              type="submit"
              className="history-search-button"
              disabled={loadingFraud}
            >
              {loadingFraud
                ? "Checking Integrity..."
                : "Check Document Integrity"}

              {!loadingFraud && <span>→</span>}
            </button>
          </form>

          {fraudError && (
            <div className="history-alert error">
              <span>!</span>

              <div>
                <strong>
                  Verification Failed
                </strong>

                <p>{fraudError}</p>
              </div>
            </div>
          )}
        </div>

        {fraudResult && (
          <>
            <div className="history-summary-grid">
              <div className="stat-card">
                <div className="stat-top">
                  <span className="stat-label">
                    LAND ID
                  </span>

                  <span className="stat-icon">
                    ⌂
                  </span>
                </div>

                <div className="stat-value history-value">
                  #{fraudResult.land_id}
                </div>

                <div className="stat-footer">
                  <span>
                    Blockchain property record
                  </span>
                </div>
              </div>

              <div className="stat-card">
                <div className="stat-top">
                  <span className="stat-label">
                    DOCUMENT
                  </span>

                  <span className="stat-icon">
                    ▤
                  </span>
                </div>

                <div className="current-owner-value">
                  {fraudResult.filename ||
                    "Uploaded file"}
                </div>

                <div className="stat-footer">
                  <span>
                    SHA-256 calculated
                  </span>
                </div>
              </div>

              <div className="stat-card current-owner-card">
                <div className="stat-top">
                  <span className="stat-label">
                    VERDICT
                  </span>

                  <span className="stat-icon">
                    {genuine ? "✓" : "!"}
                  </span>
                </div>

                <div className="current-owner-value">
                  {genuine
                    ? "GENUINE"
                    : "TAMPERED"}
                </div>

                <div className="stat-footer">
                  <span
                    className={
                      genuine
                        ? "positive"
                        : "warning"
                    }
                  >
                    {genuine
                      ? "Hash matches blockchain"
                      : "Hash does not match"}
                  </span>
                </div>
              </div>
            </div>

            <div className="panel history-panel">
              <div className="panel-header">
                <div>
                  <h3>
                    Document Integrity Result
                  </h3>

                  <p>
                    The uploaded file was compared with the
                    document fingerprint stored for this
                    property.
                  </p>
                </div>

                <div className="history-blockchain-badge">
                  {genuine
                    ? "✓ Blockchain Match"
                    : "! Integrity Mismatch"}
                </div>
              </div>

              <div className="registration-review">
                <div>
                  <span>VERDICT</span>

                  <strong>
                    {fraudResult.verdict}
                  </strong>
                </div>

                <div>
                  <span>ALGORITHM</span>

                  <strong>
                    SHA-256
                  </strong>
                </div>
              </div>

              <div className="hash-result">
                <div className="hash-result-top">
                  <span>
                    Calculated document fingerprint
                  </span>

                  <strong>
                    SHA-256
                  </strong>
                </div>

                <code>
                  {fraudResult.calculated_hash}
                </code>
              </div>

              <div className="history-intro">
                <div className="history-intro-icon">
                  {genuine ? "✓" : "!"}
                </div>

                <div>
                  <h3>
                    {genuine
                      ? "Document is genuine"
                      : "Possible document tampering detected"}
                  </h3>

                  <p>
                    {genuine
                      ? "The calculated SHA-256 fingerprint matches the fingerprint recorded on the blockchain for this Land ID."
                      : "The calculated SHA-256 fingerprint does not match the fingerprint recorded on the blockchain. Even a small change to the file produces a different hash."}
                  </p>
                </div>
              </div>
            </div>
          </>
        )}

        {!fraudResult &&
          !fraudError &&
          !loadingFraud && (
            <div className="panel history-intro">
              <div className="history-intro-icon">
                ◈
              </div>

              <div>
                <h3>
                  Detect Document Tampering
                </h3>

                <p>
                  Upload the original property document to
                  confirm its fingerprint, or upload a modified
                  copy to demonstrate how LandChain detects
                  tampering.
                </p>
              </div>
            </div>
          )}
      </section>
    );
  };

  const Documents = () => {
    const documentHash =
      documentRecord?.document_hash ||
      documentRecord?.documentHash ||
      "";

    const owner = documentRecord?.owner || "";

    const displayOwner = owner
      ? `${owner.slice(0, 6)}...${owner.slice(-4)}`
      : "Unavailable";

    return (
      <section className="history-page">
        <div className="page-heading">
          <div>
            <div className="eyebrow">
              LAND REGISTRY
            </div>

            <h2>Documents</h2>

            <p>
              View the document fingerprint and registration
              record stored for a property on the blockchain.
            </p>
          </div>

          <div className="registration-step">
            <span>DOCUMENT RECORD</span>
            Blockchain-backed fingerprint
          </div>
        </div>

        <div className="panel history-search-panel">
          <div className="history-search-heading">
            <div className="form-number">01</div>

            <div>
              <h3>Find Property Document</h3>

              <p>
                Enter a Land ID to retrieve its registered
                document fingerprint directly from the blockchain.
              </p>
            </div>
          </div>

          <form
            className="history-search-form"
            onSubmit={fetchDocumentRecord}
          >
            <div className="history-input-group">
              <label>
                Land ID
                <span>*</span>
              </label>

              <input
                type="number"
                min="1"
                placeholder="e.g. 1"
                value={documentsLandId}
                onChange={(e) => {
                  setDocumentsLandId(e.target.value);
                  setDocumentRecord(null);
                  setDocumentsError("");
                }}
              />
            </div>

            <button
              type="submit"
              className="history-search-button"
              disabled={loadingDocuments}
            >
              {loadingDocuments
                ? "Loading..."
                : "View Document Record"}

              {!loadingDocuments && <span>→</span>}
            </button>
          </form>

          {documentsError && (
            <div className="history-alert error">
              <span>!</span>

              <div>
                <strong>Unable to retrieve document record</strong>
                <p>{documentsError}</p>
              </div>
            </div>
          )}
        </div>

        {documentRecord && (
          <>
            <div className="history-summary-grid">
              <div className="stat-card">
                <div className="stat-top">
                  <span className="stat-label">LAND ID</span>
                  <span className="stat-icon">⌂</span>
                </div>

                <div className="stat-value history-value">
                  #{documentRecord.land_id}
                </div>

                <div className="stat-footer">
                  <span>Blockchain property record</span>
                </div>
              </div>

              <div className="stat-card">
                <div className="stat-top">
                  <span className="stat-label">DOCUMENT</span>
                  <span className="stat-icon">▤</span>
                </div>

                <div className="current-owner-value">
                  SHA-256
                </div>

                <div className="stat-footer">
                  <span>On-chain fingerprint</span>
                </div>
              </div>

              <div className="stat-card">
                <div className="stat-top">
                  <span className="stat-label">CURRENT OWNER</span>
                  <span className="stat-icon">✓</span>
                </div>

                <div className="current-owner-value">
                  {displayOwner}
                </div>

                <div className="stat-footer">
                  <span className="positive">Verified record</span>
                </div>
              </div>

              <div className="stat-card current-owner-card">
                <div className="stat-top">
                  <span className="stat-label">STATUS</span>
                  <span className="stat-icon">✓</span>
                </div>

                <div className="current-owner-value">
                  {documentHash ? "RECORDED" : "NO HASH"}
                </div>

                <div className="stat-footer">
                  <span className={documentHash ? "positive" : "warning"}>
                    {documentHash
                      ? "Blockchain fingerprint found"
                      : "No fingerprint available"}
                  </span>
                </div>
              </div>
            </div>

            <div className="panel history-panel">
              <div className="panel-header">
                <div>
                  <h3>Registered Document</h3>
                  <p>
                    The document itself is not stored on the blockchain.
                    Its SHA-256 fingerprint is stored with the property
                    record so the original file can be checked for tampering.
                  </p>
                </div>

                <div className="history-blockchain-badge">
                  ✓ On-chain Record
                </div>
              </div>

              {documentHash ? (
                <div className="hash-result">
                  <div className="hash-result-top">
                    <span>✓ Document fingerprint recorded</span>
                    <strong>SHA-256</strong>
                  </div>

                  <code>{documentHash}</code>
                </div>
              ) : (
                <div className="history-empty">
                  <div className="history-empty-icon">▤</div>
                  <h3>No Document Hash Available</h3>
                  <p>
                    This property does not currently expose a document fingerprint.
                  </p>
                </div>
              )}

              <div className="registration-review">
                <div>
                  <span>LAND ID</span>
                  <strong>#{documentRecord.land_id}</strong>
                </div>

                <div>
                  <span>LOCATION</span>
                  <strong>{documentRecord.location || "Unavailable"}</strong>
                </div>

                <div>
                  <span>REGISTERED AT</span>
                  <strong>{formatTimestamp(documentRecord.registered_at)}</strong>
                </div>
              </div>
            </div>

            <div className="panel history-intro">
              <div className="history-intro-icon">✓</div>

              <div>
                <h3>Check Document Integrity</h3>

                <p>
                  Use Fraud Detection to upload a document and compare its
                  SHA-256 fingerprint against this blockchain record.
                </p>

                <button
                  type="button"
                  className="primary-button"
                  onClick={() => {
                    setFraudLandId(String(documentRecord.land_id));
                    setActivePage("Fraud Detection");
                  }}
                >
                  Verify This Document →
                </button>
              </div>
            </div>
          </>
        )}

        {!documentRecord &&
          !documentsError &&
          !loadingDocuments && (
            <div className="panel history-intro">
              <div className="history-intro-icon">▤</div>

              <div>
                <h3>Blockchain Document Records</h3>

                <p>
                  Search a registered Land ID to view its SHA-256 document
                  fingerprint, property details and blockchain registration time.
                </p>
              </div>
            </div>
          )}
      </section>
    );
  };

  const renderPage = () => {
    if (activePage === "Dashboard") {
      return <Dashboard />;
    }

    if (activePage === "Register Property") {
      return <RegisterProperty />;
    }

    if (activePage === "Verify Property") {
      return <VerifyProperty />;
    }

    if (activePage === "Ownership History") {
      return <OwnershipHistory />;
    }

    if (activePage === "Documents") {
      return <Documents />;
    }

    if (activePage === "Fraud Detection") {
      return <FraudDetection />;
    }

    return (
      <section className="placeholder-page">
        <div className="placeholder-icon">
          {
            menuItems.find(
              (item) => item.name === activePage
            )?.icon
          }
        </div>

        <span className="eyebrow">
          LANDCHAIN MODULE
        </span>

        <h2>{activePage}</h2>

        <p>
          This module will be connected to the LandChain
          backend and blockchain in the next development step.
        </p>

        <button
          className="primary-button"
          onClick={() =>
            setActivePage("Dashboard")
          }
        >
          ← Back to Dashboard
        </button>
      </section>
    );
  };

  return (
    <div className="app-layout">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-logo">
            L
          </div>

          <div>
            <h1>LANDCHAIN</h1>
            <span>Land Registry Platform</span>
          </div>
        </div>

        <div className="sidebar-section">
          <p className="section-title">
            MAIN MENU
          </p>

          <nav>
            {menuItems.map((item) => (
              <button
                key={item.name}
                className={`nav-item ${
                  activePage === item.name
                    ? "active"
                    : ""
                }`}
                onClick={() =>
                  setActivePage(item.name)
                }
              >
                <span className="nav-icon">
                  {item.icon}
                </span>

                <span>
                  {item.name}
                </span>
              </button>
            ))}
          </nav>
        </div>

        <div className="sidebar-bottom">
          <button className="nav-item">
            <span className="nav-icon">
              ⚙
            </span>

            <span>
              Settings
            </span>
          </button>

          <div className="security-card">
            <div className="security-icon">
              ✓
            </div>

            <div>
              <strong>
                Blockchain Secured
              </strong>

              <span>
                Records are tamper-resistant
              </span>
            </div>
          </div>
        </div>
      </aside>

      <main className="main-content">
        <header className="topbar">
          <div className="breadcrumb">
            <span>
              LandChain
            </span>

            <span className="breadcrumb-arrow">
              /
            </span>

            <strong>
              {activePage}
            </strong>
          </div>

          <div className="topbar-actions">
            <div className="network-status">
              <span className="status-dot"></span>
              Local Blockchain
            </div>

            <button
              className={`wallet-button ${
                wallet ? "connected" : ""
              }`}
              onClick={connectWallet}
            >
              <span className="wallet-icon">
                ◉
              </span>

              {wallet
                ? shortAddress
                : "Connect Wallet"}
            </button>
          </div>
        </header>

        <div className="page-content">
          {renderPage()}
        </div>
      </main>
    </div>
  );
}

export default App;