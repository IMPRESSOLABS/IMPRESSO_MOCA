import { ethers, upgrades } from "hardhat";

async function main() {
    const [deployer] = await ethers.getSigners();
    console.log("Deploying MocaUpgradeable with account:", deployer.address);
    console.log("Account balance:", (await deployer.provider.getBalance(deployer.address)).toString());

    const TOKEN_NAME = "IMPRESSO MOCA";
    const TOKEN_SYMBOL = "MOCA";

    // Get contract factory
    const MocaUpgradeable = await ethers.getContractFactory("ImpressoMOCA")
    
    // Deploy UUPS proxy
    const mocaProxy = await upgrades.deployProxy(
        MocaUpgradeable,
        [TOKEN_NAME, TOKEN_SYMBOL],
        { initializer: 'initialize', kind: 'uups' }
    );

    await mocaProxy.waitForDeployment(); // Ensure proxy is deployed and initialized

    const proxyAddress = await mocaProxy.getAddress();
    console.log("MocaUpgradeable proxy deployed to:", proxyAddress);

    // Now interact with the proxy
    // const owner = await mocaProxy.owner();
    // console.log("Owner:", owner);

    // const paused = await mocaProxy.paused();
    // // console.log("Paused:", paused);
    // Example: Mint 1000 tokens to the deployer
    // const mintAmount = ethers.parseUnits("10000000", 18); // Adjust decimals if needed
    // const tx = await mocaProxy.mint(deployer.address, mintAmount);
    // await tx.wait();

    // console.log(`Minted ${mintAmount} tokens to ${deployer.address}. Token address: ${proxyAddress}`);


}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
