require("@nomicfoundation/hardhat-toolbox");

module.exports = {
  solidity: "0.8.20",
  networks: {
    pharos: {
      url: "https://rpc.testnet.riselabs.xyz", // 
      accounts: ["process.env.PRIVATE_KEY"], // tanpa 0x
    }
  }
};
