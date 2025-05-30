import { useState, useEffect } from "react";
import { useSession, signIn, signOut } from "next-auth/react";
import { ethers } from "ethers";
import SHA256 from "crypto-js/sha256";

// --- RISE TESTNET CONFIG ---
const PINATA_JWT = process.env.NEXT_PUBLIC_PINATA_JWT;
const CONTRACT_ADDRESS = "0xEb60c32E892AB69390A42b2E27F0F3caA23394F9";
const CONTRACT_ABI = [
  // ... (ABI tidak berubah)
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
    alreadyMinted: "Kamu sudah pernah mint! (1 NFT per Wallet)",
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
    alreadyMinted: "You've already minted! (1 NFT per Wallet)",
    mintSuccess: "Mint Success! Your NFT Details:",
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
        setStatus(""); 
        setIpfsHashDisplay(""); 
        setTxHash(""); 
        return;
      }
      setNftImg(NFT_IMAGE); 
      // Tidak reset cekMintLog di sini agar pesan "already minted" bisa persisten jika baru connect
      // dan tidak ada operasi mint baru

      try {
        const provider = new ethers.BrowserProvider(window.ethereum);
        const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, provider);
        const bal = await contract.balanceOf(account);
        
        if (bal > 0) {
          let tokenId;
          try { tokenId = await contract.tokenOfOwnerByIndex(account, 0); } 
          catch (e) { console.warn("Tidak bisa mendapatkan tokenId:", e); tokenId = null; }

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
                } catch (e) { console.warn("Gagal fetch metadata:", e); setNftImg(NFT_IMAGE); }
            } else { setIpfsHashDisplay(""); setNftImg(NFT_IMAGE); }
          } else { setIpfsHashDisplay(""); setNftImg(NFT_IMAGE); }
          
          // Hanya set cekMintLog jika belum ada status operasi mint atau txHash baru
          if (!status && !txHash) { 
            setCekMintLog(LANGUAGES[lang].alreadyMinted);
          }
          setMinted(true);
        } else {
          if (!txHash) { setMinted(false); setIpfsHashDisplay(""); }
          setCekMintLog(""); 
          setNftImg(NFT_IMAGE);
        }
      } catch (err) {
        console.error("Gagal cek status mint:", err);
        if (!status && !txHash) { // Hanya update cekMintLog jika tidak ada status operasi lain
            setCekMintLog(LANGUAGES[lang].mintError + " (cek): " + (err?.message || String(err)));
        }
        if (!txHash) { setMinted(false); setIpfsHashDisplay("");}
      }
    }
    checkMinted();
    // eslint-disable-next-line
  }, [account, lang]);

  async function connectMetamask() {
    if (window.ethereum && window.ethereum.isMetaMask) {
      try {
        await window.ethereum.request({ method: "wallet_switchEthereumChain", params: [{ chainId: "0xaa2b9b" }] });
        const [addr] = await window.ethereum.request({ method: "eth_requestAccounts" });
        setAccount(addr); setTxHash(""); setIpfsHashDisplay(""); setStatus(""); setCekMintLog("");
        setShowWalletModal(false);
      } catch (switchError) {
        if (switchError.code === 4902) {
          try {
            await window.ethereum.request({
              method: "wallet_addEthereumChain",
              params: [{
                chainId: "0xaa2b9b", chainName: "RISE Testnet", rpcUrls: ["https://rpc.testnet.riselabs.xyz"],
                nativeCurrency: { name: "Ethereum", symbol: "ETH", decimals: 18 },
                blockExplorerUrls: ["https://explorer.testnet.riselabs.xyz"]
              }]
            });
            const [addr] = await window.ethereum.request({ method: "eth_requestAccounts" });
            setAccount(addr); setTxHash(""); setIpfsHashDisplay(""); setStatus(""); setCekMintLog("");
            setShowWalletModal(false);
          } catch (addError) { alert("Gagal menambahkan jaringan ke Metamask."); }
        } else { alert("Gagal switch jaringan di Metamask."); }
      }
    } else { alert("Metamask belum terpasang!"); }
  }

  async function connectOKXWallet() {
    if (window.okxwallet) {
      try {
        await window.okxwallet.request({ method: "wallet_switchEthereumChain", params: [{ chainId: "0xaa2b9b" }] });
        const [addr] = await window.okxwallet.request({ method: "eth_requestAccounts" });
        setAccount(addr); setTxHash(""); setIpfsHashDisplay(""); setStatus(""); setCekMintLog("");
        setShowWalletModal(false);
      } catch (err) { alert("Gagal konek OKX Wallet: " + (err?.message || err)); }
    } else { alert("OKX Wallet belum terpasang!"); }
  }

  async function mintIdentityNFT() {
    setTxHash(""); setMetadataUrl(""); setIpfsHashDisplay("");
    setCekMintLog(""); setStatus(""); setLoading(true);
    
    try {
      if (!session) throw new Error(LANGUAGES[lang].checkGoogle);
      if (!account) throw new Error(LANGUAGES[lang].checkWallet);
      if (!PINATA_JWT) throw new Error("PINATA JWT ENV belum di-set!");

      const providerCheck = new ethers.BrowserProvider(window.ethereum);
      const contractCheck = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, providerCheck);
      const currentBalance = await contractCheck.balanceOf(account);
      if (currentBalance > 0) {
          setMinted(true); setCekMintLog(LANGUAGES[lang].alreadyMinted); setLoading(false);
          throw new Error(LANGUAGES[lang].alreadyMinted); 
      }
      setMinted(false);

      setStatus("🔒 " + LANGUAGES[lang].processing + " (Metadata)");
      const email_hash = SHA256(session.user.email).toString();
      const metadata = { /* ... metadata object ... */ };

      setStatus("📤 " + LANGUAGES[lang].processing + " (Pinata)");
      const res = await fetch("https://api.pinata.cloud/pinning/pinJSONToIPFS", { /* ... */ });
      if (!res.ok) { /* ... (penanganan error Pinata tidak berubah) ... */ 
        let errorData = {}; try { errorData = await res.json(); } catch (e) { /* ignore */ }
        console.error("Pinata API fail:", res.status, errorData);
        throw new Error(`Pinata fail (${res.status}): `+ (errorData.error?.details || JSON.stringify(errorData)));
      }
      const data = await res.json();
      if (!data || typeof data.IpfsHash !== 'string' || data.IpfsHash.trim() === '') { /* ... */ 
        console.error("Pinata response error: Invalid IpfsHash.", data);
        throw new Error("Pinata fail: Invalid IpfsHash in response.");
      }
      const ipfsActualHash = data.IpfsHash.trim();
      const tokenURI = `https://gateway.pinata.cloud/ipfs/${ipfsActualHash}`;
      setIpfsHashDisplay(ipfsActualHash); setMetadataUrl(tokenURI);

      setStatus("✍️ " + LANGUAGES[lang].processing + " (Signature)");
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const msg = ethers.solidityPackedKeccak256(["address", "bytes32"], [account, "0x" + email_hash]);
      const signature = await window.ethereum.request({ method: "personal_sign", params: [msg, account] });

      setStatus("🟢 " + LANGUAGES[lang].processing + " (Transaksi)");
      const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);
      const tx = await contract.mintIdentity(tokenURI, "0x" + email_hash, signature);
      if (!tx || typeof tx.hash !== 'string' || tx.hash.trim() === '') { /* ... */ 
        console.error("Minting error: Invalid tx hash.", tx);
        throw new Error("Minting fail: Invalid transaction hash.");
      }
      const currentTxHash = tx.hash.trim();
      setTxHash(currentTxHash); 

      setStatus("⏳ " + LANGUAGES[lang].processing + " (Konfirmasi)");
      const receipt = await tx.wait();
      if (!receipt || typeof receipt.status !== 'number' || receipt.status !== 1) { /* ... */ 
        console.error("Minting error: Tx failed on chain.", receipt);
        throw new Error("Minting fail: Tx failed (status: " + (receipt?.status ?? 'unknown') + "). Hash: " + currentTxHash);
      }

      setStatus("✅ " + LANGUAGES[lang].mintSuccess); 
      setMinted(true); setLoading(false); setCekMintLog(""); 
      setNftImg(`https://gateway.pinata.cloud/ipfs/${ipfsActualHash}`);

    } catch (err) {
      console.error("Error in mintIdentityNFT:", err);
      const errorMessage = err.message || String(err);
      setStatus("❌ " + LANGUAGES[lang].mintError + " " + errorMessage);
      setLoading(false);
      if (errorMessage !== LANGUAGES[lang].alreadyMinted) {
          setMinted(false); 
      } else {
          setMinted(true); setCekMintLog(LANGUAGES[lang].alreadyMinted); 
      }
    }
  }

  // --- Logika Tombol Mint (PENYESUAIAN) ---
  const canAttemptMint = session && account && !loading;
  // Kondisi sudah minted: baik dari checkMinted (txHash kosong) atau baru saja sukses mint (txHash ada)
  const isEffectivelyMinted = minted; // 'minted' state kini jadi sumber utama status kepemilikan

  const isMintButtonDisabled = !canAttemptMint || isEffectivelyMinted;

  let mintButtonText = LANGUAGES[lang].mint;
  if (loading) {
    mintButtonText = LANGUAGES[lang].processing;
  } else if (isEffectivelyMinted) {
    mintButtonText = LANGUAGES[lang].minted; 
  }

  return (
    <>
      <div style={{ /* ... background styles ... */ }} />
      {showWalletModal && <WalletModal />}
      <div style={{
        maxWidth: "460px", // PENYESUAIAN
        margin: "2rem auto", 
        padding: "2rem 1.25rem", // PENYESUAIAN
        background: "linear-gradient(120deg,rgba(32,19,57,0.98) 66%,rgba(24,30,47,0.98) 100%), url('https://www.transparenttextures.com/patterns/diamond-upholstery.png') repeat",
        borderRadius: "24px", // PENYESUAIAN
        boxShadow: "0 10px 40px #1a0028bf, 0 1.5px 0 #60eaff40, 0 0 0 6px #a259ff07", // PENYESUAIAN
        color: "#e3eaff", fontFamily: "'Montserrat', 'Orbitron', 'Space Grotesk', Arial, sans-serif",
        border: "2px solid #a259ff2b", // PENYESUAIAN
        position: "relative", zIndex: 2
      }}>
        <div style={{ /* ... glow accent ... */ }} />
        
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          marginBottom: "1.75rem", // PENYESUAIAN
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.8rem" }}> {/* PENYESUAIAN */}
            <img src="https://ik.imagekit.io/5spt6gb2z/IMG_2894.jpeg" alt="Logo Channel" width={48} height={48} // PENYESUAIAN
              style={{
                borderRadius: "50%", border: "2px solid #00ffc3", background: "#1e1b3a",
                boxShadow: "0 1px 15px #00ffc34d", objectFit: "cover"
              }} />
            <h2 style={{
              fontFamily: "'Orbitron', 'Montserrat', Arial, sans-serif", letterSpacing: 1, fontWeight: 700, // PENYESUAIAN
              fontSize: "1.6rem", color: "#fff", // PENYESUAIAN
              textShadow: "0 2px 12px #a259ff73, 0 1px 3px #00ffc340", margin: 0, lineHeight: 1.15
            }}> {LANGUAGES[lang].title} </h2>
          </div>
          <button onClick={toggleLang} style={{
            background: "linear-gradient(90deg,#a259ffcc 40%,#00ffc3cc 100%)", color: "#0A0713", border: "1px solid #00ffc355", // PENYESUAIAN
            borderRadius: 10, padding: "0.4rem 0.9rem", fontWeight: 700, cursor: "pointer", fontSize: "0.85rem", // PENYESUAIAN
            boxShadow: "0 1px 8px #00ffc333", fontFamily: "'Montserrat', Arial, sans-serif"
          }}> {lang === "id" ? "EN" : "ID"} </button>
        </div>

        <div style={{
          textAlign: "center", marginBottom: "1.25rem", fontSize: "0.95rem", color: "#c3b8fd", // PENYESUAIAN
          letterSpacing: 0.4, fontFamily: "'Montserrat', Arial, sans-serif", fontWeight: 600
        }}> {LANGUAGES[lang].network} </div>
        
        <div style={{ display: "flex", justifyContent: "center", marginBottom: "1.75rem" }}> {/* PENYESUAIAN */}
          <div style={{
            borderRadius: 20, boxShadow: "0 0 25px 4px #a259ff2e, 0 3px 15px #00ffc33b", // PENYESUAIAN
            border: "2.5px solid #00ffc3", padding: "0.4rem", // PENYESUAIAN
            background: "linear-gradient(120deg, #2a1449cc 70%, #a259ff22 100%)" // PENYESUAIAN
          }}>
            <img src={nftImg} alt="NFT Preview" style={{
                width: 170, height: 170, borderRadius: 14, objectFit: "cover", // PENYESUAIAN
                display: "block", boxShadow: "0 3px 20px #a259ff14" // PENYESUAIAN
              }} />
          </div>
        </div>

        <div style={{ marginBottom: "1.25rem", textAlign: "center" }}> {/* PENYESUAIAN */}
          {session ? (<GoogleProfile user={session.user} />) : (
            <button onClick={() => signIn("google")} style={{
              ...btnStyle("linear-gradient(90deg,#a259ff 0%,#00ffc3 100%)"), color: "#191d2e",
              borderRadius: 10, fontSize: "1.05rem", fontWeight: 800, width: "100%", padding: "0.7rem", // PENYESUAIAN
              boxShadow: "0 2px 12px #00ffc333", fontFamily: "'Montserrat', Arial, sans-serif"
            }}> {LANGUAGES[lang].login} </button>
          )}
        </div>

        {account && (
          <div style={{
            margin: "0 auto 1.25rem auto", textAlign: "center", display: "flex", 
            flexDirection: "column", alignItems: "center", gap: "0.6rem", maxWidth: "90%" // PENYESUAIAN
          }}>
            <div style={{
              background: "linear-gradient(90deg,#231e40b3 70%,#a259ff1a 100%)", borderRadius: 8, // PENYESUAIAN
              padding: "0.45rem 0.9rem", fontSize: "0.9rem", fontFamily: "'Orbitron', 'Montserrat', Arial, sans-serif", // PENYESUAIAN
              fontWeight: 700, color: "#c3b8fd", border: "1px solid #00ffc3aa", // PENYESUAIAN
              boxShadow: "0 1px 4px #a259ff1a", width: "100%", maxWidth: 280, wordBreak: "break-all" // PENYESUAIAN
            }}> {`${LANGUAGES[lang].wallet}: ${shortAddr(account)}`} </div>
            <button onClick={disconnectWallet} style={{
                ...btnStyle("#232837cc"), fontSize: "0.85rem", borderRadius: 8, color: "#fff", // PENYESUAIAN
                fontWeight: 600, border: "1px solid #a259ff2b", padding: "0.45rem 0.9rem", width: "fit-content" // PENYESUAIAN
              }}> {LANGUAGES[lang].disconnect} </button>
          </div>
        )}
        
        {/* PENYESUAIAN LAYOUT: cekMintLog (pesan "already minted" saat load) */}
        {cekMintLog && !status && !loading && ( 
            <div style={{
              background: "rgba(0, 255, 195, 0.05)", 
              color: "#00ffc3",
              padding: "0.7rem 1rem", borderRadius: 10, 
              marginBottom: "1rem", 
              fontWeight: 600, fontSize: "0.9rem", textAlign: "center", 
              fontFamily: "'Montserrat', Arial, sans-serif",
              border: "1px solid #00ffc34d" 
            }}>
              {cekMintLog}
            </div>
        )}

        <div style={{ textAlign: "center", marginTop: "0.25rem" }}> {/* PENYESUAIAN */}
          <button
            onClick={mintIdentityNFT}
            disabled={isMintButtonDisabled}
            style={{
              ...btnStyle("linear-gradient(90deg,#00ffc3 0%,#a259ff 100%)"),
              color: "#1b2130", fontWeight: 800, 
              margin: "0.25rem 0 1rem 0", // PENYESUAIAN
              opacity: isMintButtonDisabled ? 0.55 : 1, // PENYESUAIAN
              cursor: isMintButtonDisabled ? "not-allowed" : "pointer",
              boxShadow: "0 2px 12px #00ffc533", 
              fontSize: "1.1rem", width: "100%", // PENYESUAIAN
              padding: "0.75rem", // PENYESUAIAN
              borderRadius: 10, fontFamily: "'Orbitron', 'Montserrat', Arial, sans-serif"
            }}>
            {mintButtonText}
          </button>
        </div>
        
        {/* PENYESUAIAN LAYOUT: Pesan Status Utama dari Operasi Mint (jika bukan sukses yang akan ditampilkan di blok info) */}
        {status && !status.startsWith("✅") && ( // Hanya tampilkan status jika BUKAN sukses yang akan ada di blok info
            <div style={{
            margin: "1.25rem 0 0.75rem 0", minHeight: "1.8rem", fontSize: "0.95rem", fontWeight: 700, // PENYESUAIAN
            textAlign: "center",
            color: status.startsWith("❌") ? "#f88" : "#a259ff", // Warna untuk error atau processing
            fontFamily: "'Montserrat', Arial, sans-serif", 
            }}>
            {status}
            </div>
        )}
        
        {/* Blok untuk menampilkan TX HASH dan IPFS HASH */}
        { ( (txHash && ipfsHashDisplay && status.startsWith("✅")) || (minted && ipfsHashDisplay && !txHash && !loading && !status && !cekMintLog.includes(LANGUAGES[lang].mintError)) ) && ( 
          <div style={{ 
            marginTop: '1.25rem', padding: '1rem', // PENYESUAIAN
            background: "rgba(0, 255, 195, 0.06)", border: "1.5px solid #00ffc399", // PENYESUAIAN
            borderRadius: '10px', textAlign: 'left', fontSize: '0.85rem', // PENYESUAIAN
            fontFamily: "'Montserrat', Arial, sans-serif",
            boxShadow: "0 1px 8px rgba(0, 255, 195, 0.2)", color: "#e3eaff" // PENYESUAIAN
          }}>
            {status.startsWith("✅") && txHash && ( 
                 <div style={{ color: "#00ffc3", fontWeight: 'bold', fontSize: '0.95rem', marginBottom: '0.7rem', textAlign: 'center' }}> {/* PENYESUAIAN */}
                    {LANGUAGES[lang].mintSuccess}
                 </div>
            )}
            {txHash && ( 
                <div style={{ marginBottom: ipfsHashDisplay ? '0.7rem' : '0px' }}> {/* PENYESUAIAN */}
                <span style={{ fontWeight: 'bold', color: '#e3eaff', fontSize: '0.9rem' }}>{LANGUAGES[lang].txHashLabel} </span> {/* PENYESUAIAN */}
                <a href={`${EXPLORER_BASE}${txHash}`} target="_blank" rel="noopener noreferrer" style={{ color: '#00ffc3', textDecoration: 'underline', wordBreak: 'break-all', display: 'block', marginTop:'2px', fontSize: '0.8rem' }}> {/* PENYESUAIAN */}
                    {txHash}
                </a>
                <a href={`${EXPLORER_BASE}${txHash}`} target="_blank" rel="noopener noreferrer" style={{ color: '#7cb8f9', textDecoration: 'underline', fontSize: '0.75rem', display: 'inline-block', marginTop: '3px' }}> {/* PENYESUAIAN */}
                    ({LANGUAGES[lang].viewOnExplorer})
                </a>
                </div>
            )}
            {ipfsHashDisplay && metadataUrl && ( 
                <div>
                <span style={{ fontWeight: 'bold', color: '#e3eaff', fontSize: '0.9rem' }}>{LANGUAGES[lang].ipfsHashLabel} </span> {/* PENYESUAIAN */}
                <a href={metadataUrl} target="_blank" rel="noopener noreferrer" style={{ color: '#00ffc3', textDecoration: 'underline', wordBreak: 'break-all', display: 'block', marginTop:'2px', fontSize: '0.8rem' }}> {/* PENYESUAIAN */}
                    {ipfsHashDisplay}
                </a>
                <a href={metadataUrl} target="_blank" rel="noopener noreferrer" style={{ color: '#7cb8f9', textDecoration: 'underline', fontSize: '0.75rem', display: 'inline-block', marginTop: '3px' }}> {/* PENYESUAIAN */}
                    ({LANGUAGES[lang].explorer})
                </a>
                </div>
            )}
          </div>
        ) }

        <div style={{ marginTop: "2.5rem", display: "flex", flexDirection: "column", alignItems: "center" }}> {/* PENYESUAIAN */}
          <div style={{
            display: "flex", alignItems: "center",
            background: "linear-gradient(90deg,#191d2ecc 60%,#a259ff26 100%)", // PENYESUAIAN
            padding: "1rem 1.5rem", borderRadius: 16, boxShadow: "0 2px 18px #a259ff33", // PENYESUAIAN
            border: "1.5px solid #00ffc340", maxWidth: "calc(100% - 2rem)", gap: "1rem" // PENYESUAIAN
          }}>
            <img src="https://cdn-icons-png.flaticon.com/512/2111/2111646.png" alt="Telegram" width={38} height={38} // PENYESUAIAN
              style={{ borderRadius: 8, marginRight: "0.5rem", background: "#fff" }} /> {/* PENYESUAIAN */}
            <div>
              <div style={{
                color: "#00ffc3", fontSize: "0.95rem", fontWeight: 800, marginBottom: "0.1rem", // PENYESUAIAN
                letterSpacing: 0.1, fontFamily: "'Orbitron', 'Montserrat', Arial, sans-serif"
              }}> Join Our Official Airdrop Channel </div>
              <a href="https://t.me/airdrop4ll" target="_blank" rel="noopener noreferrer"
                style={{
                  fontWeight: 800, fontSize: "1rem", letterSpacing: 0.2, // PENYESUAIAN
                  textDecoration: "none", display: "flex", alignItems: "center", gap: 6,
                  marginTop: "2px", fontFamily: "'Orbitron', 'Montserrat', Arial, sans-serif"
                }}>
                <span style={{
                  background: "linear-gradient(90deg,#00ffc3 20%,#a259ff 80%)",
                  WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
                  fontWeight: 800, fontSize: "1.05rem" // PENYESUAIAN
                }}> t.me/airdrop4ll </span>
                <svg xmlns="http://www.w3.org/2000/svg" height="16" width="16" viewBox="0 0 24 24" fill="#7cb8f9"> {/* PENYESUAIAN */}
                  <path d="M5 12h14M12 5l7 7-7 7" stroke="#7cb8f9" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </a>
            </div>
          </div>
        </div>
        <div style={{
          marginTop: "1.25rem", textAlign: "center", fontSize: "0.85rem", color: "#a3a6c6", // PENYESUAIAN
          letterSpacing: 0.15, fontWeight: 600, fontFamily: "'Montserrat', Arial, sans-serif"
        }}>
          {LANGUAGES[lang].powered} <span style={{ color: "#00ffc3", fontWeight: 800 }}>AFA Community x RISECHAIN</span> {/* PENYESUAIAN */}
        </div>
      </div>
    </>
  );
}

