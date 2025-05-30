const { ethers } = require("hardhat");

async function main() {
  // Ganti nama contract jika kamu sudah rename ke RiseIdentity, jika tidak tetap pakai PharosIdentity
  const RiseIdentity = await ethers.getContractFactory("RiseIdentity"); // GANTI JIKA KONTRAK SUDAH DI-RENAME
  const riseIdentity = await RiseIdentity.deploy();
  await riseIdentity.waitForDeployment();

  console.log("RiseIdentity deployed to:", riseIdentity.target);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
