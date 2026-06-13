// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract AuthenticityBadge is ERC721, Ownable {
    uint256 private _nextTokenId;
    mapping(string => uint256) public verificationToToken;
    mapping(uint256 => string) public tokenToVerification;

    event BadgeMinted(address indexed to, uint256 tokenId, string verificationKey);

    constructor() ERC721("AuthenticityBadge", "AUTHBADGE") Ownable(msg.sender) {}

    function mintBadge(address to, string calldata verificationKey) external onlyOwner returns (uint256) {
        require(verificationToToken[verificationKey] == 0, "Already minted");
        _nextTokenId++;
        uint256 tokenId = _nextTokenId;
        _mint(to, tokenId);
        verificationToToken[verificationKey] = tokenId;
        tokenToVerification[tokenId] = verificationKey;
        emit BadgeMinted(to, tokenId, verificationKey);
        return tokenId;
    }

    function isVerified(string calldata verificationKey) external view returns (bool) {
        return verificationToToken[verificationKey] != 0;
    }
}