// ... (WalletModal dan GoogleProfile tidak diubah karena fokus pada layout utama) ...

function WalletModal() {
    return (
      <div style={{
        position: "fixed", top: 0, left: 0, width: "100vw", height: "100vh",
        background: "rgba(0,0,0,0.32)", display: "flex", alignItems: "center", justifyContent: "center",
        zIndex: 9999
      }}>
        <div style={{
          background: "rgba(37,31,61,0.97)",
          borderRadius: 22,
          padding: 40,
          minWidth: 320,
          boxShadow: "0 6px 32px 0 #a259ff44, 0 0px 1px #00ffc344",
          border: "2.2px solid #a259ff33",
          backdropFilter: "blur(6px)"
        }}>
          <h3 style={{
            color: "#00ffc3",
            marginBottom: 22,
            textAlign: "center",
            fontSize: 21,
            fontWeight: 800,
            letterSpacing: 1,
            fontFamily: "'Orbitron', 'Montserrat', Arial, sans-serif"
          }}>Pilih Wallet</h3>
          <button onClick={connectMetamask} style={{
            ...btnStyle("linear-gradient(90deg,#f6851b,#ffb86c)"),
            width: "100%", marginBottom: 15, fontSize: 17, display: "flex", alignItems: "center", justifyContent: "center", gap: 10
          }}>
            <img src="https://raw.githubusercontent.com/MetaMask/brand-resources/master/SVG/metamask-fox.svg"
              alt="Metamask" width={25} style={{ verticalAlign: "middle" }} />
            Metamask
          </button>
          <button onClick={connectOKXWallet} style={{
            ...btnStyle("linear-gradient(90deg,#1c60ff,#7cb8f9)"),
            width: "100%", fontSize: 17, display: "flex", alignItems: "center", justifyContent: "center", gap: 10
          }}>
            <img src="https://static.okx.com/cdn/wallet/logo/okx-wallet-icon.png"
              alt="OKX Wallet" width={25} style={{ verticalAlign: "middle", background: "#fff", borderRadius: 3 }} />
            OKX Wallet
          </button>
          <button onClick={() => setShowWalletModal(false)} style={{
            ...btnStyle("#444"), width: "100%", marginTop: 15, fontSize: 15
          }}>Batal</button>
        </div>
      </div>
    );
  }

