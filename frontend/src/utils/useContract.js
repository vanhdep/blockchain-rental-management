import { useState, useEffect, useCallback } from "react";
import { ethers } from "ethers";
import NhaTroABI from "./NhaTro.json";
import { CONTRACT_ADDRESS, SUPPORTED_CHAIN_IDS, NETWORK_NAMES } from "./constants";

export function useContract() {
  const [provider, setProvider] = useState(null);
  const [signer, setSigner] = useState(null);
  const [contract, setContract] = useState(null);
  const [account, setAccount] = useState(null);
  const [chainId, setChainId] = useState(null);
  const [isOwner, setIsOwner] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState(null);

  // ✅ FIX: Tạo provider với gasPrice tùy chỉnh để tự động confirm trên Ganache
  const buildContract = useCallback(async (web3Provider) => {
    const web3Signer = await web3Provider.getSigner();
    const network = await web3Provider.getNetwork();
    const currentChainId = Number(network.chainId);

    // ✅ FIX: Hỗ trợ cả Ganache (1337) và Hardhat (31337)
    const supportedIds = Object.values(SUPPORTED_CHAIN_IDS);
    if (!supportedIds.includes(currentChainId)) {
      throw new Error(
        `Network không được hỗ trợ (chainId: ${currentChainId}). Vui lòng chuyển sang Ganache (1337) hoặc Hardhat (31337).`
      );
    }

    const nhaTroContract = new ethers.Contract(
      CONTRACT_ADDRESS,
      NhaTroABI.abi,
      web3Signer
    );

    const ownerAddress = await nhaTroContract.owner();
    const accounts = await web3Provider.listAccounts();
    const currentAccount = accounts[0]?.address || (await web3Signer.getAddress());
    const userIsOwner = currentAccount.toLowerCase() === ownerAddress.toLowerCase();

    return { web3Signer, nhaTroContract, currentChainId, currentAccount, userIsOwner };
  }, []);

  const connectWallet = useCallback(async () => {
    try {
      if (!window.ethereum) {
        throw new Error("Vui lòng cài MetaMask để sử dụng DApp này!");
      }

      setError(null);

      // Yêu cầu kết nối ví
      await window.ethereum.request({ method: "eth_requestAccounts" });

      const web3Provider = new ethers.BrowserProvider(window.ethereum);
      const { web3Signer, nhaTroContract, currentChainId, currentAccount, userIsOwner } =
        await buildContract(web3Provider);

      setProvider(web3Provider);
      setSigner(web3Signer);
      setContract(nhaTroContract);
      setAccount(currentAccount);
      setChainId(currentChainId);
      setIsOwner(userIsOwner);
      setIsConnected(true);

      return { success: true };
    } catch (err) {
      const msg = err.message || "Kết nối thất bại";
      setError(msg);
      return { success: false, error: msg };
    }
  }, [buildContract]);

  const disconnectWallet = useCallback(() => {
    setProvider(null);
    setSigner(null);
    setContract(null);
    setAccount(null);
    setChainId(null);
    setIsOwner(false);
    setIsConnected(false);
  }, []);

  // Lắng nghe sự kiện thay đổi account / network
  useEffect(() => {
    if (!window.ethereum) return;

    const handleAccountsChanged = (accounts) => {
      if (accounts.length === 0) {
        disconnectWallet();
      } else if (isConnected) {
        // ✅ FIX: Reconnect khi đổi account
        connectWallet();
      }
    };

    const handleChainChanged = () => {
      window.location.reload();
    };

    window.ethereum.on("accountsChanged", handleAccountsChanged);
    window.ethereum.on("chainChanged", handleChainChanged);

    return () => {
      window.ethereum.removeListener("accountsChanged", handleAccountsChanged);
      window.ethereum.removeListener("chainChanged", handleChainChanged);
    };
  }, [isConnected, connectWallet, disconnectWallet]);

  return {
    provider,
    signer,
    contract,
    account,
    chainId,
    isOwner,
    isConnected,
    error,
    connectWallet,
    disconnectWallet,
    networkName: chainId ? NETWORK_NAMES[chainId] || `Chain ${chainId}` : null,
  };
}