// Import the Hardhat Runtime Environment (hre) using CommonJS
const hre = require("hardhat");

async function main() {
  console.log("Deploying DocumentRegistry contract...");

  // Retrieve the compiled smart contract factory
  const DocumentRegistry = await hre.ethers.getContractFactory("DocumentRegistry");

  // Broadcast the deployment transaction to the local node
  const documentRegistry = await DocumentRegistry.deploy();

  // Wait for the block to be mined and the deployment to finalize
  await documentRegistry.waitForDeployment();

  const contractAddress = await documentRegistry.getAddress();
  console.log(`DocumentRegistry successfully deployed to: ${contractAddress}`);
}

// Execute and catch any deployment errors
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});