function GoogleProfile({ user }) {
    return (
      <div
        style={{
          display: "flex", alignItems: "center", justifyContent: "center",
          // marginBottom: 20, // Dihapus karena sudah diatur oleh parent
        }}
      >
        <div style={{
          display: "flex", alignItems: "center", gap: "1rem", // PENYESUAIAN
          background: "rgba(35,29,47,0.96)",
          padding: "1rem 1.25rem", // PENYESUAIAN
          borderRadius: 18, // PENYESUAIAN
          boxShadow: "0 2px 15px #00ffc240, 0 1px 8px #a259ff26", // PENYESUAIAN
          border: "1.5px solid #232837aa", // PENYESUAIAN
          minWidth: "auto", // PENYESUAIAN
          width: "100%", // PENYESUAIAN
          maxWidth: 320, // PENYESUAIAN
          position: "relative",
          filter: "drop-shadow(0 1px 7px #a259ff2b)" // PENYESUAIAN
        }}>
          <div style={{
            borderRadius: "50%", border: "2.5px solid #00ffc3", background: "#fff", // PENYESUAIAN
            width: 48, height: 48, display: "flex", alignItems: "center", justifyContent: "center", // PENYESUAIAN
            overflow: "hidden", boxShadow: "0 1px 10px #00ffc31a", // PENYESUAIAN
            flexShrink: 0
          }}>
            <img src={user.image} alt="avatar"
              style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          </div>
          <div style={{ flex: 1, textAlign: 'left' }}> {/* PENYESUAIAN */}
            <div style={{
              fontWeight: 700, fontSize: "1.05rem", color: "#00ffc3", // PENYESUAIAN
              letterSpacing: 0.8, fontFamily: "'Orbitron', 'Montserrat', Arial, sans-serif", // PENYESUAIAN
              marginBottom: "0.1rem" // PENYESUAIAN
            }}>
              {user.name}
            </div>
            {!account && (
              <button
                onClick={() => setShowWalletModal(true)}
                style={{
                  ...btnStyle("linear-gradient(90deg,#1976d2aa,#00ffc3aa)"), // PENYESUAIAN
                  borderRadius: 6, fontSize: "0.85rem", fontWeight: 700, // PENYESUAIAN
                  marginTop: "0.3rem", width: "fit-content", padding: "0.3rem 0.8rem" // PENYESUAIAN
                }}
              > {LANGUAGES[lang].connect} </button>
            )}
          </div>
          <button // PENYESUAIAN: Memindahkan tombol logout ke sini agar lebih terintegrasi
            onClick={() => signOut()}
            style={{
              background: "#252d34cc", color: "#f88", padding: "0.2rem 0.7rem", // PENYESUAIAN
              border: "1px solid #f8855", borderRadius: 6, fontWeight: 600, fontSize: "0.8rem", // PENYESUAIAN
              cursor: "pointer", boxShadow: "0 1px 5px #00000033", 
              fontFamily: "'Montserrat', Arial, sans-serif", alignSelf: 'flex-start' // PENYESUAIAN
            }} title="Logout Google"
          > Logout </button>
        </div>
      </div>
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
    // Default padding, fontSize, dll. bisa di-override oleh style spesifik tombol
    padding: "0.6rem 1.25rem", 
    border: "none",
    borderRadius: "10px", 
    fontWeight: 700, // Diubah agar tidak terlalu tebal secara default
    fontSize: "1rem", 
    cursor: "pointer",
    margin: "0", // Default margin 0, diatur per tombol
    transition: "all 0.23s",
    boxShadow: "0 1px 8px #a259ff2b" // Default shadow lebih lembut
  };
}
