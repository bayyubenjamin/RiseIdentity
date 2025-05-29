import { useState, useEffect } from "react";
import { useSession, signIn, signOut } from "next-auth/react";
import { ethers } from "ethers";
import SHA256 from "crypto-js/sha256";

// --- PHAROS TESTNET CONFIG ---
const PINATA_JWT = process.env.NEXT_PUBLIC_PINATA_JWT || process.env.PINATA_JWT;
const CONTRACT_ADDRESS = "0x4AA7E897aae2A950e4B0E05590A8058478afB493";
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

const NFT_IMAGE = "https://ik.imagekit.io/5spt6gb2z/AFAPHAROS.jpeg";
const EXPLORER_BASE = "https://testnet.pharosscan.xyz/tx/";

// Multi-language dictionary
const LANGUAGES = {
  id: {
    title: "Mint Identity NFT",
    network: "Pharos Testnet",
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
    explorer: "Lihat di IPFS"
  },
  en: {
    title: "Mint Identity NFT",
    network: "Pharos Testnet",
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
    explorer: "View on IPFS"
  }
};

export default function MintIdentity() {
  const { data: session } = useSession();
  const [account, setAccount] = useState("");
  const [status, setStatus] = useState("");
  const [minted, setMinted] = useState(false);
  const [txHash, setTxHash] = useState("");
  const [metadataUrl, setMetadataUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [cekMintLog, setCekMintLog] = useState("");
  const [nftImg, setNftImg] = useState(NFT_IMAGE);
  const [lang, setLang] = useState("id");
  const [showWalletModal, setShowWalletModal] = useState(false);

  function toggleLang() {
    setLang(lang === "id" ? "en" : "id");
  }

  function disconnectWallet() {
    setAccount("");
    setMinted(false);
    setTxHash("");
    setMetadataUrl("");
    setNftImg(NFT_IMAGE);
    setCekMintLog("");
    setStatus("");
  }

  useEffect(() => {
    async function checkMinted() {
      setCekMintLog("");
      setMinted(false);
      setNftImg(NFT_IMAGE);
      if (!account) return;
      try {
        const provider = new ethers.BrowserProvider(window.ethereum);
        const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, provider);
        const bal = await contract.balanceOf(account);
        if (bal > 0) {
          let tokenId;
          try {
            tokenId = await contract.tokenOfOwnerByIndex(account, 0);
          } catch (e) {}
          if (tokenId) {
            const tokenUri = await contract.tokenURI(tokenId);
            setMetadataUrl(tokenUri);
            try {
              const meta = await fetch(tokenUri).then(res => res.json());
              setNftImg(meta.image || NFT_IMAGE);
            } catch(e) {
              setNftImg(NFT_IMAGE);
            }
          }
          setCekMintLog(LANGUAGES[lang].alreadyMinted);
          setMinted(true);
          alert(LANGUAGES[lang].alreadyMinted);
        } else {
          setCekMintLog("");
          setMinted(false);
          setNftImg(NFT_IMAGE);
        }
      } catch (err) {
        setCekMintLog("Gagal cek status mint: " + err.message);
      }
    }
    checkMinted();
    // eslint-disable-next-line
  }, [account, lang]);

  // --- POPUP WALLET CONNECT ---
  async function connectMetamask() {
    setShowWalletModal(false);
    if (window.ethereum && window.ethereum.isMetaMask) {
      try {
        await window.ethereum.request({
          method: "wallet_switchEthereumChain",
          params: [{ chainId: "0xa84f0" }]
        });
      } catch (switchError) {
        if (switchError.code === 4902) {
          await window.ethereum.request({
            method: "wallet_addEthereumChain",
            params: [{
              chainId: "0xa84f0",
              chainName: "Pharos Testnet",
              rpcUrls: ["https://testnet.dplabs-internal.com"],
              nativeCurrency: {
                name: "Pharos",
                symbol: "PHRS",
                decimals: 18
              },
              blockExplorerUrls: ["https://testnet.pharosscan.xyz"]
            }]
          });
        }
      }
      const [addr] = await window.ethereum.request({ method: "eth_requestAccounts" });
      setAccount(addr);
    } else {
      alert("Metamask belum terpasang di browser Anda!");
    }
  }

  async function connectOKXWallet() {
    setShowWalletModal(false);
    if (window.okxwallet) {
      try {
        await window.okxwallet.request({
          method: "wallet_switchEthereumChain",
          params: [{ chainId: "0xa84f0" }]
        });
        const [addr] = await window.okxwallet.request({ method: "eth_requestAccounts" });
        setAccount(addr);
      } catch (err) {
        alert("Gagal konek OKX Wallet: " + err.message);
      }
    } else {
      alert("OKX Wallet belum terpasang di browser Anda!");
    }
  }

  // --- END POPUP WALLET CONNECT ---

  async function mintIdentityNFT() {
    try {
      setMinted(false);
      setTxHash("");
      setMetadataUrl("");
      setLoading(true);
      setCekMintLog("");
      if (!session) throw new Error(LANGUAGES[lang].checkGoogle);
      if (!account) throw new Error(LANGUAGES[lang].checkWallet);

      setStatus("🔒 " + LANGUAGES[lang].processing);
      const email_hash = SHA256(session.user.email).toString();

      const metadata = {
        name: "AFA COMMUNITY x PHAROS TESTNET IDENTITY",
        description: "Pharos Identity NFT for AFA Community",
        email_hash: email_hash,
        wallet: account,
        image: NFT_IMAGE
      };

      setStatus("📤 " + LANGUAGES[lang].processing);
      const res = await fetch("https://api.pinata.cloud/pinning/pinJSONToIPFS", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": PINATA_JWT
        },
        body: JSON.stringify(metadata)
      });
      const data = await res.json();
      if (!data.IpfsHash) throw new Error("Upload ke Pinata gagal.");
      const tokenURI = `https://gateway.pinata.cloud/ipfs/${data.IpfsHash}`;
      setMetadataUrl(tokenURI);

      setStatus("✍️ " + LANGUAGES[lang].processing);
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

      setStatus("🟢 " + LANGUAGES[lang].processing);
      const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);
      const tx = await contract.mintIdentity(tokenURI, "0x" + email_hash, signature);
      setStatus("⏳ " + LANGUAGES[lang].processing);
      await tx.wait();

      setStatus("✅ " + LANGUAGES[lang].mintSuccess);
      setTxHash(tx.hash);
      setMinted(true);
      setLoading(false);
      setCekMintLog(LANGUAGES[lang].mintSuccess);
      alert(LANGUAGES[lang].mintSuccess);
    } catch (err) {
      setStatus("❌ " + LANGUAGES[lang].mintError + " " + err.message);
      setLoading(false);
    }
  }

  function WalletModal() {
    return (
      <div style={{
        position: "fixed", top: 0, left: 0, width: "100vw", height: "100vh",
        background: "rgba(0,0,0,0.32)", display: "flex", alignItems: "center", justifyContent: "center",
        zIndex: 9999
      }}>
        <div style={{
          background: "#202736", borderRadius: 16, padding: 34, minWidth: 280, boxShadow: "0 4px 32px #000b"
        }}>
          <h3 style={{ color: "#00ffc3", marginBottom: 18, textAlign: "center", fontSize: 18, fontWeight: 700 }}>Pilih Wallet</h3>
          <button onClick={connectMetamask} style={{
            ...btnStyle("#f6851b"), width: "100%", marginBottom: 15, fontSize: 16
          }}>
            <img src="https://raw.githubusercontent.com/MetaMask/brand-resources/master/SVG/metamask-fox.svg"
              alt="Metamask" width={22} style={{ verticalAlign: "middle", marginRight: 7 }} />
            Metamask
          </button>
          <button onClick={connectOKXWallet} style={{
            ...btnStyle("#1c60ff"), width: "100%", fontSize: 16
          }}>
            <img src="https://static.okx.com/cdn/wallet/logo/okx-wallet-icon.png"
              alt="OKX Wallet" width={22} style={{ verticalAlign: "middle", marginRight: 7, background:"#fff", borderRadius: 3 }} />
            OKX Wallet
          </button>
          <button onClick={() => setShowWalletModal(false)} style={{
            ...btnStyle("#555"), width: "100%", marginTop: 10, fontSize: 15
          }}>Batal</button>
        </div>
      </div>
    );
  }

  // Google profile UI
  function GoogleProfile({ user }) {
    return (
      <div
        style={{
          display: "flex", alignItems: "center", justifyContent: "center",
          marginBottom: 20,
        }}
      >
        <div style={{
          display: "flex", alignItems: "center", gap: 16,
          background: "linear-gradient(93deg, #181f2b 70%, #1a222e 100%)",
          padding: "10px 22px", borderRadius: 16, boxShadow: "0 2px 24px #00ffc244",
          border: "1px solid #2e3748", minWidth: 295, position: "relative"
        }}>
          <div style={{
            borderRadius: "50%", border: "3px solid #00ffc3", background: "#fff",
            width: 52, height: 52, display: "flex", alignItems: "center", justifyContent: "center",
            overflow: "hidden", boxShadow: "0 2px 12px #00ffc322",
            flexShrink: 0
          }}>
            <img
              src={user.image}
              alt="avatar"
              width={50}
              height={50}
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
              fontWeight: 700, fontSize: 18, color: "#00ffc3", letterSpacing: 1,
              textShadow: "0 2px 8px #00ffc366", marginBottom: 2
            }}>
              {user.name}
            </div>
            <div style={{
              color: "#ffe066", fontSize: 14.5, fontWeight: 500,
              textShadow: "0 1px 3px #000b"
            }}>{user.email}</div>
            {/* CONNECT WALLET BUTTON BELOW EMAIL */}
            {!account && (
              <button
                onClick={() => setShowWalletModal(true)}
                style={{
                  ...btnStyle("#1976d2"),
                  borderRadius: 8,
                  fontSize: 14,
                  fontWeight: 600,
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
                padding: "2.5px 13px",
                border: "none",
                borderRadius: 6,
                fontWeight: 600,
                fontSize: 12.5,
                cursor: "pointer",
                marginBottom: 0,
                boxShadow: "0 1px 7px #0002",
                transition:"all .16s"
              }}
              title="Logout Google"
            >Logout</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      {showWalletModal && <WalletModal />}
      <div style={{
        maxWidth: 430,
        margin: "32px auto",
        padding: "32px 22px 30px 22px",
        background: "linear-gradient(115deg, #232d3d 70%, #181f2b 100%)",
        borderRadius: 22,
        boxShadow: "0 8px 44px #0008, 0 1.5px 0 #00ffc355",
        color: "#f3f3f3",
        fontFamily: "Inter, Arial, sans-serif",
        border: "1.5px solid #242632"
      }}>
        {/* HEADER DENGAN LOGO CHANNEL */}
        <div style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 10
        }}>
          <div style={{
            display: "flex",
            alignItems: "center",
            gap: 13
          }}>
            {/* LOGO KAMU */}
            <img
              src="https://ik.imagekit.io/5spt6gb2z/IMG_2894.jpeg"
              alt="Logo Channel"
              width={44}
              height={44}
              style={{
                borderRadius: "50%",
                border: "2px solid #00ffc3",
                background: "#fff",
                boxShadow: "0 2px 12px #00ffc322",
                objectFit: "cover"
              }}
            />
            <h2 style={{
              textAlign: "left",
              letterSpacing: 1,
              fontWeight: 800,
              fontSize: 28,
              color: "#fff",
              textShadow: "0 2px 16px #00ffc344",
              margin: 0,
              lineHeight: 1.1
            }}>
              {LANGUAGES[lang].title}
            </h2>
          </div>
          <button onClick={toggleLang} style={{
            background:"#222", color:"#00ffc3", border:"none", borderRadius:8,
            padding:"6px 15px", fontWeight:700, cursor:"pointer",
            fontSize: 15, transition:"all .18s"
          }}>
            {lang === "id" ? "English" : "Bahasa"}
          </button>
        </div>
        <div style={{textAlign:"center",marginBottom:16, fontSize:15, color:"#aff", letterSpacing:0.5}}>
          {LANGUAGES[lang].network}
        </div>
        <div style={{display:"flex", justifyContent:"center", marginBottom:26}}>
          <img
            src={nftImg}
            alt="NFT Preview"
            style={{
              width:185,
              height:185,
              borderRadius:19,
              border:"2.5px solid #00ffc3",
              objectFit:"cover",
              boxShadow:"0 3px 24px #00ffc344"
            }}
          />
        </div>
        <div style={{marginBottom:18, textAlign:"center",fontWeight:600,fontSize:16}}>
          {session ? (
            <GoogleProfile user={session.user} />
          ) : (
            <button onClick={() => signIn("google")} style={{
              ...btnStyle("#1976d2"),
              borderRadius: 8, fontSize: 16, fontWeight: 700, width: "100%"
            }}>
              {LANGUAGES[lang].login}
            </button>
          )}
        </div>
        {account && (
          <div style={{
            margin: "0 0 16px 0",
            textAlign: "center",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            gap: 10
          }}>
            <button style={{
              ...btnStyle("#2a2a5b"),
              fontSize: 15.5,
              borderRadius: 7
            }}>
              {`${LANGUAGES[lang].wallet}: ${shortAddr(account)}`}
            </button>
            <button
              onClick={disconnectWallet}
              style={{
                ...btnStyle("#555"),
                fontSize: 13.5,
                borderRadius: 7,
                color: "#fff",
                background: "#34383f"
              }}
            >
              {LANGUAGES[lang].disconnect}
            </button>
          </div>
        )}
        <div style={{textAlign:"center", marginTop:8}}>
          <button
            onClick={mintIdentityNFT}
            disabled={!session || !account || minted || loading}
            style={{
              ...btnStyle("#00ffc3"),
              color: "#1b2130",
              fontWeight: 700,
              margin: "7px 0 18px 0",
              opacity: minted || loading ? 0.65 : 1,
              boxShadow: "0 1px 7px #00ffc540",
              fontSize: 16.5,
              width: "100%",
              borderRadius: 8
            }}>
            {minted ? LANGUAGES[lang].minted : loading ? LANGUAGES[lang].processing : LANGUAGES[lang].mint}
          </button>
          {cekMintLog && (
            <div style={{
              background:"#232837",
              color:"#00ffc3",
              padding:"11px 18px",
              borderRadius:10,
              marginTop:14,
              fontWeight:600,
              fontSize:15,
              textAlign:"center",
              letterSpacing:0.1
            }}>
              {cekMintLog}
            </div>
          )}
        </div>
        <div style={{
          margin:"20px 0 10px 0",
          minHeight: 32,
          fontSize:16,
          fontWeight:500,
          textAlign:"center",
          color: "#9cf"
        }}>
          {status}
        </div>
        {minted && (
          <div style={{
            background: "linear-gradient(90deg, #181f2b 80%, #232d3d 100%)",
            borderRadius: 14,
            padding: "18px 14px",
            color: "#fff",
            marginTop: 15,
            fontSize: 15.5,
            border: "1px solid #2e3748",
            boxShadow: "0 2px 16px #00ffc333"
          }}>
            <div style={{marginBottom:7, fontWeight:700}}>
              <span style={{color:"#00ffc3"}}>{LANGUAGES[lang].wallet}:</span>
              <span style={{marginLeft:7, fontWeight:500, color:"#fff"}}>{account}</span>
            </div>
            <div style={{marginBottom:7}}>
              <span style={{fontWeight:700, color:"#ffe066"}}>Email:</span>
              <span style={{marginLeft:7, color:"#fff"}}>{session?.user?.email}</span>
            </div>
            {metadataUrl && (
              <div style={{marginBottom:7}}>
                <span style={{fontWeight:700, color:"#7cb8f9"}}>Metadata:</span>
                <a href={metadataUrl} target="_blank" rel="noopener" style={{marginLeft:7, color:"#7cb8f9", textDecoration:"underline"}}>{LANGUAGES[lang].explorer}</a>
              </div>
            )}
            {txHash && (
              <div>
                <span style={{fontWeight:700, color:"#00ffc3"}}>TX Hash:</span>
                <a href={EXPLORER_BASE+txHash} target="_blank" rel="noopener" style={{marginLeft:7, color:"#7cf9d4", textDecoration:"underline"}}>
                  {shortTx(txHash)}
                </a>
              </div>
            )}
          </div>
        )}
        {/* Bagian Channel Telegram Profesional */}
        <div style={{
          marginTop: 32,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
        }}>
          <div style={{
            display: "flex",
            alignItems: "center",
            background: "linear-gradient(90deg, #13243a 60%, #1e2d45 100%)",
            padding: "16px 28px",
            borderRadius: 13,
            boxShadow: "0 1.5px 12px #00ffc355",
            border: "1.5px solid #1b2b46",
            maxWidth: 380,
            minWidth: 0,
            gap: 14,
          }}>
            <img
              src="https://cdn-icons-png.flaticon.com/512/2111/2111646.png"
              alt="Telegram"
              width={38}
              height={38}
              style={{ borderRadius: 8, marginRight: 8, background: "#fff" }}
            />
            <div>
              <div style={{
                color: "#00ffc3",
                fontSize: 15.5,
                fontWeight: 700,
                marginBottom: 2,
                letterSpacing: 0.1
              }}>
                Join Our Official Airdrop Channel
              </div>
              <a
                href="https://t.me/airdrop4ll"
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  color: "#7cb8f9",
                  fontWeight: 700,
                  fontSize: 16,
                  letterSpacing: 0.3,
                  textDecoration: "none",
                  display: "flex",
                  alignItems: "center",
                  gap: 7,
                  marginTop: 2
                }}
              >
                <span style={{
                  background: "linear-gradient(90deg, #00ffc3 20%, #7cb8f9 80%)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  fontWeight: 700,
                  fontSize: 17
                }}>
                  t.me/airdrop4ll
                </span>
                <svg xmlns="http://www.w3.org/2000/svg" height="18" width="18" viewBox="0 0 24 24" fill="#7cb8f9">
                  <path d="M5 12h14M12 5l7 7-7 7" stroke="#7cb8f9" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </a>
            </div>
          </div>
        </div>
        {/* END Bagian Channel Telegram Profesional */}
        <div style={{
          marginTop:10, textAlign:"center", fontSize:13, color:"#aaa",
          letterSpacing:0.2, fontWeight:500
        }}>
          {LANGUAGES[lang].powered} <span style={{color:"#00ffc3"}}>AFA Community x PHAROS</span>
        </div>
      </div>
    </>
  );
}

function shortAddr(addr) {
  if (!addr) return "";
  return addr.slice(0, 7) + "..." + addr.slice(-4);
}
function shortTx(tx) {
  if (!tx) return "";
  return tx.slice(0, 8) + "..." + tx.slice(-6);
}
function btnStyle(bg) {
  return {
    background: bg,
    color: "#fff",
    padding: "8px 18px",
    border: "none",
    borderRadius: "9px",
    fontWeight: 600,
    fontSize: 15,
    cursor: "pointer",
    margin: "0 4px 0 0",
    transition: "all 0.2s",
    boxShadow: "0 1px 7px #0002"
  };
}
