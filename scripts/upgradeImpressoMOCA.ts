import { ethers, upgrades } from "hardhat";

async function main() {
    // const proxyAddress = "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512"; // Hardnet
    const proxyAddress = "0x5325f845b69dCAA50D579e7eD00A486609203573"; // Sepolia Testnet
    // const proxyAddress = "0xD1Dead0088f9c1346690f2E9531c5f65fCDaeB00"; // live
    const MocaUpgradeableV2 = await ethers.getContractFactory("ImpressoMOCA"); // or your new contract name
    
    
    const upgraded = await upgrades.upgradeProxy(proxyAddress, MocaUpgradeableV2);
    await upgraded.waitForDeployment();
    console.log("Contract upgraded at proxy address:", await upgraded.getAddress());
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});