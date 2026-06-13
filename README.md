# NFTAuthenticator

NFT authenticity verification on GenLayer. AI validators check if artwork is original or copied, and mint proof-of-authenticity badges for verified pieces.

## Why GenLayer

Determining art authenticity is pure judgment:

- **No hash can tell you if art is original.** Two images can have completely different hashes but one is clearly a copy of the other's style/composition. This requires visual understanding.
- **Validators fetch and analyze the NFT page.** They read metadata, collection info, creator history — context that a simple on-chain check can never access.
- **Provenance requires interpretation.** Is this really by the claimed creator? Does the style match their portfolio? Are there known copies in other collections? AI validators assess these signals.
- **Confidence levels, not binary.** The verdict includes high/medium/low confidence — acknowledging that some cases are clear-cut and others genuinely ambiguous.
- **Decentralized means no marketplace bias.** OpenSea might have incentives to not flag fakes. Independent AI validators have no such conflict.

## Deployed

**GenLayer (Bradbury):** `0xbe8EFE211D8B3b4ecb32F1EA742e432DD9113197`

## Test result

Verified: BAYC #1 (Bored Ape Yacht Club)
→ ✅ **Authentic** (high confidence) — "Token #1 is the genesis Bored Ape Yacht Club NFT, minted by YugaLabs. All page details match the official BAYC collection."

## Structure

```
NFTAuthenticator/
├── verifier/
│   └── nft_authenticator.py  ← GenLayer contract
├── registry/
│   └── AuthenticityBadge.sol  ← ERC-721 badge for verified NFTs
├── client/
│   └── index.html            ← Single-page UI
├── types/
│   └── constants.js          ← Shared constants
└── README.md
```
