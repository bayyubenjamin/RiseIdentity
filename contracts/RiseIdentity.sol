// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";

contract RiseIdentity is ERC721 {
    uint256 public nextTokenId = 1;

    // Simpan email hash per wallet
    mapping(address => bytes32) public emailHashes;
    mapping(uint256 => string) private _tokenURIs;

    event Minted(address indexed user, uint256 tokenId, bytes32 emailHash, string tokenUri);

    constructor() ERC721("AFA Identity", "AFAID") {}

    function mintIdentity(
        string memory newTokenUri, // Ganti nama parameter agar tidak tabrakan dengan function tokenURI
        bytes32 emailHash,
        bytes memory signature
    ) external {
        // Verifikasi signature (owner wallet harus sign hash)
        bytes32 message = prefixed(keccak256(abi.encodePacked(msg.sender, emailHash)));
        require(recoverSigner(message, signature) == msg.sender, "Invalid signature");

        // Cek belum pernah mint
        require(emailHashes[msg.sender] == 0, "Already minted");

        // Simpan email hash
        emailHashes[msg.sender] = emailHash;

        // Mint NFT
        _mint(msg.sender, nextTokenId);
        _setTokenURI(nextTokenId, newTokenUri);

        emit Minted(msg.sender, nextTokenId, emailHash, newTokenUri);

        nextTokenId++;
    }

    function _setTokenURI(uint256 tokenId, string memory uri) internal {
        _tokenURIs[tokenId] = uri;
    }

    function tokenURI(uint256 tokenId) public view override returns (string memory) {
        return _tokenURIs[tokenId];
    }

    // Helper untuk EIP191 signature
    function prefixed(bytes32 hash) internal pure returns (bytes32) {
        return keccak256(abi.encodePacked("\x19Ethereum Signed Message:\n32", hash));
    }

    function recoverSigner(bytes32 message, bytes memory sig) public pure returns (address) {
        require(sig.length == 65, "bad sig length");
        bytes32 r;
        bytes32 s;
        uint8 v;
        assembly {
            r := mload(add(sig, 32))
            s := mload(add(sig, 64))
            v := byte(0, mload(add(sig, 96)))
        }
        return ecrecover(message, v, r, s);
    }
}
