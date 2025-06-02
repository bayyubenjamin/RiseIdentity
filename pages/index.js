import { useState, useEffect }_from_ "react";
import { useSession, signIn, signOut } _from_ "next-auth/react";
import { ethers } _from_ "ethers";
import SHA256 _from_ "crypto-js/sha256";

// --- RISE TESTNET CONFIG ---
const PINATA_JWT = process.env.NEXT_PUBLIC_PINATA_JWT;
const CONTRACT_ADDRESS = "0xfF157D2A0e1E25d61EeCf139bEdf6210d187Dc7C";
const CONTRACT_ABI = [
  // ... (ABI Anda tidak berubah)
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
    mintSuccess: "Mint success! You already have NFT Identity.",
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
    // Keterangan dan Manfaat NFT (BARU)
    nftSectionTitle: "Tentang NFT Identitas Ini",
    nftDescription: "NFT Identitas ini adalah token unik yang merepresentasikan partisipasi Anda dalam Komunitas AFA di Rise Testnet. Dibuat khusus untuk anggota komunitas, NFT ini menjadi bukti digital identitas dan keterlibatan Anda.",
    nftBenefitsTitle: "Manfaat Memiliki NFT Ini:",
    nftBenefit1: "✅ Tanda kepesertaan eksklusif dalam acara dan inisiatif komunitas.",
    nftBenefit2: "🎁 Potensi akses ke fitur, airdrop, atau keuntungan khusus di masa depan.",
    nftBenefit3: "✨ Representasi digital unik dari identitas Anda yang terverifikasi di blockchain.",
    nftBenefit4: "🛡️ Meningkatkan keamanan dan kepercayaan dalam interaksi digital.",
    connectedAccountsTitle: "Akun Terhubung:",
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
    // NFT Description and Benefits (NEW)
    nftSectionTitle: "About This Identity NFT",
    nftDescription: "This Identity NFT is a unique token representing your participation in the AFA Community on the Rise Testnet. Created exclusively for community members, this NFT serves as digital proof of your identity and engagement.",
    nftBenefitsTitle: "Benefits of Owning This NFT:",
    nftBenefit1: "✅ Signifies exclusive participation in community events and initiatives.",
    nftBenefit2: "🎁 Potential access to special features, airdrops, or future benefits.",
    nftBenefit3: "✨ A unique, blockchain-verified digital representation of your identity.",
    nftBenefit4: "🛡️ Enhances security and trust in digital interactions.",
    connectedAccountsTitle: "Connected Accounts:",
  }
};

