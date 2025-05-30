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
    alreadyMinted: "Kamu sudah pernah mint! (1 NFT per Wallet)", // Sedikit diperjelas
    mintSuccess: "Mint Sukses! Detail NFT Anda:", // Diubah untuk status utama
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
    alreadyMinted: "You've already minted! (1 NFT per Wallet)", // Slightly clarified
    mintSuccess: "Mint Success! Your NFT Details:", // Changed for main status
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

  useEffect(() => {
    async function checkMinted() {
      if (!account) {
        setMinted(false);
        setCekMintLog("");
        setStatus(""); // PENYESUAIAN: Bersihkan status juga saat tidak ada akun
        setIpfsHashDisplay(""); // PENYESUAIAN: Bersihkan IPFS display
        setTxHash(""); // PENYESUAIAN: Bersihkan TxHash juga
        return;
      }

      setNftImg(NFT_IMAGE); 
      // ipfsHashDisplay akan di-set jika ditemukan NFT dari check ini
      // Jangan reset txHash di sini agar info mint baru dari sesi ini bisa tetap ada
      // sampai disconnect atau mint baru.

      try {
        const provider = new ethers.BrowserProvider(window.ethereum);
        const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, provider);
        const bal = await contract.balanceOf(account);
        
        if (bal > 0) {
          let tokenId;
          try {
            tokenId = await contract.tokenOfOwnerByIndex(account, 0);
          } catch (e) {
            console.warn("Tidak bisa mendapatkan tokenId:", e);
            tokenId = null;
          }

          if (tokenId !== null) {
            const tokenUri = await contract.tokenURI(tokenId);
            if (tokenUri) {
                setMetadataUrl(tokenUri);
                if (tokenUri.includes("/ipfs/")) {
                  const hashPart = tokenUri.split('/ipfs/')[1];
                  if (hashPart) setIpfsHashDisplay(hashPart);
                }
                try {
                  const meta = await fetch(tokenUri).then(res => res.json());
                  setNftImg(meta.image || NFT_IMAGE);
                } catch (e) {
                  console.warn("Gagal fetch metadata dari tokenUri yang ada:", e);
                  setNftImg(NFT_IMAGE);
                }
            } else {
                 setIpfsHashDisplay(""); 
                 setNftImg(NFT_IMAGE);
            }
          } else {
            setIpfsHashDisplay("");
            setNftImg(NFT_IMAGE);
          }
          // PENYESUAIAN: Hanya set cekMintLog, status akan dikosongkan
          setCekMintLog(LANGUAGES[lang].alreadyMinted); 
          setMinted(true);
          if (!txHash) { // Jika tidak ada txHash dari mint baru, kosongkan status operasi
            setStatus("");
          }
        } else {
          if (!txHash) { 
             setMinted(false);
             setIpfsHashDisplay(""); // PENYESUAIAN: Pastikan bersih jika belum ada NFT
          }
          setCekMintLog(""); 
          setNftImg(NFT_IMAGE);
        }
      } catch (err) {
        console.error("Gagal cek status mint:", err);
        setCekMintLog(LANGUAGES[lang].mintError + " (saat cek status): " + (err?.message || String(err)));
        if (!txHash) { 
            setMinted(false);
            setIpfsHashDisplay("");
        }
      }
    }

    checkMinted();
    // eslint-disable-next-line
  }, [account, lang]);


  async function connectMetamask() {
    if (window.ethereum && window.ethereum.isMetaMask) {
      try {
        await window.ethereum.request({
          method: "wallet_switchEthereumChain",
          params: [{ chainId: "0xaa2b9b" }]
        });
        const [addr] = await window.ethereum.request({ method: "eth_requestAccounts" });
        setAccount(addr);
        setTxHash(""); // PENYESUAIAN: Reset txHash saat ganti/connect akun baru
        setIpfsHashDisplay(""); // PENYESUAIAN: Reset IPFS display
        setStatus("");
        setCekMintLog("");
        setShowWalletModal(false);
      } catch (switchError) {
        if (switchError.code === 4902) {
          try {
            await window.ethereum.request({
              method: "wallet_addEthereumChain",
              params: [{
                chainId: "0xaa2b9b",
                chainName: "RISE Testnet",
                rpcUrls: ["https://rpc.testnet.riselabs.xyz"],
                nativeCurrency: { name: "Ethereum", symbol: "ETH", decimals: 18 },
                blockExplorerUrls: ["https://explorer.testnet.riselabs.xyz"]
              }]
            });
            const [addr] = await window.ethereum.request({ method: "eth_requestAccounts" });
            setAccount(addr);
            setTxHash(""); 
            setIpfsHashDisplay("");
            setStatus("");
            setCekMintLog("");
            setShowWalletModal(false);
          } catch (addError) {
            alert("Gagal menambahkan jaringan ke Metamask.");
          }
        } else {
          alert("Gagal switch jaringan di Metamask.");
        }
      }
    } else {
      alert("Metamask belum terpasang di browser Anda!");
    }
  }

  async function connectOKXWallet() {
    if (window.okxwallet) {
      try {
        await window.okxwallet.request({
          method: "wallet_switchEthereumChain",
          params: [{ chainId: "0xaa2b9b" }]
        });
        const [addr] = await window.okxwallet.request({ method: "eth_requestAccounts" });
        setAccount(addr);
        setTxHash(""); 
        setIpfsHashDisplay("");
        setStatus("");
        setCekMintLog("");
        setShowWalletModal(false);
      } catch (err) {
        alert("Gagal konek OKX Wallet: " + (err?.message || err));
      }
    } else {
      alert("OKX Wallet belum terpasang di browser Anda!");
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
      if (!PINATA_JWT) throw new Error("PINATA JWT ENV belum di-set! Hubungi admin.");

      const providerCheck = new ethers.BrowserProvider(window.ethereum);
      const contractCheck = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, providerCheck);
      const currentBalance = await contractCheck.balanceOf(account);
      if (currentBalance > 0) {
          setMinted(true); 
          setCekMintLog(LANGUAGES[lang].alreadyMinted); // Tampilkan di cekMintLog
          setStatus(""); 
          setLoading(false); // PENYESUAIAN: set loading false
          throw new Error(LANGUAGES[lang].alreadyMinted); 
      }
      setMinted(false);

      setStatus("🔒 " + LANGUAGES[lang].processing + " (Metadata)");
      const email_hash = SHA256(session.user.email).toString();
      const metadata = {
        name: "AFA COMMUNITY x PHAROS TESTNET IDENTITY",
        description: "Pharos Identity NFT for AFA Community",
        email_hash: email_hash,
        wallet: account,
        image: NFT_IMAGE
      };

      setStatus("📤 " + LANGUAGES[lang].processing + " (Pinata)");
      const res = await fetch("https://api.pinata.cloud/pinning/pinJSONToIPFS", { /* ... */ });

      if (!res.ok) { /* ... (penanganan error Pinata tidak berubah) ... */ 
        let errorData = {};
        try { errorData = await res.json(); } catch (e) { /* ignore */ }
        console.error("Pinata API request failed:", res.status, res.statusText, errorData);
        throw new Error(`Upload ke Pinata gagal (${res.status}): ` + (errorData.error?.details || errorData.error || JSON.stringify(errorData) || res.statusText));
      }
      const data = await res.json();
      if (!data || typeof data.IpfsHash !== 'string' || data.IpfsHash.trim() === '') { /* ... */ 
        console.error("Pinata response error: IpfsHash tidak valid atau tidak ada.", data);
        throw new Error("Upload ke Pinata gagal: Respons Pinata tidak mengandung IpfsHash yang valid.");
      }
      const ipfsActualHash = data.IpfsHash.trim();
      const tokenURI = `https://gateway.pinata.cloud/ipfs/${ipfsActualHash}`;
      
      setIpfsHashDisplay(ipfsActualHash); 
      setMetadataUrl(tokenURI);

      setStatus("✍️ " + LANGUAGES[lang].processing + " (Signature)");
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const msg = ethers.solidityPackedKeccak256(["address", "bytes32"], [account, "0x" + email_hash]);
      const signature = await window.ethereum.request({ method: "personal_sign", params: [msg, account] });

      setStatus("🟢 " + LANGUAGES[lang].processing + " (Transaksi)");
      const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);
      const tx = await contract.mintIdentity(tokenURI, "0x" + email_hash, signature);

      if (!tx || typeof tx.hash !== 'string' || tx.hash.trim() === '') { /* ... */ 
        console.error("Minting error: Hash transaksi tidak valid.", tx);
        throw new Error("Minting gagal: Tidak mendapatkan hash transaksi yang valid.");
      }
      const currentTxHash = tx.hash.trim();
      setTxHash(currentTxHash); 

      setStatus("⏳ " + LANGUAGES[lang].processing + " (Konfirmasi)");
      const receipt = await tx.wait();

      if (!receipt || typeof receipt.status !== 'number' || receipt.status !== 1) { /* ... */ 
        console.error("Minting error: Transaksi gagal di blockchain.", receipt);
        throw new Error("Minting gagal: Transaksi tidak berhasil (status: " + (receipt ? receipt.status : 'unknown') + "). Hash: " + currentTxHash);
      }

      setStatus("✅ " + LANGUAGES[lang].mintSuccess); // Pesan sukses utama di status
      setMinted(true); 
      setLoading(false);
      setCekMintLog(""); // Kosongkan cekMintLog karena status utama sudah sukses
      setNftImg(`https://gateway.pinata.cloud/ipfs/${ipfsActualHash}`); // Update gambar NFT setelah mint sukses

    } catch (err) {
      console.error("Kesalahan detail dalam mintIdentityNFT:", err);
      const errorMessage = err.message || String(err);
      setStatus("❌ " + LANGUAGES[lang].mintError + " " + errorMessage);
      setLoading(false);
      if (errorMessage !== LANGUAGES[lang].alreadyMinted) {
          setMinted(false); 
      } else {
          setMinted(true); 
          setCekMintLog(LANGUAGES[lang].alreadyMinted); 
      }
    }
  }

  // --- Logika Tombol Mint ---
  const hasMintedInPreviousSession = minted && !txHash && !loading;
  const justSuccessfullyMinted = minted && txHash && !loading;

  const isMintButtonDisabled = 
    !session || 
    !account || 
    loading || 
    hasMintedInPreviousSession || 
    justSuccessfullyMinted;

  let mintButtonText = LANGUAGES[lang].mint;
  if (loading) {
    mintButtonText = LANGUAGES[lang].processing;
  } else if (hasMintedInPreviousSession || justSuccessfullyMinted) {
    // Jika sudah minted (baik sesi ini atau sebelumnya), tombol akan menampilkan "Sudah Minted"
    mintButtonText = LANGUAGES[lang].minted;
  }
  // Jika error dan tidak loading, tombol akan kembali ke "Mint Identity NFT"

  return (
    <>
      <div style={{ /* ... background styles ... */ }} />
      {showWalletModal && <WalletModal />}
      <div style={{
        maxWidth: 480, // PENYESUAIAN LAYOUT: Lebar kartu utama
        margin: "2rem auto", // PENYESUAIAN LAYOUT: Margin atas/bawah dan auto kiri/kanan
        padding: "2rem 1.5rem", // PENYESUAIAN LAYOUT: Padding dalam kartu
        // ... sisa style kartu utama ...
        background: "linear-gradient(120deg,rgba(32,19,57,0.98) 66%,rgba(24,30,47,0.98) 100%), url('https://www.transparenttextures.com/patterns/diamond-upholstery.png') repeat",
        borderRadius: 30,
        boxShadow: "0 12px 52px #1a0028cc, 0 1.5px 0 #60eaff55, 0 0 0 8px #a259ff09",
        color: "#e3eaff", fontFamily: "'Montserrat', 'Orbitron', 'Space Grotesk', Arial, sans-serif",
        border: "2.1px solid #a259ff33", position: "relative", overflow: "visible", zIndex: 2
      }}>
        <div style={{ /* ... glow accent ... */ }} />
        
        {/* --- HEADER --- */}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          marginBottom: "1.5rem", // PENYESUAIAN LAYOUT
          zIndex: 1, position: "relative"
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}> {/* PENYESUAIAN LAYOUT: gap */}
            <img src="https://ik.imagekit.io/5spt6gb2z/IMG_2894.jpeg" alt="Logo Channel" width={50} height={50} // PENYESUAIAN LAYOUT: ukuran logo
              style={{
                borderRadius: "50%", border: "2.5px solid #00ffc3", background: "#1e1b3a",
                boxShadow: "0 2px 20px #00ffc355", objectFit: "cover"
              }} />
            <h2 style={{
              fontFamily: "'Orbitron', 'Montserrat', Arial, sans-serif", letterSpacing: 1.2, fontWeight: 800, // PENYESUAIAN LAYOUT
              fontSize: "1.75rem", // PENYESUAIAN LAYOUT
              color: "#fff", textShadow: "0 2px 15px #a259ff88, 0 1px 4px #00ffc355", // PENYESUAIAN LAYOUT
              margin: 0, lineHeight: 1.1
            }}> {LANGUAGES[lang].title} </h2>
          </div>
          <button onClick={toggleLang} style={{
            background: "linear-gradient(90deg,#a259ff 40%,#00ffc3 100%)", color: "#191d2e", border: "none",
            borderRadius: 12, padding: "0.5rem 1rem", fontWeight: 800, cursor: "pointer", fontSize: "0.9rem", // PENYESUAIAN LAYOUT
            boxShadow: "0 2px 10px #00ffc344", fontFamily: "'Montserrat', Arial, sans-serif"
          }}> {lang === "id" ? "EN" : "ID"} </button>
        </div>

        <div style={{
          textAlign: "center", marginBottom: "1.25rem", fontSize: "1rem", color: "#c3b8fd", // PENYESUAIAN LAYOUT
          letterSpacing: 0.5, fontFamily: "'Montserrat', Arial, sans-serif", fontWeight: 600 // PENYESUAIAN LAYOUT
        }}> {LANGUAGES[lang].network} </div>
        
        <div style={{ display: "flex", justifyContent: "center", marginBottom: "2rem" }}> {/* PENYESUAIAN LAYOUT */}
          <div style={{
            borderRadius: 22, boxShadow: "0 0 30px 5px #a259ff33, 0 4px 18px #00ffc344", // PENYESUAIAN LAYOUT
            border: "3px solid #00ffc3", padding: "0.5rem", // PENYESUAIAN LAYOUT
            background: "linear-gradient(120deg, #2a1449 70%, #a259ff33 100%)"
          }}>
            <img src={nftImg} alt="NFT Preview" style={{
                width: 180, height: 180, borderRadius: 16, objectFit: "cover", // PENYESUAIAN LAYOUT
                display: "block", boxShadow: "0 4px 25px #a259ff1a" // PENYESUAIAN LAYOUT
              }} />
          </div>
        </div>

        <div style={{ marginBottom: "1.5rem", textAlign: "center" }}> {/* PENYESUAIAN LAYOUT */}
          {session ? (<GoogleProfile user={session.user} />) : (
            <button onClick={() => signIn("google")} style={{
              ...btnStyle("linear-gradient(90deg,#a259ff 0%,#00ffc3 100%)"), color: "#191d2e",
              borderRadius: 10, fontSize: "1.1rem", fontWeight: 800, width: "100%", padding: "0.75rem", // PENYESUAIAN LAYOUT
              boxShadow: "0 2px 15px #00ffc333", fontFamily: "'Montserrat', Arial, sans-serif"
            }}> {LANGUAGES[lang].login} </button>
          )}
        </div>

        {account && (
          <div style={{
            margin: "0 auto 1.5rem auto", textAlign: "center", display: "flex", // PENYESUAIAN LAYOUT
            flexDirection: "column", // PENYESUAIAN LAYOUT: susun ke bawah di mobile, atau bisa row dengan wrap
            alignItems: "center", gap: "0.75rem", maxWidth: "90%" // PENYESUAIAN LAYOUT
          }}>
            <div style={{
              background: "linear-gradient(90deg,#231e40 70%,#a259ff22 100%)", borderRadius: 8, // PENYESUAIAN LAYOUT
              padding: "0.5rem 1rem", fontSize: "0.95rem", fontFamily: "'Orbitron', 'Montserrat', Arial, sans-serif", // PENYESUAIAN LAYOUT
              fontWeight: 700, color: "#c3b8fd", border: "1px solid #00ffc3", // PENYESUAIAN LAYOUT
              boxShadow: "0 1px 5px #a259ff22", width: "100%", maxWidth: 300, wordBreak: "break-all" // PENYESUAIAN LAYOUT
            }}> {`${LANGUAGES[lang].wallet}: ${shortAddr(account)}`} </div>
            <button onClick={disconnectWallet} style={{
                ...btnStyle("#232837"), fontSize: "0.9rem", borderRadius: 8, color: "#fff", // PENYESUAIAN LAYOUT
                fontWeight: 600, border: "1px solid #a259ff33", padding: "0.5rem 1rem", width: "fit-content" // PENYESUAIAN LAYOUT
              }}> {LANGUAGES[lang].disconnect} </button>
          </div>
        )}

        <div style={{ textAlign: "center", marginTop: "0.5rem" }}> {/* PENYESUAIAN LAYOUT */}
          {/* PENYESUAIAN LAYOUT: cekMintLog (pesan "already minted" saat load) ditampilkan di sini */}
          {cekMintLog && !status && (  // Hanya tampilkan jika tidak ada status operasi mint yang aktif
            <div style={{
              background: "rgba(0, 255, 195, 0.07)", // Samakan dengan blok info
              color: "#00ffc3",
              padding: "0.75rem 1rem", borderRadius: 10, // PENYESUAIAN LAYOUT
              marginBottom: "1rem", // PENYESUAIAN LAYOUT: Jarak ke tombol mint
              fontWeight: 700, fontSize: "0.95rem", textAlign: "center", // PENYESUAIAN LAYOUT
              fontFamily: "'Montserrat', Arial, sans-serif",
              border: "1.5px solid #00ffc366" // PENYESUAIAN LAYOUT
            }}>
              {cekMintLog}
            </div>
          )}

          <button
            onClick={mintIdentityNFT}
            disabled={isMintButtonDisabled}
            style={{
              ...btnStyle("linear-gradient(90deg,#00ffc3 0%,#a259ff 100%)"),
              color: "#1b2130", fontWeight: 800, // PENYESUAIAN LAYOUT
              margin: "0.5rem 0 1.25rem 0", // PENYESUAIAN LAYOUT
              opacity: isMintButtonDisabled ? 0.6 : 1, // PENYESUAIAN LAYOUT
              cursor: isMintButtonDisabled ? "not-allowed" : "pointer",
              boxShadow: "0 2px 15px #00ffc533", // PENYESUAIAN LAYOUT
              fontSize: "1.15rem", width: "100%", // PENYESUAIAN LAYOUT
              padding: "0.8rem", // PENYESUAIAN LAYOUT
              borderRadius: 10, fontFamily: "'Orbitron', 'Montserrat', Arial, sans-serif"
            }}>
            {mintButtonText}
          </button>
        </div>
        
        {/* PENYESUAIAN LAYOUT: Pesan Status Utama dari Operasi Mint dan Blok Info digabung jika sukses */}
        {status && (
            <div style={{
            margin: status.startsWith("✅") ? "0" : "1.5rem 0 0.75rem 0", // PENYESUAIAN LAYOUT: Margin jika bukan bagian dari blok sukses
            minHeight: "2rem", // PENYESUAIAN LAYOUT
            fontSize: "1rem", fontWeight: 700, // PENYESUAIAN LAYOUT
            textAlign: "center",
            color: status.startsWith("❌") ? "#f88" : (status.startsWith("✅") ? "transparent" : "#a259ff"), // Sembunyikan teks status sukses biasa
            fontFamily: "'Montserrat', Arial, sans-serif", 
            // textShadow: "0 1px 7px #a259ff33" // Mungkin tidak perlu jika sudah ada blok info
            }}>
            {/* Jangan tampilkan teks status sukses biasa jika blok info akan muncul */}
            {status.startsWith("✅") ? "" : status} 
            </div>
        )}
        
        {/* Blok untuk menampilkan TX HASH dan IPFS HASH */}
        {/* Kondisi diubah agar lebih fokus pada hasil mint baru atau info dari NFT yang sudah ada */}
        {(txHash && ipfsHashDisplay && status.startsWith("✅")) || // Baru sukses mint DAN statusnya sukses
         (minted && ipfsHashDisplay && !txHash && !loading && !status.startsWith("❌")) ? ( // Sudah minted dari check, tidak loading, dan tidak ada error status aktif
          <div style={{ 
            marginTop: status.startsWith("✅") ? '1rem' : '0.5rem', // PENYESUAIAN LAYOUT: jarak jika ada status error di atasnya
            padding: '1rem', // PENYESUAIAN LAYOUT
            background: "rgba(0, 255, 195, 0.07)", border: "1.5px solid #00ffc3",
            borderRadius: '10px', textAlign: 'left', fontSize: '0.9rem', // PENYESUAIAN LAYOUT
            fontFamily: "'Montserrat', Arial, sans-serif",
            boxShadow: "0 2px 10px rgba(0, 255, 195, 0.25)", color: "#e3eaff"
          }}>
            {status.startsWith("✅") && txHash && ( // Tampilkan pesan sukses di sini jika ini adalah hasil mint baru
                 <div style={{ color: "#00ffc3", fontWeight: 'bold', fontSize: '1rem', marginBottom: '0.75rem', textAlign: 'center' }}>
                    {LANGUAGES[lang].mintSuccess}
                 </div>
            )}
            {txHash && ( 
                <div style={{ marginBottom: ipfsHashDisplay ? '0.75rem' : '0px' }}> {/* PENYESUAIAN LAYOUT */}
                <span style={{ fontWeight: 'bold', color: '#e3eaff', fontSize: '0.95rem' }}>{LANGUAGES[lang].txHashLabel} </span>
                <a href={`${EXPLORER_BASE}${txHash}`} target="_blank" rel="noopener noreferrer" style={{ color: '#00ffc3', textDecoration: 'underline', wordBreak: 'break-all', display: 'block', marginTop:'2px', fontSize: '0.85rem' }}>
                    {txHash}
                </a>
                <a href={`${EXPLORER_BASE}${txHash}`} target="_blank" rel="noopener noreferrer" style={{ color: '#7cb8f9', textDecoration: 'underline', fontSize: '0.8rem', display: 'inline-block', marginTop: '3px' }}>
                    ({LANGUAGES[lang].viewOnExplorer})
                </a>
                </div>
            )}
            {ipfsHashDisplay && metadataUrl && ( 
                <div>
                <span style={{ fontWeight: 'bold', color: '#e3eaff', fontSize: '0.95rem' }}>{LANGUAGES[lang].ipfsHashLabel} </span>
                <a href={metadataUrl} target="_blank" rel="noopener noreferrer" style={{ color: '#00ffc3', textDecoration: 'underline', wordBreak: 'break-all', display: 'block', marginTop:'2px', fontSize: '0.85rem' }}>
                    {ipfsHashDisplay}
                </a>
                <a href={metadataUrl} target="_blank" rel="noopener noreferrer" style={{ color: '#7cb8f9', textDecoration: 'underline', fontSize: '0.8rem', display: 'inline-block', marginTop: '3px' }}>
                    ({LANGUAGES[lang].explorer})
                </a>
                </div>
            )}
          </div>
        ) : null}


        <div style={{ /* ... Telegram Card ... */ }}> 
            {/* ... (Konten tidak berubah) ... */}
        </div>
        <div style={{ /* ... Powered by ... */ }}>
            {/* ... (Konten tidak berubah) ... */}
        </div>
      </div>
    </>
  );
}

// Helper functions
function shortAddr(addr) {
  if (!addr) return "";
  return addr.slice(0, 7) + "..." + addr.slice(-4);
}

function btnStyle(bg) {
  return {
    background: bg,
    color: "#fff",
    padding: "10px 22px", // Akan dioverride oleh style spesifik tombol jika ada
    border: "none",
    borderRadius: "11px", // Akan dioverride
    fontWeight: 800,
    fontSize: 17, // Akan dioverride
    cursor: "pointer",
    margin: "0 4px 0 0", // Akan dioverride
    transition: "all 0.23s",
    boxShadow: "0 1px 11px #a259ff33" // Akan dioverride
  };
}
