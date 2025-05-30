import { useState, useEffect } from "react";
import { useSession, signIn, signOut } from "next-auth/react";
import { ethers } from "ethers";
import SHA256 from "crypto-js/sha256";

// --- RISE TESTNET CONFIG ---
const PINATA_JWT = process.env.NEXT_PUBLIC_PINATA_JWT;
const CONTRACT_ADDRESS = "0xEb60c32E892AB69390A42b2E27F0F3caA23394F9";
const CONTRACT_ABI = [
  {
    "inputs": [
      { "internalType": "string", "name": "newTokenUri", "type": "string" },
      { "internalType": "bytes32", "name": "emailHash", "type": "bytes32" },
      { "internalType": "bytes", "name": "signature", "type": "bytes" }
    ],
    "name": "mintIdentity",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      { "internalType": "uint256", "name": "tokenId", "type": "uint256" }
    ],
    "name": "tokenURI",
    "outputs": [
      { "internalType": "string", "name": "", "type": "string" }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      { "internalType": "address", "name": "owner", "type": "address" }
    ],
    "name": "balanceOf",
    "outputs": [
      { "internalType": "uint256", "name": "", "type": "uint256" }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      { "internalType": "address", "name": "owner", "type": "address" },
      { "internalType": "uint256", "name": "index", "type": "uint256" }
    ],
    "name": "tokenOfOwnerByIndex",
    "outputs": [
      { "internalType": "uint256", "name": "", "type": "uint256" }
    ],
    "stateMutability": "view",
    "type": "function"
  }
];

const NFT_IMAGE = "https://ik.imagekit.io/5spt6gb2z/IMG_5234.jpeg";
const EXPLORER_BASE = "https://explorer.testnet.riselabs.xyz/tx/";

const LANGUAGES = {
  id: {
    title: "Mint Identity NFT",
    network: "Rise Testnet",
    login: "Login dengan Google",
    logout: "Logout",
    connect: "Connect Wallet",
    disconnect: "Diskonek Wallet",
    wallet: "Wallet",
    minted: "Sudah Minted",
    mint: "Mint Identity NFT",
    processing: "Memproses...",
    alreadyMinted: "Kamu sudah pernah mint! Satu wallet hanya dapat 1 NFT Identity.",
    mintSuccess: "Mint sukses! Kamu sudah punya NFT Identity.",
    mintError: "Terjadi kesalahan saat mint:",
    notInstalled: "Metamask belum terinstall!",
    checkWallet: "Connect wallet dulu!",
    checkGoogle: "Login Google dulu!",
    follow: "🚀 Follow CHANNEL AIRDROP FOR ALL",
    powered: "Powered by",
    explorer: "Lihat di IPFS",
    txHashLabel: "Hash Transaksi:",
    ipfsHashLabel: "Hash IPFS Metadata:",
    viewOnExplorer: "Lihat di Explorer Rise",
  },
  en: {
    title: "Mint Identity NFT",
    network: "Rise Testnet",
    login: "Login with Google",
    logout: "Logout",
    connect: "Connect Wallet",
    disconnect: "Disconnect Wallet",
    wallet: "Wallet",
    minted: "Already Minted",
    mint: "Mint Identity NFT",
    processing: "Processing...",
    alreadyMinted: "You've already minted! Only 1 NFT Identity per wallet.",
    mintSuccess: "Mint success! You already have NFT Identity.",
    mintError: "Error occurred while minting:",
    notInstalled: "Metamask is not installed!",
    checkWallet: "Connect your wallet first!",
    checkGoogle: "Login with Google first!",
    follow: "🚀 Follow CHANNEL AIRDROP FOR ALL",
    powered: "Powered by",
    explorer: "View on IPFS",
    txHashLabel: "Transaction Hash:",
    ipfsHashLabel: "IPFS Metadata Hash:",
    viewOnExplorer: "View on Rise Explorer",
  }
};

