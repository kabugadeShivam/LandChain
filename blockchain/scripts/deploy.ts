import hre from "hardhat";

async function main() {
    const { ethers } = await hre.network.connect();

    const LandRegistry =
        await ethers.getContractFactory("LandRegistry");

    const registry =
        await LandRegistry.deploy();

    await registry.waitForDeployment();

    console.log(
        "LandRegistry deployed to:",
        await registry.getAddress()
    );
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});