export const CONTRACT_ADDRESS = "0x32Eb5846D2235BdA2f42A585657268f367C64308";

// ✅ FIX: Thêm Ganache (1337) vào danh sách hỗ trợ
export const SUPPORTED_CHAIN_IDS = {
  GANACHE: 1337,
  HARDHAT: 31337,
};

export const NETWORK_NAMES = {
  1337: "Ganache Local",
  31337: "Hardhat Local",
};

export const RPC_URLS = {
  1337: "http://127.0.0.1:7545",
  31337: "http://127.0.0.1:8545",
};