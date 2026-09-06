// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

contract LandRegistry {

    // ============================================
    // LAND STRUCTURE
    // ============================================

    struct Land {
        uint256 landId;
        string location;
        string documentHash;
        address owner;
        uint256 registeredAt;
        bool exists;
    }


    // ============================================
    // OWNERSHIP HISTORY STRUCTURE
    // ============================================

    struct OwnershipRecord {
        address owner;
        uint256 timestamp;
    }


    // ============================================
    // STORAGE
    // ============================================

    mapping(uint256 => Land) private lands;

    mapping(uint256 => OwnershipRecord[])
        private ownershipHistory;


    // ============================================
    // EVENTS
    // ============================================

    event LandRegistered(
        uint256 indexed landId,
        address indexed owner,
        string location,
        string documentHash
    );

    event OwnershipTransferred(
        uint256 indexed landId,
        address indexed previousOwner,
        address indexed newOwner
    );


    // ============================================
    // REGISTER LAND
    // ============================================

    function registerLand(
        uint256 _landId,
        string memory _location,
        string memory _documentHash
    ) public {

        require(
            !lands[_landId].exists,
            "Land already registered"
        );

        lands[_landId] = Land({
            landId: _landId,
            location: _location,
            documentHash: _documentHash,
            owner: msg.sender,
            registeredAt: block.timestamp,
            exists: true
        });

        // Store the original owner
        ownershipHistory[_landId].push(
            OwnershipRecord({
                owner: msg.sender,
                timestamp: block.timestamp
            })
        );

        emit LandRegistered(
            _landId,
            msg.sender,
            _location,
            _documentHash
        );
    }


    // ============================================
    // GET LAND INFORMATION
    // ============================================

    function getLand(uint256 _landId)
        public
        view
        returns (Land memory)
    {
        require(
            lands[_landId].exists,
            "Land not found"
        );

        return lands[_landId];
    }


    // ============================================
    // TRANSFER OWNERSHIP
    // ============================================

    function transferOwnership(
        uint256 _landId,
        address _newOwner
    ) public {

        require(
            lands[_landId].exists,
            "Land not found"
        );

        require(
            lands[_landId].owner == msg.sender,
            "Only owner can transfer"
        );

        require(
            _newOwner != address(0),
            "Invalid new owner"
        );

        address previousOwner =
            lands[_landId].owner;

        // Update current owner
        lands[_landId].owner = _newOwner;

        // Store new owner in history
        ownershipHistory[_landId].push(
            OwnershipRecord({
                owner: _newOwner,
                timestamp: block.timestamp
            })
        );

        emit OwnershipTransferred(
            _landId,
            previousOwner,
            _newOwner
        );
    }


    // ============================================
    // GET OWNERSHIP HISTORY
    // ============================================

    function getOwnershipHistory(
        uint256 _landId
    )
        public
        view
        returns (OwnershipRecord[] memory)
    {
        require(
            lands[_landId].exists,
            "Land not found"
        );

        return ownershipHistory[_landId];
    }


    // ============================================
    // VERIFY DOCUMENT HASH
    // ============================================

    function verifyDocumentHash(
        uint256 _landId,
        string memory _documentHash
    )
        public
        view
        returns (bool)
    {
        require(
            lands[_landId].exists,
            "Land not found"
        );

        return keccak256(
            bytes(lands[_landId].documentHash)
        ) == keccak256(
            bytes(_documentHash)
        );
    }
}