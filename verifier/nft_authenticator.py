# { "Depends": "py-genlayer:1jb45aa8ynh2a9c9xn3b7qqh8sm5q93hwfp7jqmwsfhh8jpz09h6" }
import json
from genlayer import *

# Normalized similar_found values that mean "no infringing/similar source".
_NO_SOURCE = ("", "none", "none found", "no similar sources found", "n/a")


class NFTAuthenticator(gl.Contract):
    verifications: TreeMap[str, str]
    verify_count: u256

    def __init__(self):
        self.verify_count = u256(0)

    @gl.public.write
    def verify_nft(self, image_url: str, collection_name: str, claimed_creator: str) -> str:
        image_url = str(image_url).strip()
        if not image_url:
            raise Exception("image_url required")

        verdict = self._check_authenticity(image_url, collection_name, claimed_creator)
        key = str(int(self.verify_count))
        record = {
            "requester": str(gl.message.sender_address),
            "image_url": image_url,
            "collection": str(collection_name).strip(),
            "claimed_creator": str(claimed_creator).strip(),
            "authentic": verdict["authentic"],
            "confidence": verdict["confidence"],
            "similar_found": verdict["similar_found"],
            "reasoning": verdict["reasoning"],
        }
        self.verifications[key] = json.dumps(record)
        self.verify_count += u256(1)
        return key

    def _check_authenticity(self, image_url: str, collection: str, creator: str) -> dict:
        def leader_fn() -> str:
            page_content = "(could not fetch)"
            try:
                raw = gl.nondet.web.render(image_url, mode="text")
                page_content = raw[:4000]
            except Exception:
                pass

            prompt = f"""You are an NFT authenticity verifier.

IMAGE PAGE: {image_url}
COLLECTION: {collection}
CLAIMED CREATOR: {creator}

PAGE CONTENT:
{page_content}

RULES:
1. Determine if this NFT appears to be original work by the claimed creator.
2. Look for signs of copying: well-known art styles plagiarized, stolen from known artists, AI-generated without disclosure.
3. Check if the page/metadata matches the claimed creator and collection.
4. Rate confidence: high (clear evidence), medium (some indicators), low (uncertain).

Reply ONLY valid JSON:
{{"authentic": true/false, "confidence": "high"/"medium"/"low", "similar_found": "<sources or 'none'>", "reasoning": "<brief>"}}"""
            raw = gl.nondet.exec_prompt(prompt, response_format="json")
            data = raw if isinstance(raw, dict) else json.loads(str(raw).strip())

            # Deterministic cross-field anchor: an authentic original cannot have
            # a real infringing/similar source. If a real similar source is found,
            # force authentic = False so honest leaders satisfy the invariant.
            confidence = str(data.get("confidence", "")).strip().lower()
            if confidence not in ("high", "medium", "low"):
                confidence = "low"
            similar_found = str(data.get("similar_found", "")).strip()
            reasoning = str(data.get("reasoning", "")).strip()
            if not reasoning:
                reasoning = "no reasoning provided"
            authentic = bool(data.get("authentic"))
            has_real_source = similar_found.lower() not in _NO_SOURCE
            if has_real_source:
                authentic = False
            return json.dumps({
                "authentic": authentic,
                "confidence": confidence,
                "similar_found": similar_found,
                "reasoning": reasoning,
            })

        def validator_fn(leader_result) -> bool:
            if not isinstance(leader_result, gl.vm.Return):
                return False
            try:
                data = json.loads(leader_result.calldata)
                if data.get("confidence") not in ("high", "medium", "low"):
                    return False
                authentic = data.get("authentic")
                if not isinstance(authentic, bool):
                    return False
                similar_found = data.get("similar_found")
                if not isinstance(similar_found, str):
                    return False
                reasoning = data.get("reasoning")
                if not isinstance(reasoning, str) or not reasoning.strip():
                    return False
                # Cross-field invariant (the ANCHOR): authentic ⟹ no real source.
                if authentic and similar_found.strip().lower() not in _NO_SOURCE:
                    return False
                return True
            except Exception:
                return False

        return json.loads(gl.vm.run_nondet_unsafe(leader_fn, validator_fn))

    @gl.public.view
    def get_verification(self, key: str) -> dict:
        key = str(key)
        if key not in self.verifications:
            return {"exists": False}
        return json.loads(self.verifications[key])

    @gl.public.view
    def read_authenticity(self, key: str) -> dict:
        key = str(key)
        if key not in self.verifications:
            return {"verified": False}
        v = json.loads(self.verifications[key])
        return {"verified": True, "authentic": v["authentic"], "confidence": v["confidence"]}

    @gl.public.view
    def stats(self) -> dict:
        return {"total_verifications": int(self.verify_count)}
