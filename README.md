# NFTAuthenticator

Verify if NFT art is original or copied from existing collections. AI compares against known sources.

## Structure

- `verifier/` — GenLayer contract (Python) that uses AI to analyze NFT originality
- `registry/` — Solidity ERC-721 contract that mints authenticity badges
- `client/` — Elm-inspired single-page UI (index.html with embedded JS module)
- `types/` — Shared constants (.js)

## Deploy

```bash
genlayer deploy --contract /Users/rivale/NFTAuthenticator/verifier/nft_authenticator.py
```

## Test

```bash
genlayer call --function verify_nft --args '["https://example.com/nft.png", "TestCollection", "artist123"]'
```