export default function MintIdentity() {
  const { data: session } = useSession();
  const [account, setAccount] = useState("");
  const [status, setStatus] = useState("");
  const [minted, setMinted] = useState(false);
  const [txHash, setTxHash] = useState("");
  const [metadataUrl, setMetadataUrl] = useState("");
  const [ipfsHashDisplay, setIpfsHashDisplay] = useState("");
  const [loading, setLoading] = useState(false);
  const [cekMintLog, setCekMintLog] = useState("");
  const [nftImg, setNftImg] = useState(NFT_IMAGE);
  const [lang, setLang] = useState("id");
  const [showWalletModal, setShowWalletModal] = useState(false);

  useEffect(() => {
    const link = document.createElement("link");
    link.href =
      "https://fonts.googleapis.com/css2?family=Orbitron:wght@700&family=Montserrat:wght@400;600;700&family=Space+Grotesk:wght@500;700&display=swap";
    link.rel = "stylesheet";
    document.head.appendChild(link);
    return () => { document.head.removeChild(link); };
  }, []);

  function toggleLang() {
    setLang(lang === "id" ? "en" : "id");
  }

  function disconnectWallet() {
    setAccount("");
    setMinted(false);
    setTxHash("");
    setMetadataUrl("");
    setIpfsHashDisplay("");
    setNftImg(NFT_IMAGE);
    setCekMintLog("");
    setStatus("");
  }

  async function connectMetamask() {
    if (window.ethereum && window.ethereum.isMetaMask) {
      try {
        await window.ethereum.request({
          method: "wallet_switchEthereumChain",
          params: [{ chainId: "0xaa2b9b" }]
        });
        const [addr] = await window.ethereum.request({ method: "eth_requestAccounts" });
        setAccount(addr);
        setShowWalletModal(false);
      } catch (switchError) {
        alert("Gagal switch jaringan di Metamask.");
      }
    } else {
      alert("Metamask belum terpasang di browser Anda!");
    }
  }

  async function mintIdentityNFT() {
    setTxHash("");
    setMetadataUrl("");
    setIpfsHashDisplay("");
    setCekMintLog("");
    setStatus("");
    setLoading(true);
    try {
      if (!session) throw new Error(LANGUAGES[lang].checkGoogle);
      if (!account) throw new Error(LANGUAGES[lang].checkWallet);

      const email_hash = SHA256(session.user.email).toString();
      const metadata = {
        name: "AFA COMMUNITY x PHAROS TESTNET IDENTITY",
        description: "Pharos Identity NFT for AFA Community",
        email_hash: email_hash,
        wallet: account,
        image: NFT_IMAGE
      };

      const res = await fetch("https://api.pinata.cloud/pinning/pinJSONToIPFS", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${PINATA_JWT.replace(/^Bearer\s+/i, "")}`
        },
        body: JSON.stringify(metadata)
      });

      const data = await res.json();
      const ipfsActualHash = data.IpfsHash.trim();
      const tokenURI = `https://gateway.pinata.cloud/ipfs/${ipfsActualHash}`;

      setIpfsHashDisplay(ipfsActualHash);
      setMetadataUrl(tokenURI);

      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const msg = ethers.solidityPackedKeccak256(
        ["address", "bytes32"],
        [account, "0x" + email_hash]
      );
      const signature = await window.ethereum.request({
        method: "personal_sign",
        params: [msg, account]
      });

      const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);
      const tx = await contract.mintIdentity(tokenURI, "0x" + email_hash, signature);
      const currentTxHash = tx.hash.trim();
      setTxHash(currentTxHash);
      setStatus(LANGUAGES[lang].mintSuccess);
      setMinted(true);
      setLoading(false);
    } catch (err) {
      setStatus(LANGUAGES[lang].mintError + " " + (err?.message || String(err)));
      setLoading(false);
    }
  }

  return (
    <>
      {/* Background */}
      <div style={{
        background: "linear-gradient(120deg,#1c1137 50%,#24134a 100%), url('https://www.transparenttextures.com/patterns/diamond-upholstery.png') repeat",
        minHeight: "100vh",
        minWidth: "100vw",
        position: "fixed",
        top: 0,
        left: 0,
        zIndex: 0
      }} />
      {/* Content */}
      <div style={{
        maxWidth: 480,
        margin: "38px auto",
        padding: "36px 24px",
        background: "linear-gradient(120deg,rgba(32,19,57,0.98),rgba(24,30,47,0.98))",
        borderRadius: 30
      }}>
        {/* Header */}
        <div style={{
          display: "flex",
          justifyContent: "space-between",
          marginBottom: 20
        }}>
          <h2>{LANGUAGES[lang].title}</h2>
          <button onClick={toggleLang}>{lang === "id" ? "English" : "Bahasa"}</button>
        </div>
        {/* Wallet */}
        <button onClick={mintIdentityNFT}>{LANGUAGES[lang].mint}</button>
        {/* Status */}
        <div>{status}</div>
      </div>
    </>
  );
}