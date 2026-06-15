# NFTAuthenticator

**On-chain authenticity verification for NFT art — AI validators fetch the listing, look for signs of plagiarism or undisclosed AI, and rule on whether the work is original by consensus.**

NFTAuthenticator answers "is this NFT genuinely the claimed creator's original work?" without a centralized authentication house. A requester submits the image/listing URL, the collection, and the claimed creator; validators independently render the page and an LLM weighs it for copied styles, stolen art, or undisclosed AI generation. The verdict — `authentic` true/false plus a confidence band and any similar sources — is recorded permanently on chain.

- **Contract (Bradbury, chain 4221):** `0xbe8EFE211D8B3b4ecb32F1EA742e432DD9113197`
- **Explorer:** https://explorer-bradbury.genlayer.com/contract/0xbe8EFE211D8B3b4ecb32F1EA742e432DD9113197
- **Live app:** https://nftauthenticator.pages.dev

## What it does

1. **`verify_nft(image_url, collection_name, claimed_creator)`** — a `@gl.public.write` method. Validates `image_url`, runs the authenticity check, stores a JSON record (requester, image URL, collection, claimed creator, `authentic`, `confidence`, `similar_found`, `reasoning`) in the `verifications` `TreeMap[str, str]` keyed by `verify_count`, and returns the key.
2. The private `_check_authenticity(...)` builds the non-deterministic block:
   - **Validators crawl the listing.** `leader_fn` calls `gl.nondet.web.render(image_url, mode="text")` and captures the first 4000 chars, so each validator inspects the *real* page and metadata.
   - **An LLM acts as art authenticator.** `gl.nondet.exec_prompt(prompt, response_format="json")` is given the image page, collection, and claimed creator, and must reply `{"authentic": true/false, "confidence": "high"/"medium"/"low", "similar_found": "...", "reasoning": "..."}`.
   - **Consensus via `gl.vm.run_nondet_unsafe(leader_fn, validator_fn)`.** `validator_fn` requires a `gl.vm.Return`, a boolean `authentic`, and `confidence` in `{high, medium, low}` — validators agree on the verdict's legality, not on identical rendered bytes.
3. **Reads** are free `@gl.public.view` calls: `get_verification(key)` (full record), `read_authenticity(key)` → `{verified, authentic, confidence}` for a minting/badge contract to act on, and `stats()` → `{total_verifications}`.

State lives in the `verifications` `TreeMap`; `verify_count` is a `u256`.

## Why GenLayer

A deterministic EVM cannot judge originality. Spotting a plagiarized style or undisclosed AI art requires interpretation, and fetching the live listing is non-deterministic — two nodes would render different bytes, breaking EVM consensus.

GenLayer's **Optimistic Democracy** lets each validator render the page and reason about authenticity, then *vote* on whether the leader's verdict is acceptable. The contract encodes what a valid verdict looks like; validators supply the perception and judgment.

Use NFTAuthenticator when authenticity hinges on interpreting visual/listing evidence against a claim. Use a backend signature check when provenance is already cryptographically attestable (a signed mint by a known key) — that is mechanical and does not need a validator network.

## Architecture

| GenLayer contract | Frontend dir | EVM / off-chain |
| --- | --- | --- |
| `verifier/nft_authenticator.py` | `client/` (React + Vite) | `registry/AuthenticityBadge.sol` (badge minted on a positive verdict); `types/constants.js` (shared constants) |

## Tech

- **GenVM Python**, pinned to `py-genlayer:1jb45aa8…jpz09h6` via the `# { "Depends": ... }` header. Typed storage: `TreeMap[str, str]` plus a `u256` counter.
- **`genlayer-js`** handles all reads (`client.readContract`) against `testnetBradbury`. Writes use **MetaMask with no Snap** — the app drives `window.ethereum`, ensures **chain 4221** (`0x107d`, auto-adding the Bradbury network), submits via `client.writeContract`, and waits for `FINALIZED`.
- **App-specific UI:** a React 19 + Vite client (Tailwind v4, `framer-motion`, `sonner`) — a verification form (image URL / collection / claimed creator) and a result card showing authenticity, confidence band, similar sources, and reasoning.

## Project structure

```
NFTAuthenticator/
├── verifier/
│   └── nft_authenticator.py      ← GenLayer contract (authenticity logic)
├── registry/
│   └── AuthenticityBadge.sol     ← EVM badge contract
├── types/
│   └── constants.js              ← shared constants
├── client/                       ← frontend (Cloudflare Pages root)
│   ├── src/
│   │   ├── App.tsx               ← verification + result UI
│   │   ├── genlayer.ts           ← client, wallet, read/write helpers
│   │   ├── main.tsx
│   │   └── index.css
│   ├── public/
│   ├── index.html
│   ├── package.json
│   └── vite.config.ts
└── README.md
```

## Develop

```bash
cd client
npm install
npm run dev      # local dev server (Vite)
npm run build    # type-check + production build to dist/
```

## Deploy the frontend

Cloudflare Pages:

- **Root directory:** `client`
- **Build command:** `npm run build`
- **Output directory:** `dist`
- **Environment variable:** `NODE_VERSION=20`

## Why GenLayer (engineering notes)

Real gotchas learned building this:

- **Integers, not floats.** `verify_count` is an integer `u256`, and confidence is an *enum band* (`high`/`medium`/`low`), not a float score — discrete values keep validator agreement stable.
- **Validate structure, not exact LLM output.** `validator_fn` only checks `authentic` is a `bool` and `confidence` is in the allowed set. It never compares the `reasoning` or `similar_found` strings — those legitimately vary between validators.
- **ACCEPTED ≠ executed.** Consensus means validators accepted the verdict's validity, not that a badge was minted. `AuthenticityBadge.sol` must read `read_authenticity` and act as a separate step.
- **Optimistic finality has an appeal window.** A verification is provisional until the appeal window elapses; the frontend waits for `FINALIZED` before treating a result as final.
- **Evidence is untrusted (greybox).** The listing is fetched from a user-supplied URL and rendered, not trusted — the prompt treats page content as adversarial input (a listing can't be allowed to "declare" itself authentic), and a failed render degrades to `(could not fetch)`.

## License

MIT
