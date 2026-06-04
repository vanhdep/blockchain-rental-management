const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  console.log("🚀 Bắt đầu deploy NhaTro Smart Contract...\n");

  // Lấy thông tin deployer
  const [deployer] = await hre.ethers.getSigners();
  console.log("📋 Deploying với account:", deployer.address);

  const balance = await hre.ethers.provider.getBalance(deployer.address);
  console.log("💰 Balance:", hre.ethers.formatEther(balance), "ETH\n");

  // Deploy contract
  const NhaTro = await hre.ethers.getContractFactory("NhaTro");
  console.log("⏳ Đang deploy...");
  const nhaTro = await NhaTro.deploy();
  await nhaTro.waitForDeployment();

  const contractAddress = await nhaTro.getAddress();
  console.log("✅ NhaTro deployed tại:", contractAddress);

  // Thêm phòng mẫu để test
  console.log("\n📦 Thêm phòng mẫu...");

  const rooms = [
    { name: "Phòng 101", price: hre.ethers.parseEther("0.05") },
    { name: "Phòng 102", price: hre.ethers.parseEther("0.08") },
    { name: "Phòng 201", price: hre.ethers.parseEther("0.1") },
    { name: "Phòng 202 (Studio)", price: hre.ethers.parseEther("0.15") },
    { name: "Phòng 301 (Deluxe)", price: hre.ethers.parseEther("0.2") },
  ];

  for (const room of rooms) {
    const tx = await nhaTro.addRoom(room.name, room.price);
    await tx.wait();
    console.log(`  ✔ Đã thêm: ${room.name} - ${hre.ethers.formatEther(room.price)} ETH/tháng`);
  }

  // Lưu thông tin deployment
  const deployInfo = {
    contractAddress,
    network: hre.network.name,
    chainId: (await hre.ethers.provider.getNetwork()).chainId.toString(),
    deployer: deployer.address,
    deployedAt: new Date().toISOString(),
    roomsAdded: rooms.length,
  };

  // Lưu vào file JSON để frontend dùng
  const deploymentPath = path.join(__dirname, "../frontend/src/utils/deployment.json");
  fs.mkdirSync(path.dirname(deploymentPath), { recursive: true });
  fs.writeFileSync(deploymentPath, JSON.stringify(deployInfo, null, 2));
  console.log("\n📝 Đã lưu deployment info vào frontend/src/utils/deployment.json");

  // Copy ABI sang frontend
  const artifactPath = path.join(
    __dirname,
    "../artifacts/contracts/NhaTro.sol/NhaTro.json"
  );
  const abiDestPath = path.join(__dirname, "../frontend/src/utils/NhaTro.json");

  if (fs.existsSync(artifactPath)) {
    const artifact = JSON.parse(fs.readFileSync(artifactPath, "utf8"));
    fs.writeFileSync(
      abiDestPath,
      JSON.stringify({ abi: artifact.abi }, null, 2)
    );
    console.log("📝 Đã copy ABI vào frontend/src/utils/NhaTro.json");
  }

  console.log("\n🎉 Deploy hoàn tất!");
  console.log("━".repeat(50));
  console.log("Contract Address:", contractAddress);
  console.log("Network:", hre.network.name);
  console.log("━".repeat(50));
  console.log("\n👉 Tiếp theo: Cập nhật CONTRACT_ADDRESS trong frontend/src/utils/constants.js");
  console.log(`   CONTRACT_ADDRESS = "${contractAddress}"`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Deploy thất bại:", error);
    process.exit(1);
  });
