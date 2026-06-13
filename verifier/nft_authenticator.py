import json
import hashlib
from backend.node.genvm.icontract import IContract
from backend.node.genvm.equivalence_principle import call_llm_with_principle


class NFTAuthenticator(IContract):
    def __init__(self):
        self.verifications = {}
        self.total_verified = 0
        self.total_authentic = 0

    async def verify_nft(self, image_url: str, collection_name: str, claimed_creator: str) -> str:
        key = hashlib.sha256(f"{image_url}{collection_name}{claimed_creator}".encode()).hexdigest()[:16]

        prompt = (
            f"Analyze this NFT for authenticity.\n"
            f"Image URL: {image_url}\n"
            f"Collection: {collection_name}\n"
            f"Claimed creator: {claimed_creator}\n\n"
            f"Fetch the image page and determine:\n"
            f"1. Is this original art or a copy of known NFT collections?\n"
            f"2. Check for visual similarity to popular collections (BAYC, CryptoPunks, Azuki, etc.)\n"
            f"3. Verify if the claimed creator is associated with this style.\n\n"
            f"Respond in JSON: {{\"authentic\": bool, \"confidence\": \"high|medium|low\", "
            f"\"similar_found\": \"name of similar collection or none\", \"reasoning\": \"brief explanation\"}}"
        )

        result = await call_llm_with_principle(
            prompt,
            eq_principle="The verdict on authenticity must be consistent across validators.",
        )

        verdict = json.loads(result)
        self.verifications[key] = {
            "image_url": image_url,
            "collection_name": collection_name,
            "claimed_creator": claimed_creator,
            "verdict": verdict,
        }
        self.total_verified += 1
        if verdict.get("authentic"):
            self.total_authentic += 1

        return key

    def get_verification(self, key: str) -> dict:
        return self.verifications.get(key, {})

    def read_authenticity(self, key: str) -> dict:
        record = self.verifications.get(key)
        if not record:
            return {"exists": False}
        return {"exists": True, "authentic": record["verdict"]["authentic"], "confidence": record["verdict"]["confidence"]}

    def stats(self) -> dict:
        return {
            "total_verified": self.total_verified,
            "total_authentic": self.total_authentic,
            "total_flagged": self.total_verified - self.total_authentic,
        }
