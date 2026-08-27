// Use require() instead of import in a .cjs file
require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config();

/** @type import('hardhat/config').HardhatUserConfig */
// Use module.exports instead of export default
module.exports = {
  solidity: "0.8.20",
  networks: {
    // Local node connection
    localhost: {
      url: "http://127.0.0.1:8545"
    },
    // Sepolia testnet connection
    sepolia: {
      url: process.env.SEPOLIA_RPC_URL || "",
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : []
    },
    // Polygon Amoy testnet connection
    polygonAmoy: {
      url: process.env.AMOY_RPC_URL || "",
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : []
    }
  }
};