// Asumsi fungsi shortAddr dan btnStyle sudah ada atau akan Anda tambahkan
// Contoh implementasi sederhana jika belum ada:
const shortAddr = (addr) => addr ? `${addr.substring(0, 6)}...${addr.substring(addr.length - 4)}` : "";
const btnStyle = (bg) => ({
  padding: "12px 22px",
  border: "none",
  borderRadius: "10px", // Disesuaikan dengan style lain
  cursor: "pointer",
  fontWeight: "bold",
  fontSize: "16px", // Disesuaikan
  fontFamily: "'Montserrat', Arial, sans-serif",
  background: bg,
  transition: "opacity 0.2s, transform 0.2s",
  boxShadow: "0 2px 8px rgba(0,0,0,0.15)"
});


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
    setMinted(false); // Reset status minted saat disconnect
    setTxHash("");
    setMetadataUrl("");
    setIpfsHashDisplay("");
    setNftImg(NFT_IMAGE); // Reset gambar ke default
    setCekMintLog("");
    setStatus("");
  }

  useEffect(() => {
    async function checkMinted() {
      if (account) {
        setCekMintLog("");
        setNftImg(NFT_IMAGE);
      } else {
        setMinted(false);
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

          if (tokenId !== null) {
            const tokenUri = await contract.tokenURI(tokenId);
            setMetadataUrl(tokenUri);
            if (tokenUri && tokenUri.includes("/ipfs/")) {
              const hashPart = tokenUri.split('/ipfs/')[1];
              if (hashPart) setIpfsHashDisplay(hashPart);
            }
            try {
              if (tokenUri) {
                const meta = await fetch(tokenUri).then(res => res.json());
                setNftImg(meta.image || NFT_IMAGE);
              }
            } catch (e) {
              console.warn("Gagal fetch metadata dari tokenUri yang ada:", e);
              setNftImg(NFT_IMAGE);
            }
          }
          setCekMintLog(LANGUAGES[lang].alreadyMinted);
          setMinted(true);
        } else {
          if (!txHash) {
            setMinted(false);
          }
          setCekMintLog("");
          setNftImg(NFT_IMAGE);
        }
      } catch (err) {
        console.error("Gagal cek status mint:", err);
        setCekMintLog(LANGUAGES[lang].mintError + " (cek status): " + (err?.message || String(err)));
        if (!txHash) {
          setMinted(false);
        }
      }
    }
    if (account) {
      checkMinted();
    } else {
      setMinted(false);
      setCekMintLog("");
      // txHash dan ipfsHashDisplay tidak direset agar info mint sebelumnya bisa tampil jika user re-login wallet tanpa disconnect eksplisit
      // Namun, jika wallet di-disconnect secara eksplisit, disconnectWallet akan menangani reset.
    }
    // eslint-disable-next-line
  }, [account, lang]); // Jangan tambahkan txHash di dependency array checkMinted

  async function connectMetamask() {
    // ... (kode koneksi Metamask tidak berubah)
    if (window.ethereum && window.ethereum.isMetaMask) {
      try {
        await window.ethereum.request({
          method: "wallet_switchEthereumChain",
          params: [{ chainId: "0xaa39db" }]
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
                chainId: "0xaa39db",
                chainName: "RISE Testnet",
                rpcUrls: ["https://testnet.riselabs.xyz"],
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
          params: [{ chainId: "0xaa39db" }]
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
    // ... (kode mintIdentityNFT tidak berubah signifikan, hanya memastikan state di-handle dengan benar)
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
        setCekMintLog(LANGUAGES[lang].alreadyMinted);
        setStatus(""); 
        setLoading(false); // Hentikan loading jika sudah punya
        throw new Error(LANGUAGES[lang].alreadyMinted);
      }
      setMinted(false); 

      setStatus("🔒 " + LANGUAGES[lang].processing + " (Metadata)");
      const email_hash = SHA256(session.user.email).toString();

      const metadata = {
        name: "AFA COMMUNITY x RISE TESTNET IDENTITY",
        description: "Rise Identity NFT for AFA Community",
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
        throw new Error("Minting gagal: Tidak mendapatkan hash transaksi yang valid dari provider.");
      }
      const currentTxHash = tx.hash.trim();
      setTxHash(currentTxHash); 

      setStatus("⏳ " + LANGUAGES[lang].processing + " (Konfirmasi)");
      const receipt = await tx.wait();

      if (!receipt || typeof receipt.status !== 'number' || receipt.status !== 1) {
        console.error("Minting error: Transaksi gagal di blockchain setelah konfirmasi.", receipt);
        throw new Error("Minting gagal: Transaksi tidak berhasil di blockchain (status receipt: " + (receipt ? receipt.status : 'unknown') + "). Cek explorer dengan hash: " + currentTxHash);
      }

      setStatus("✅ " + LANGUAGES[lang].mintSuccess);
      setMinted(true); 
      setLoading(false);
      setCekMintLog(LANGUAGES[lang].mintSuccess);
      // Fetch NFT image from metadata after successful mint
        try {
            const meta = await fetch(tokenURI).then(res => res.json());
            setNftImg(meta.image || NFT_IMAGE);
        } catch(e) {
            console.warn("Gagal fetch metadata setelah mint sukses:", e);
            // nftImg sudah default atau dari checkMinted sebelumnya, jadi tidak perlu set ulang ke NFT_IMAGE di sini
        }

    } catch (err) {
      console.error("Kesalahan detail dalam mintIdentityNFT:", err);
      setStatus("❌ " + LANGUAGES[lang].mintError + " " + (err?.message || String(err)));
      setLoading(false);
      if (err.message !== LANGUAGES[lang].alreadyMinted) {
        // Jangan set minted ke false jika errornya adalah "already minted", karena checkMinted akan menanganinya
        // setMinted(false); // Ini bisa dipertimbangkan ulang, karena checkMinted akan verifikasi lagi.
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
            <img src="https://images.ctfassets.net/clixtyxoaeas/4rnpEzy1ATWRKVBOLxZ1Fm/a74dc1eed36d23d7ea6030383a4d5163/MetaMask-icon-fox.svg"
              alt="Metamask" width={25} style={{ verticalAlign: "middle" }} />
            Metamask
          </button>
          <button onClick={connectOKXWallet} style={{
            ...btnStyle("linear-gradient(90deg,#1c60ff,#7cb8f9)"),
            width: "100%", fontSize: 17, display: "flex", alignItems: "center", justifyContent: "center", gap: 10
          }}>
            <img src="https://developers.moralis.com/wp-content/uploads/web3wiki/47-okx-wallet/645c177c66d302f70d9a863e_OKX-Wallet-Twitter-Logo-300x300.jpeg"
              alt="OKX Wallet" width={25} style={{ verticalAlign: "middle", background: "#fff", borderRadius: 3 }} />
            OKX Wallet
          </button>
          <button onClick={() => setShowWalletModal(false)} style={{
            ...btnStyle("#444"), width: "100%", marginTop: 15, fontSize: 15, color: "#fff"
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
          // marginBottom: 20, // Dihapus karena parent container yang akan mengatur margin
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
          maxWidth: 380, // Lebarkan sedikit jika perlu
          width: '100%', // Agar responsif di dalam container
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
          <div style={{ flex: 1, textAlign: 'left' }}>
            <div style={{
              fontWeight: 800,
              fontSize: 19,
              color: "#00ffc3",
              letterSpacing: 1,
              fontFamily: "'Orbitron', 'Montserrat', Arial, sans-serif",
              marginBottom: 3,
              wordBreak: 'break-word'
            }}>
              {user.name}
            </div>
            <div style={{ fontSize: 13, color: '#b0a8cc', wordBreak: 'break-all' }}>{user.email}</div>
            {!account && (
              <button
                onClick={() => setShowWalletModal(true)}
                style={{
                  ...btnStyle("linear-gradient(90deg,#1976d2,#00ffc3)"),
                  borderRadius: 8,
                  fontSize: 15,
                  fontWeight: 700,
                  marginTop: 10,
                  width: "fit-content",
                  color: "#191d2e" // Pastikan kontras
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
                padding: "6px 16px", // Adjusted padding
                border: "none",
                borderRadius: 8,
                fontWeight: 700,
                fontSize: 13.5,
                cursor: "pointer",
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

  const isAlreadyMintedOnLoad = minted && !txHash && !loading;
  const isMintButtonDisabled = !session || !account || loading || isAlreadyMintedOnLoad;

  let mintButtonText = LANGUAGES[lang].mint;
  if (loading) {
    mintButtonText = LANGUAGES[lang].processing;
  } else if (isAlreadyMintedOnLoad) {
    mintButtonText = LANGUAGES[lang].minted;
  } else if (minted && txHash) {
    mintButtonText = LANGUAGES[lang].mintSuccess;
  }

  return (
    <>
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
          maxWidth: 520, // Sedikit lebih lebar untuk mengakomodasi konten baru
          margin: "38px auto",
          padding: "36px 28px 32px 28px", // Padding disesuaikan
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
          marginBottom: 24 // Adjusted margin
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

        {/* --- KETERANGAN DAN MANFAAT NFT (BARU) --- */}
        <div style={{
          margin: "0 auto 28px auto", // Adjusted margin
          padding: "18px 22px",
          background: "rgba(25, 29, 46, 0.85)",
          border: "1.5px solid #a259ff44",
          borderRadius: "16px",
          textAlign: "left",
          fontSize: "15px",
          fontFamily: "'Montserrat', Arial, sans-serif",
          boxShadow: "0 3px 15px rgba(0, 0, 0, 0.2)",
          color: "#d0c8f0",
          maxWidth: "100%"
        }}>
          <h4 style={{
            color: "#00ffc3",
            fontFamily: "'Orbitron', 'Montserrat', Arial, sans-serif",
            fontSize: "18px",
            letterSpacing: "0.5px",
            margin: "0 0 12px 0",
            textAlign: "center",
            textShadow: "0 1px 3px #00ffc333"
          }}>{LANGUAGES[lang].nftSectionTitle}</h4>
          <p style={{ margin: "0 0 10px 0", lineHeight: 1.6, fontSize: "14.5px" }}>
            {LANGUAGES[lang].nftDescription}
          </p>
          <h5 style={{
            color: "#e0dafc",
            fontFamily: "'Space Grotesk', 'Montserrat', Arial, sans-serif",
            fontSize: "16px",
            margin: "12px 0 8px 0",
            fontWeight: 700,
          }}>{LANGUAGES[lang].nftBenefitsTitle}</h5>
          <ul style={{ listStyleType: "none", paddingLeft: 0, margin: 0, fontSize: "14px" }}>
            <li style={{ marginBottom: "6px", lineHeight: 1.5 }}>{LANGUAGES[lang].nftBenefit1}</li>
            <li style={{ marginBottom: "6px", lineHeight: 1.5 }}>{LANGUAGES[lang].nftBenefit2}</li>
            <li style={{ marginBottom: "6px", lineHeight: 1.5 }}>{LANGUAGES[lang].nftBenefit3}</li>
            <li style={{ marginBottom: "6px", lineHeight: 1.5 }}>{LANGUAGES[lang].nftBenefit4}</li>
          </ul>
        </div>


        {/* --- KOLOM AKUN GOOGLE DAN WALLET TERKONEK (MODIFIKASI) --- */}
        <div style={{
          // Wrapper ini akan menjadi "kolom" untuk info akun dan wallet jika user login
          background: session ? "rgba(30, 25, 50, 0.9)" : "transparent", // Background jika ada sesi
          borderRadius: session ? "20px" : "0",
          padding: session ? "20px 15px" : "0", // Padding jika ada sesi
          border: session ? "1.8px solid #a259ff30" : "none",
          boxShadow: session ? "0 5px 25px rgba(0,0,0,0.25), inset 0 0 10px rgba(42,20,73,0.5)" : "none",
          marginBottom: "28px" // Margin bawah untuk wrapper
        }}>
          {session ? (
            <>
              {/* Judul untuk bagian akun terhubung */}
              <h3 style={{ 
                  color: "#00ffc3", 
                  textAlign: "center", 
                  marginBottom: "15px", 
                  fontFamily: "'Orbitron', sans-serif",
                  fontSize: "20px",
                  letterSpacing: "1px"
              }}>
                  {LANGUAGES[lang].connectedAccountsTitle}
              </h3>
              <GoogleProfile user={session.user} />
              {account && (
                <div style={{
                  marginTop: '20px', // Jarak dari GoogleProfile
                  textAlign: "center",
                  display: "flex",
                  flexDirection: 'column', // Susun vertikal untuk tampilan lebih rapi
                  alignItems: "center",
                  gap: 12 // Jarak antar elemen
                }}>
                  <div style={{
                    background: "linear-gradient(90deg,#231e40 70%,#a259ff22 100%)",
                    borderRadius: 10,
                    padding: "10px 20px",
                    fontSize: 17,
                    fontFamily: "'Orbitron', 'Montserrat', Arial, sans-serif",
                    fontWeight: 800,
                    color: "#c3b8fd",
                    border: "1.5px solid #00ffc3",
                    boxShadow: "0 1px 7px #a259ff33",
                    wordBreak: 'break-all' // Agar alamat wallet tidak overflow
                  }}>
                    {`${LANGUAGES[lang].wallet}: ${shortAddr(account)}`}
                  </div>
                  <button
                    onClick={disconnectWallet}
                    style={{
                      ...btnStyle("rgba(45, 50, 60, 0.8)"), // Style tombol disconnect yang lebih gelap
                      fontSize: 15,
                      borderRadius: 10,
                      color: "#ffcdd2", // Warna teks kemerahan
                      fontWeight: 700,
                      border: "1.5px solid #a259ff44",
                      padding: "8px 20px", // Padding yang konsisten
                      width: "fit-content"
                    }}
                  >
                    {LANGUAGES[lang].disconnect}
                  </button>
                </div>
              )}
            </>
          ) : (
            // Tombol Login Google jika belum ada sesi
            // Style div ini konsisten dengan marginBottom yang ada sebelumnya jika tidak ada sesi
            <div style={{ textAlign: "center", fontWeight: 800, fontSize: 19, fontFamily: "'Montserrat', Arial, sans-serif" }}>
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
            </div>
          )}
        </div>
        
        {/* Tombol Mint dan status messages */}
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
              color: cekMintLog.startsWith(LANGUAGES[lang].alreadyMinted) || cekMintLog.startsWith(LANGUAGES[lang].mintSuccess) ? "#00ffc3" : "#f88",
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
          textShadow: "0 1px 7px #a259ff33",
          wordBreak: 'break-word' // Agar pesan status panjang tidak overflow
        }}>
          {status}
        </div>

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
            {txHash && (
              <div style={{ marginBottom: '12px' }}>
                <span style={{ fontWeight: 'bold', color: '#e3eaff' }}>{LANGUAGES[lang].txHashLabel} </span>
                <a href={`${EXPLORER_BASE}${txHash}`} target="_blank" rel="noopener noreferrer" style={{ color: '#00ffc3', textDecoration: 'underline', wordBreak: 'break-all' }}>
                  {shortAddr(txHash)}
                </a>
                 <a href={`${EXPLORER_BASE}${txHash}`} target="_blank" rel="noopener noreferrer" style={{ marginLeft: "10px", color: '#82e9de', textDecoration: 'none', fontWeight: 'bold' }}>
                  ({LANGUAGES[lang].viewOnExplorer})
                </a>
              </div>
            )}
            {ipfsHashDisplay && (
              <div>
                <span style={{ fontWeight: 'bold', color: '#e3eaff' }}>{LANGUAGES[lang].ipfsHashLabel} </span>
                <a href={metadataUrl} target="_blank" rel="noopener noreferrer" style={{ color: '#00ffc3', textDecoration: 'underline', wordBreak: 'break-all' }}>
                  {shortAddr(ipfsHashDisplay)}
                </a>
                 <a href={metadataUrl} target="_blank" rel="noopener noreferrer" style={{ marginLeft: "10px", color: '#82e9de', textDecoration: 'none', fontWeight: 'bold' }}>
                  ({LANGUAGES[lang].explorer})
                </a>
              </div>
            )}
          </div>
        )}

        <div style={{ textAlign: "center", marginTop: 30, fontSize: 13, color: "#aaa" }}>
            <a href="https://t.me/airdropforalllimit" target="_blank" rel="noopener noreferrer" style={{ color: "#00ffc3", textDecoration: "none", fontWeight: "bold" }}>
                {LANGUAGES[lang].follow}
            </a>
            <p style={{ marginTop: 8, color: "#777" }}>
                {LANGUAGES[lang].powered} <a href="https://riselabs.xyz" target="_blank" rel="noopener noreferrer" style={{ color: "#a259ff", textDecoration: "none", fontWeight: "bold" }}>Rise Labs</a> & AFA Community
            </p>
        </div>
      </div>
    </>
  );
}
