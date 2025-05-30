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
    minted: "Sudah Minted", // Digunakan jika user sudah punya NFT (dari checkMinted)
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
    minted: "Already Minted", // Used if user already has an NFT (from checkMinted)
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
  const [minted, setMinted] = useState(false); // True jika user sudah memiliki NFT (dari checkMinted atau mint baru)
  const [txHash, setTxHash] = useState("");     // Hash transaksi dari mint baru
  const [metadataUrl, setMetadataUrl] = useState("");
  const [ipfsHashDisplay, setIpfsHashDisplay] = useState("");
  const [loading, setLoading] = useState(false); // True selama proses minting
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
      // Reset pesan dan gambar, tapi jangan reset 'minted' jika belum ada akun
      if (account) {
        setCekMintLog("");
        setNftImg(NFT_IMAGE);
        // Jangan reset txHash & ipfsHashDisplay di sini, agar info mint baru tetap ada
      } else {
        setMinted(false); // Pastikan minted false jika tidak ada akun
        return;
      }

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

          if (tokenId !== null) { // Periksa tokenId bukan null
            const tokenUri = await contract.tokenURI(tokenId);
            setMetadataUrl(tokenUri);
            if (tokenUri && tokenUri.includes("/ipfs/")) {
              const hashPart = tokenUri.split('/ipfs/')[1];
              if (hashPart) setIpfsHashDisplay(hashPart);
            }
            try {
              if (tokenUri) { // Hanya fetch jika tokenUri ada
                const meta = await fetch(tokenUri).then(res => res.json());
                setNftImg(meta.image || NFT_IMAGE);
              }
            } catch (e) {
              console.warn("Gagal fetch metadata dari tokenUri yang ada:", e);
              setNftImg(NFT_IMAGE);
            }
          }
          setCekMintLog(LANGUAGES[lang].alreadyMinted);
          setMinted(true); // User sudah punya NFT
          // Hapus alert: alert(LANGUAGES[lang].alreadyMinted);
        } else {
          // Jika balance 0, pastikan minted false, kecuali jika txHash baru saja di-set dari mint baru
          if (!txHash) { // Hanya set minted ke false jika tidak ada txHash dari mint baru
             setMinted(false);
          }
          setCekMintLog("");
          setNftImg(NFT_IMAGE);
        }
      } catch (err) {
        console.error("Gagal cek status mint:", err);
        setCekMintLog(LANGUAGES[lang].mintError + " (cek status): " + (err?.message || String(err)));
        if (!txHash) { // Hanya set minted ke false jika tidak ada txHash dari mint baru
            setMinted(false);
        }
      }
    }
    if (account) { // Hanya jalankan checkMinted jika ada akun
        checkMinted();
    } else { // Jika tidak ada akun, pastikan state relevan direset
        setMinted(false);
        setCekMintLog("");
        // txHash dan ipfsHashDisplay sebaiknya tidak direset di sini agar info mint sebelumnya bisa tampil jika user re-login tanpa disconnect
    }
    // eslint-disable-next-line
  }, [account, lang]); // Jangan tambahkan txHash di dependency array checkMinted

  async function connectMetamask() {
    // ... (kode koneksi Metamask tidak berubah)
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
        if (switchError.code === 4902) {
          try {
            await window.ethereum.request({
              method: "wallet_addEthereumChain",
              params: [{
                chainId: "0xaa2b9b",
                chainName: "RISE Testnet",
                rpcUrls: ["https://rpc.testnet.riselabs.xyz"],
                nativeCurrency: {
                  name: "Ethereum",
                  symbol: "ETH",
                  decimals: 18
                },
                blockExplorerUrls: ["https://explorer.testnet.riselabs.xyz"]
              }]
            });
            const [addr] = await window.ethereum.request({ method: "eth_requestAccounts" });
            setAccount(addr);
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
    // ... (kode koneksi OKX Wallet tidak berubah)
    if (window.okxwallet) {
      try {
        await window.okxwallet.request({
          method: "wallet_switchEthereumChain",
          params: [{ chainId: "0xaa2b9b" }]
        });
        const [addr] = await window.okxwallet.request({ method: "eth_requestAccounts" });
        setAccount(addr);
        setShowWalletModal(false);
      } catch (err) {
        alert("Gagal konek OKX Wallet: " + (err?.message || err));
      }
    } else {
      alert("OKX Wallet belum terpasang di browser Anda!");
    }
  }

  async function mintIdentityNFT() {
    // Reset states untuk proses mint baru
    setTxHash("");
    setMetadataUrl("");
    setIpfsHashDisplay("");
    setCekMintLog(""); // Hapus pesan cek mint sebelumnya
    setStatus("");     // Hapus status sebelumnya
    setLoading(true);
    // setMinted(false) di sini bisa menyebabkan UI 'berkedip' jika checkMinted sudah menetapkannya true.
    // Biarkan checkMinted yang mengatur 'minted' berdasarkan balance,
    // dan logika tombol akan menangani apakah user bisa mint lagi atau tidak.

    try {
      if (!session) throw new Error(LANGUAGES[lang].checkGoogle);
      if (!account) throw new Error(LANGUAGES[lang].checkWallet);
      if (!PINATA_JWT) throw new Error("PINATA JWT ENV belum di-set! Hubungi admin.");

      // Periksa lagi apakah sudah minted sebelum memulai proses mahal
      const providerCheck = new ethers.BrowserProvider(window.ethereum);
      const contractCheck = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, providerCheck);
      const currentBalance = await contractCheck.balanceOf(account);
      if (currentBalance > 0) {
          setMinted(true); // Set minted true jika balance ada
          setCekMintLog(LANGUAGES[lang].alreadyMinted);
          setStatus(""); // Hapus status processing
          throw new Error(LANGUAGES[lang].alreadyMinted); // Hentikan proses jika sudah punya
      }
      setMinted(false); // Jika belum punya, pastikan minted false

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
      const res = await fetch("https://api.pinata.cloud/pinning/pinJSONToIPFS", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${PINATA_JWT.replace(/^Bearer\s+/i, "")}`
        },
        body: JSON.stringify(metadata)
      });

      if (!res.ok) {
        let errorData = {};
        try { errorData = await res.json(); } catch (e) { /* abaikan jika bukan JSON */ }
        console.error("Pinata API request failed:", res.status, res.statusText, errorData);
        throw new Error(`Upload ke Pinata gagal: ${res.status} ${res.statusText}. ` + (errorData.error?.details || errorData.error || JSON.stringify(errorData) || res.statusText));
      }

      const data = await res.json();
      if (!data || typeof data.IpfsHash !== 'string' || data.IpfsHash.trim() === '') {
        console.error("Pinata response error: IpfsHash tidak valid atau tidak ada.", data);
        throw new Error("Upload ke Pinata gagal: Respons Pinata tidak mengandung IpfsHash yang valid. Detail: " + JSON.stringify(data));
      }
      const ipfsActualHash = data.IpfsHash.trim();
      
      const tokenURI = `https://gateway.pinata.cloud/ipfs/${ipfsActualHash}`;
      
      // Simpan sementara sebelum transaksi, agar jika tx gagal, user masih bisa lihat IPFS hashnya
      setIpfsHashDisplay(ipfsActualHash); 
      setMetadataUrl(tokenURI);


      setStatus("✍️ " + LANGUAGES[lang].processing + " (Signature)");
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

      setStatus("🟢 " + LANGUAGES[lang].processing + " (Transaksi)");
      const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);
      const tx = await contract.mintIdentity(tokenURI, "0x" + email_hash, signature);

      if (!tx || typeof tx.hash !== 'string' || tx.hash.trim() === '') {
        console.error("Minting error: Hash transaksi tidak valid atau tidak ada dari objek 'tx'.", tx);
        // Meskipun IPFS sudah di-set, transaksi gagal mendapatkan hash.
        // setIpfsHashDisplay dan setMetadataUrl sudah di-set, biarkan user melihatnya.
        throw new Error("Minting gagal: Tidak mendapatkan hash transaksi yang valid dari provider.");
      }
      const currentTxHash = tx.hash.trim();
      setTxHash(currentTxHash); // Set txHash segera setelah didapatkan

      setStatus("⏳ " + LANGUAGES[lang].processing + " (Konfirmasi)");
      const receipt = await tx.wait();

      if (!receipt || typeof receipt.status !== 'number' || receipt.status !== 1) {
        console.error("Minting error: Transaksi gagal di blockchain setelah konfirmasi.", receipt);
         // txHash sudah di-set, biarkan user melihatnya untuk investigasi manual.
        throw new Error("Minting gagal: Transaksi tidak berhasil di blockchain (status receipt: " + (receipt ? receipt.status : 'unknown') + "). Cek explorer dengan hash: " + currentTxHash);
      }

      // Semua langkah berhasil
      setStatus("✅ " + LANGUAGES[lang].mintSuccess);
      // txHash, ipfsHashDisplay, metadataUrl sudah di-set
      setMinted(true); // Minting baru berhasil
      setLoading(false);
      setCekMintLog(LANGUAGES[lang].mintSuccess);
      // Tidak perlu alert, pesan sudah ada di UI

    } catch (err) {
      console.error("Kesalahan detail dalam mintIdentityNFT:", err);
      setStatus("❌ " + LANGUAGES[lang].mintError + " " + (err?.message || String(err)));
      // txHash, ipfsHashDisplay, metadataUrl mungkin sudah di-set jika error terjadi di tengah jalan, biarkan.
      // Jika error di awal (Pinata gagal total), mereka akan kosong.
      setLoading(false);
      // Jangan set minted ke false jika errornya adalah "already minted"
      if (err.message !== LANGUAGES[lang].alreadyMinted) {
          setMinted(false); 
      }
    }
  }

  function WalletModal() {
    // ... (kode WalletModal tidak berubah)
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
    // ... (kode GoogleProfile tidak berubah)
    return (
      <div
        style={{
          display: "flex", alignItems: "center", justifyContent: "center",
          marginBottom: 20,
        }}
      >
        <div style={{
          display: "flex", alignItems: "center", gap: 18,
          background: "rgba(35,29,47,0.96)",
          padding: "18px 26px",
          borderRadius: 22,
          boxShadow: "0 3px 18px #00ffc255, 0 1px 10px #a259ff30",
          border: "2px solid #232837",
          minWidth: 310,
          maxWidth: 340,
          position: "relative",
          filter: "drop-shadow(0 1px 9px #a259ff33)"
        }}>
          <div style={{
            borderRadius: "50%", border: "3.2px solid #00ffc3", background: "#fff",
            width: 56, height: 56, display: "flex", alignItems: "center", justifyContent: "center",
            overflow: "hidden", boxShadow: "0 2px 14px #00ffc322",
            flexShrink: 0
          }}>
            <img
              src={user.image}
              alt="avatar"
              width={54}
              height={54}
              style={{
                borderRadius: "50%",
                objectFit: "cover",
                width: "100%",
                height: "100%"
              }}
            />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{
              fontWeight: 800,
              fontSize: 19,
              color: "#00ffc3",
              letterSpacing: 1,
              fontFamily: "'Orbitron', 'Montserrat', Arial, sans-serif",
              marginBottom: 3
            }}>
              {user.name}
            </div>
            {!account && (
              <button
                onClick={() => setShowWalletModal(true)}
                style={{
                  ...btnStyle("linear-gradient(90deg,#1976d2,#00ffc3)"),
                  borderRadius: 8,
                  fontSize: 15,
                  fontWeight: 700,
                  marginTop: 10,
                  width: "fit-content"
                }}
              >
                {LANGUAGES[lang].connect}
              </button>
            )}
          </div>
          <div style={{
            display: "flex", flexDirection: "row", gap: 7,
            marginLeft: 12, alignItems: "center", justifyContent: "flex-end"
          }}>
            <button
              onClick={() => signOut()}
              style={{
                background: "#252d34",
                color: "#f88",
                padding: "3px 16px",
                border: "none",
                borderRadius: 8,
                fontWeight: 700,
                fontSize: 13.5,
                cursor: "pointer",
                marginBottom: 0,
                boxShadow: "0 1px 7px #0002",
                fontFamily: "'Montserrat', Arial, sans-serif",
                transition: "all .16s"
              }}
              title="Logout Google"
            >Logout</button>
          </div>
        </div>
      </div>
    );
  }

  // Logika Tombol Mint
  // isMintButtonDisabled: Tombol disabled jika:
  // 1. Belum login Google atau connect wallet
  // 2. Sedang loading
  // 3. Sudah minted (berdasarkan checkMinted atau mint baru yang berhasil DAN txHash ada)
  //    DAN tidak ada txHash dari mint baru (artinya 'minted' dari checkMinted)
  const isAlreadyMintedOnLoad = minted && !txHash && !loading;
  const isMintButtonDisabled = !session || !account || loading || isAlreadyMintedOnLoad;
  
  let mintButtonText = LANGUAGES[lang].mint;
  if (loading) {
    mintButtonText = LANGUAGES[lang].processing;
  } else if (isAlreadyMintedOnLoad) {
    mintButtonText = LANGUAGES[lang].minted;
  } else if (minted && txHash) { // Baru saja mint berhasil di sesi ini
    mintButtonText = LANGUAGES[lang].mintSuccess; // Atau bisa juga "Mint Lagi?" jika diizinkan, atau "Sudah Minted"
  }


  return (
    <>
      {/* --- Background Textures & Neon Glows --- */}
      {/* ... (kode background tidak berubah) ... */}
      <div style={{
        background:
          "linear-gradient(120deg,#1c1137 50%,#24134a 100%), url('https://www.transparenttextures.com/patterns/diamond-upholstery.png') repeat",
        minHeight: "100vh",
        minWidth: "100vw",
        position: "fixed",
        top: 0,
        left: 0,
        zIndex: 0
      }} />

      {showWalletModal && <WalletModal />}
      <div
        style={{
          maxWidth: 480,
          margin: "38px auto",
          padding: "36px 24px 32px 24px",
          background:
            "linear-gradient(120deg,rgba(32,19,57,0.98) 66%,rgba(24,30,47,0.98) 100%), url('https://www.transparenttextures.com/patterns/diamond-upholstery.png') repeat",
          borderRadius: 30,
          boxShadow: "0 12px 52px #1a0028cc, 0 1.5px 0 #60eaff55, 0 0 0 8px #a259ff09",
          color: "#e3eaff",
          fontFamily: "'Montserrat', 'Orbitron', 'Space Grotesk', Arial, sans-serif",
          border: "2.1px solid #a259ff33",
          position: "relative",
          overflow: "visible",
          zIndex: 2
        }}
      >
        {/* Glow accent */}
        {/* ... (kode glow accent tidak berubah) ... */}
        <div style={{
          position: "absolute",
          top: -90, left: -90,
          width: 230,
          height: 230,
          background: "radial-gradient(closest-side,#00ffc2cc 0%,#a259ff11 100%)",
          filter: "blur(45px)",
          zIndex: 0,
          pointerEvents: "none"
        }} />
        {/* HEADER */}
        {/* ... (kode header tidak berubah) ... */}
        <div style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 20,
          zIndex: 1,
          position: "relative"
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
            <img
              src="https://ik.imagekit.io/5spt6gb2z/IMG_2894.jpeg"
              alt="Logo Channel"
              width={56}
              height={56}
              style={{
                borderRadius: "50%",
                border: "2.5px solid #00ffc3",
                background: "#1e1b3a",
                boxShadow: "0 2px 20px #00ffc355",
                objectFit: "cover"
              }}
            />
            <h2 style={{
              fontFamily: "'Orbitron', 'Montserrat', Arial, sans-serif",
              letterSpacing: 1.6,
              fontWeight: 900,
              fontSize: 34,
              color: "#fff",
              textShadow: "0 2px 20px #a259ff88, 0 1px 6px #00ffc355",
              margin: 0,
              lineHeight: 1.08
            }}>
              {LANGUAGES[lang].title}
            </h2>
          </div>
          <button onClick={toggleLang} style={{
            background: "linear-gradient(90deg,#a259ff 40%,#00ffc3 100%)",
            color: "#191d2e",
            border: "none",
            borderRadius: 15,
            padding: "7px 20px",
            fontWeight: 900,
            cursor: "pointer",
            fontSize: 16,
            boxShadow: "0 2px 12px #00ffc344",
            fontFamily: "'Montserrat', Arial, sans-serif"
          }}>
            {lang === "id" ? "English" : "Bahasa"}
          </button>
        </div>
        {/* ... (sisa UI tidak berubah signifikan kecuali tombol mint dan blok hasil) ... */}
        <div style={{
          textAlign: "center",
          marginBottom: 21,
          fontSize: 18,
          color: "#c3b8fd",
          letterSpacing: 0.8,
          fontFamily: "'Montserrat', Arial, sans-serif",
          fontWeight: 700
        }}>
          {LANGUAGES[lang].network}
        </div>
        <div style={{
          display: "flex",
          justifyContent: "center",
          marginBottom: 34
        }}>
          <div style={{
            borderRadius: 26,
            boxShadow: "0 0 38px 7px #a259ff44, 0 6px 22px #00ffc355",
            border: "4px solid #00ffc3",
            padding: 7,
            background: "linear-gradient(120deg, #2a1449 70%, #a259ff33 100%)"
          }}>
            <img
              src={nftImg}
              alt="NFT Preview"
              style={{
                width: 210,
                height: 210,
                borderRadius: 18,
                objectFit: "cover",
                display: "block",
                boxShadow: "0 4px 32px #a259ff22"
              }}
            />
          </div>
        </div>
        <div style={{
          marginBottom: 28,
          textAlign: "center",
          fontWeight: 800,
          fontSize: 19,
          fontFamily: "'Montserrat', Arial, sans-serif"
        }}>
          {session ? (
            <GoogleProfile user={session.user} />
          ) : (
            <button onClick={() => signIn("google")} style={{
              ...btnStyle("linear-gradient(90deg,#a259ff 0%,#00ffc3 100%)"),
              color: "#191d2e",
              borderRadius: 13,
              fontSize: 18,
              fontWeight: 900,
              width: "100%",
              boxShadow: "0 2px 18px #00ffc344",
              fontFamily: "'Montserrat', Arial, sans-serif"
            }}>
              {LANGUAGES[lang].login}
            </button>
          )}
        </div>
        {account && (
          <div style={{
            margin: "0 0 24px 0",
            textAlign: "center",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            gap: 14
          }}>
            <div style={{
              background: "linear-gradient(90deg,#231e40 70%,#a259ff22 100%)",
              borderRadius: 10,
              padding: "8px 18px",
              fontSize: 17,
              fontFamily: "'Orbitron', 'Montserrat', Arial, sans-serif",
              fontWeight: 800,
              color: "#c3b8fd",
              border: "1.5px solid #00ffc3",
              boxShadow: "0 1px 7px #a259ff33"
            }}>
              {`${LANGUAGES[lang].wallet}: ${shortAddr(account)}`}
            </div>
            <button
              onClick={disconnectWallet}
              style={{
                ...btnStyle("#232837"),
                fontSize: 15,
                borderRadius: 10,
                color: "#fff",
                fontWeight: 700,
                border: "1.5px solid #a259ff44"
              }}
            >
              {LANGUAGES[lang].disconnect}
            </button>
          </div>
        )}

        <div style={{ textAlign: "center", marginTop: 10 }}>
          <button
            onClick={mintIdentityNFT}
            disabled={isMintButtonDisabled}
            style={{
              ...btnStyle("linear-gradient(90deg,#00ffc3 0%,#a259ff 100%)"),
              color: "#1b2130",
              fontWeight: 900,
              margin: "7px 0 22px 0",
              opacity: isMintButtonDisabled ? 0.62 : 1,
              cursor: isMintButtonDisabled ? "not-allowed" : "pointer",
              boxShadow: "0 2px 18px #00ffc540",
              fontSize: 19,
              width: "100%",
              borderRadius: 13,
              fontFamily: "'Orbitron', 'Montserrat', Arial, sans-serif"
            }}>
            {mintButtonText}
          </button>
          {cekMintLog && (
            <div style={{
              background: "linear-gradient(93deg,#191d2e 75%,#a259ff22 100%)",
              color: cekMintLog.startsWith(LANGUAGES[lang].alreadyMinted) || cekMintLog.startsWith(LANGUAGES[lang].mintSuccess) ? "#00ffc3" : "#f88", // Warna berbeda untuk error
              padding: "13px 20px",
              borderRadius: 16,
              marginTop: 15,
              fontWeight: 800,
              fontSize: 16.5,
              textAlign: "center",
              letterSpacing: 0.13,
              fontFamily: "'Montserrat', Arial, sans-serif",
              border: "1.7px solid #00ffc3"
            }}>
              {cekMintLog}
            </div>
          )}
        </div>
        <div style={{
          margin: "28px 0 13px 0",
          minHeight: 32,
          fontSize: 16.5,
          fontWeight: 800,
          textAlign: "center",
          color: status.startsWith("❌") ? "#f88" : (status.startsWith("✅") ? "#00ffc3" : "#a259ff"),
          fontFamily: "'Montserrat', Arial, sans-serif",
          textShadow: "0 1px 7px #a259ff33"
        }}>
          {status}
        </div>

        {/* --- BAGIAN BARU UNTUK MENAMPILKAN TX HASH DAN IPFS HASH SETELAH MINT SUKSES --- */}
        {/* Tampil jika mint baru berhasil (ada txHash dan ipfsHashDisplay) ATAU jika sudah pernah mint dan datanya ada (dari checkMinted, ipfsHashDisplay ada) */}
        {((txHash && ipfsHashDisplay) || (!txHash && minted && ipfsHashDisplay)) && ( 
          <div style={{ 
            marginTop: '20px', 
            padding: '15px',
            background: "rgba(0, 255, 195, 0.07)", 
            border: "1.5px solid #00ffc3",
            borderRadius: '12px', 
            textAlign: 'left', 
            fontSize: '15px', 
            fontFamily: "'Montserrat', Arial, sans-serif",
            boxShadow: "0 2px 10px rgba(0, 255, 195, 0.25)",
            color: "#e3eaff"
          }}>
            {txHash && ( /* Hanya tampilkan bagian Tx Hash jika txHash ada (dari mint baru) */
                <div style={{ marginBottom: '12px' }}>
                <span style={{ fontWeight: 'bold', color: '#e3eaff' }}>{LANGUAGES[lang].txHashLabel} </span>
                <a href={`${EXPLORER_BASE}${txHash}`} target="_blank" rel="noopener noreferrer" style={{ color: '#00ffc3', textDecoration: 'underline', wordBreak: 'break-all', display: 'block', marginTop:'3px' }}>
                    {txHash}
                </a>
                <a href={`${EXPLORER_BASE}${txHash}`} target="_blank" rel="noopener noreferrer" style={{ color: '#7cb8f9', textDecoration: 'underline', fontSize: '13px', display: 'inline-block', marginTop: '5px' }}>
                    ({LANGUAGES[lang].viewOnExplorer})
                </a>
                </div>
            )}
            {ipfsHashDisplay && metadataUrl && ( /* Tampilkan bagian IPFS jika datanya ada */
                <div>
                <span style={{ fontWeight: 'bold', color: '#e3eaff' }}>{LANGUAGES[lang].ipfsHashLabel} </span>
                <a href={metadataUrl} target="_blank" rel="noopener noreferrer" style={{ color: '#00ffc3', textDecoration: 'underline', wordBreak: 'break-all', display: 'block', marginTop:'3px' }}>
                    {ipfsHashDisplay}
                </a>
                <a href={metadataUrl} target="_blank" rel="noopener noreferrer" style={{ color: '#7cb8f9', textDecoration: 'underline', fontSize: '13px', display: 'inline-block', marginTop: '5px' }}>
                    ({LANGUAGES[lang].explorer})
                </a>
                </div>
            )}
          </div>
        )}
        {/* --- AKHIR BAGIAN BARU --- */}

        {/* Telegram Channel Card */}
        {/* ... (kode Telegram card tidak berubah) ... */}
        <div style={{
          marginTop: 40,
          display: "flex",
          flexDirection: "column",
          alignItems: "center"
        }}>
          <div style={{
            display: "flex",
            alignItems: "center",
            background: "linear-gradient(90deg,#191d2e 60%,#a259ff33 100%)",
            padding: "18px 32px",
            borderRadius: 20,
            boxShadow: "0 2.5px 22px #a259ff40",
            border: "2px solid #00ffc355",
            maxWidth: 400,
            gap: 17
          }}>
            <img
              src="https://cdn-icons-png.flaticon.com/512/2111/2111646.png"
              alt="Telegram"
              width={42}
              height={42}
              style={{ borderRadius: 10, marginRight: 10, background: "#fff" }}
            />
            <div>
              <div style={{
                color: "#00ffc3",
                fontSize: 17,
                fontWeight: 900,
                marginBottom: 3,
                letterSpacing: 0.13,
                fontFamily: "'Orbitron', 'Montserrat', Arial, sans-serif"
              }}>
                Join Our Official Airdrop Channel
              </div>
              <a
                href="https://t.me/airdrop4ll"
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  color: "#7cb8f9",
                  fontWeight: 900,
                  fontSize: 18,
                  letterSpacing: 0.3,
                  textDecoration: "none",
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  marginTop: 3,
                  fontFamily: "'Orbitron', 'Montserrat', Arial, sans-serif"
                }}
              >
                <span style={{
                  background: "linear-gradient(90deg,#00ffc3 20%,#a259ff 80%)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  fontWeight: 900,
                  fontSize: 19
                }}>
                  t.me/airdrop4ll
                </span>
                <svg xmlns="http://www.w3.org/2000/svg" height="19" width="19" viewBox="0 0 24 24" fill="#7cb8f9">
                  <path d="M5 12h14M12 5l7 7-7 7" stroke="#7cb8f9" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </a>
            </div>
          </div>
        </div>
        <div style={{
          marginTop: 18,
          textAlign: "center",
          fontSize: 15,
          color: "#a3a6c6",
          letterSpacing: 0.22,
          fontWeight: 700,
          fontFamily: "'Montserrat', Arial, sans-serif"
        }}>
          {LANGUAGES[lang].powered} <span style={{ color: "#00ffc3", fontWeight: 900 }}>AFA Community x RISECHAIN</span>
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
// function shortTx(tx) { // Tidak digunakan lagi, menampilkan hash penuh
//   if (!tx) return "";
//   return tx.slice(0, 8) + "..." + tx.slice(-6);
// }
function btnStyle(bg) {
  return {
    background: bg,
    color: "#fff",
    padding: "10px 22px",
    border: "none",
    borderRadius: "11px",
    fontWeight: 800,
    fontSize: 17,
    cursor: "pointer",
    margin: "0 4px 0 0",
    transition: "all 0.23s",
    boxShadow: "0 1px 11px #a259ff33"
  };
}
