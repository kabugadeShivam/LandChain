import { expect } from "chai";
import hre from "hardhat";

describe("LandRegistry", function () {

  async function deployRegistry() {
    const { ethers } = await hre.network.connect();

    const [owner, newOwner, attacker] =
      await ethers.getSigners();

    const LandRegistry =
      await ethers.getContractFactory("LandRegistry");

    const registry = await LandRegistry.deploy();

    await registry.waitForDeployment();

    return {
      ethers,
      registry,
      owner,
      newOwner,
      attacker
    };
  }


  it("Should register land and assign the correct owner", async function () {

    const {
      registry,
      owner
    } = await deployRegistry();

    await registry.registerLand(
      101,
      "Panvel, Maharashtra",
      "QmExampleDocumentHash123"
    );

    const land = await registry.getLand(101);

    expect(land.landId).to.equal(101n);
    expect(land.location).to.equal(
      "Panvel, Maharashtra"
    );
    expect(land.documentHash).to.equal(
      "QmExampleDocumentHash123"
    );
    expect(land.owner).to.equal(owner.address);
    expect(land.exists).to.equal(true);
  });


  it("Should prevent duplicate land registration", async function () {

    const { registry } = await deployRegistry();

    await registry.registerLand(
      101,
      "Panvel, Maharashtra",
      "Hash123"
    );

    await expect(
      registry.registerLand(
        101,
        "Mumbai, Maharashtra",
        "Hash456"
      )
    ).to.be.revertedWith(
      "Land already registered"
    );
  });


  it("Should transfer land ownership", async function () {

    const {
      registry,
      owner,
      newOwner
    } = await deployRegistry();

    await registry.registerLand(
      101,
      "Panvel, Maharashtra",
      "Hash123"
    );

    await registry.transferOwnership(
      101,
      newOwner.address
    );

    const land = await registry.getLand(101);

    expect(land.owner).to.equal(
      newOwner.address
    );

  });


  it("Should prevent unauthorized ownership transfer", async function () {

    const {
      registry,
      owner,
      attacker,
      newOwner
    } = await deployRegistry();

    await registry.registerLand(
      101,
      "Panvel, Maharashtra",
      "Hash123"
    );

    const attackerRegistry =
      registry.connect(attacker);

    await expect(
      attackerRegistry.transferOwnership(
        101,
        newOwner.address
      )
    ).to.be.revertedWith(
      "Only owner can transfer"
    );

    const land = await registry.getLand(101);

    expect(land.owner).to.equal(
      owner.address
    );
  });


  it("Should reject transfer to zero address", async function () {

    const {
      registry,
      ethers
    } = await deployRegistry();

    await registry.registerLand(
      101,
      "Panvel, Maharashtra",
      "Hash123"
    );

    await expect(
      registry.transferOwnership(
        101,
        ethers.ZeroAddress
      )
    ).to.be.revertedWith(
      "Invalid new owner"
    );
  });


  it("Should reject transfer of non-existent land", async function () {

    const { registry, newOwner } =
      await deployRegistry();

    await expect(
      registry.transferOwnership(
        999,
        newOwner.address
      )
    ).to.be.revertedWith(
      "Land not found"
    );
  });
    it("Should maintain complete ownership history", async function () {

    const {
      registry,
      owner,
      newOwner,
      attacker
    } = await deployRegistry();

    // Register land
    await registry.registerLand(
      101,
      "Panvel, Maharashtra",
      "Hash123"
    );

    // First transfer
    await registry.transferOwnership(
      101,
      newOwner.address
    );

    // Second transfer
    const newOwnerRegistry =
      registry.connect(newOwner);

    await newOwnerRegistry.transferOwnership(
      101,
      attacker.address
    );

    // Get ownership history
    const history =
      await registry.getOwnershipHistory(101);

    // Three ownership records should exist
    expect(history.length).to.equal(3);

    // Original owner
    expect(history[0].owner).to.equal(
      owner.address
    );

    // Second owner
    expect(history[1].owner).to.equal(
      newOwner.address
    );

    // Third owner
    expect(history[2].owner).to.equal(
      attacker.address
    );
  });
  it("Should verify a genuine document hash", async function () {

    const { registry } = await deployRegistry();

    await registry.registerLand(
      101,
      "Panvel, Maharashtra",
      "Hash123"
    );

    const result =
      await registry.verifyDocumentHash(
        101,
        "Hash123"
      );

    expect(result).to.equal(true);
  });


  it("Should reject a tampered document hash", async function () {

    const { registry } = await deployRegistry();

    await registry.registerLand(
      101,
      "Panvel, Maharashtra",
      "Hash123"
    );

    const result =
      await registry.verifyDocumentHash(
        101,
        "TamperedHash456"
      );

    expect(result).to.equal(false);
  });


  it("Should reject document verification for non-existent land", async function () {

    const { registry } = await deployRegistry();

    await expect(
      registry.verifyDocumentHash(
        999,
        "Hash123"
      )
    ).to.be.revertedWith(
      "Land not found"
    );
  });
});