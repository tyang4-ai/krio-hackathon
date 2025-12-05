"""
Blockchain service for achievement verification.

Kiroween Hackathon - Frankenstein Track (Education + Web3)

Provides:
- IPFS upload via Pinata (certificate storage)
- Base L2 anchoring (proof of achievement)
- Verification of on-chain data
"""
import hashlib
import json
from datetime import datetime
from typing import Any, Dict, Optional, Tuple

import httpx
import structlog

from config import settings

logger = structlog.get_logger()


class BlockchainService:
    """Service for blockchain-verified achievements."""

    def __init__(self):
        self.pinata_api_key = settings.pinata_api_key
        self.pinata_secret_key = settings.pinata_secret_key
        self.pinata_gateway = settings.pinata_gateway
        self.base_rpc_url = settings.base_rpc_url
        self.base_chain_id = settings.base_chain_id
        self.base_private_key = settings.base_private_key

    @property
    def is_configured(self) -> bool:
        """Check if blockchain services are configured."""
        return bool(self.pinata_api_key and self.pinata_secret_key)

    @property
    def is_chain_configured(self) -> bool:
        """Check if on-chain anchoring is configured."""
        return bool(self.base_private_key)

    def get_explorer_url(self, tx_hash: str = "") -> str:
        """Get the block explorer URL for the configured chain."""
        if self.base_chain_id == 84532:
            # Base Sepolia testnet
            base_url = "https://sepolia.basescan.org"
        else:
            # Base mainnet
            base_url = "https://basescan.org"

        if tx_hash:
            return f"{base_url}/tx/{tx_hash}"
        return base_url

    # =========================================================================
    # Certificate Generation
    # =========================================================================

    def create_certificate(
        self,
        achievement_slug: str,
        achievement_name: str,
        achievement_rarity: str,
        user_id: int,
        user_display: Optional[str],
        earned_at: datetime,
        context: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        """
        Create a certificate JSON for an achievement.

        The certificate includes a signature (hash) for integrity verification.
        """
        certificate = {
            "version": "1.0",
            "type": "StudyForgeAchievement",
            "achievement": {
                "slug": achievement_slug,
                "name": achievement_name,
                "rarity": achievement_rarity,
            },
            "recipient": {
                "user_id": user_id,
                "display_name": user_display,
            },
            "earned": {
                "timestamp": earned_at.isoformat(),
                "context": context or {},
            },
            "chain": {
                "name": "Base Sepolia" if self.base_chain_id == 84532 else "Base",
                "id": self.base_chain_id,
                "explorer": self.get_explorer_url(),
            },
            "issued_at": datetime.utcnow().isoformat(),
        }

        # Add signature (SHA-256 hash of core data)
        signature_data = json.dumps(
            {
                "achievement_slug": achievement_slug,
                "user_id": user_id,
                "earned_at": earned_at.isoformat(),
            },
            sort_keys=True,
        )
        certificate["signature"] = hashlib.sha256(signature_data.encode()).hexdigest()

        return certificate

    # =========================================================================
    # IPFS Upload (Pinata)
    # =========================================================================

    async def upload_to_ipfs(
        self, certificate: Dict[str, Any]
    ) -> Tuple[Optional[str], Optional[str]]:
        """
        Upload certificate JSON to IPFS via Pinata.

        Returns:
            Tuple of (ipfs_hash, ipfs_url) or (None, None) on failure
        """
        if not self.is_configured:
            logger.warning("blockchain_not_configured", service="pinata")
            return None, None

        try:
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    "https://api.pinata.cloud/pinning/pinJSONToIPFS",
                    headers={
                        "pinata_api_key": self.pinata_api_key,
                        "pinata_secret_api_key": self.pinata_secret_key,
                        "Content-Type": "application/json",
                    },
                    json={
                        "pinataContent": certificate,
                        "pinataMetadata": {
                            "name": f"StudyForge-Achievement-{certificate['achievement']['slug']}-{certificate['recipient']['user_id']}",
                        },
                    },
                    timeout=30.0,
                )

                if response.status_code == 200:
                    data = response.json()
                    ipfs_hash = data.get("IpfsHash")
                    ipfs_url = f"{self.pinata_gateway}/{ipfs_hash}"

                    logger.info(
                        "ipfs_upload_success",
                        ipfs_hash=ipfs_hash,
                        achievement=certificate["achievement"]["slug"],
                    )

                    return ipfs_hash, ipfs_url
                else:
                    logger.error(
                        "ipfs_upload_failed",
                        status_code=response.status_code,
                        response=response.text,
                    )
                    return None, None

        except Exception as e:
            logger.error("ipfs_upload_error", error=str(e))
            return None, None

    # =========================================================================
    # Base L2 Anchoring
    # =========================================================================

    async def anchor_to_chain(
        self, ipfs_hash: str
    ) -> Tuple[Optional[str], Optional[int]]:
        """
        Anchor IPFS hash to Base L2 blockchain.

        Uses a simple self-send transaction with the IPFS hash in the data field.
        This is the cheapest way to get immutable on-chain proof (~$0.001).

        Returns:
            Tuple of (tx_hash, block_number) or (None, None) on failure
        """
        if not self.is_chain_configured:
            logger.warning("blockchain_not_configured", service="base_l2")
            return None, None

        try:
            # Import web3 only when needed (optional dependency)
            from web3 import Web3

            w3 = Web3(Web3.HTTPProvider(self.base_rpc_url))

            # Note: w3.is_connected() doesn't work reliably with all RPC providers
            # We'll let it fail on actual operations if there's a problem

            # Get account from private key
            account = w3.eth.account.from_key(self.base_private_key)
            wallet_address = account.address

            # Build transaction data
            data_payload = f"studyforge:achievement:{ipfs_hash}"

            # Get gas price and nonce
            gas_price = w3.eth.gas_price
            nonce = w3.eth.get_transaction_count(wallet_address)

            # Build transaction (self-send with data)
            tx = {
                "from": wallet_address,
                "to": wallet_address,
                "value": 0,
                "gas": 25000,  # Simple data tx
                "gasPrice": gas_price,
                "nonce": nonce,
                "chainId": self.base_chain_id,
                "data": w3.to_hex(text=data_payload),
            }

            # Sign and send
            signed_tx = w3.eth.account.sign_transaction(tx, self.base_private_key)
            # web3.py 6.x uses rawTransaction (camelCase)
            raw_tx = signed_tx.rawTransaction if hasattr(signed_tx, 'rawTransaction') else signed_tx.raw_transaction
            tx_hash = w3.eth.send_raw_transaction(raw_tx)

            # Wait for receipt
            receipt = w3.eth.wait_for_transaction_receipt(tx_hash, timeout=60)

            logger.info(
                "base_l2_anchor_success",
                tx_hash=tx_hash.hex(),
                block_number=receipt["blockNumber"],
                ipfs_hash=ipfs_hash,
            )

            return tx_hash.hex(), receipt["blockNumber"]

        except ImportError as e:
            logger.error("web3_not_installed", message="pip install web3")
            raise RuntimeError(f"web3 not installed: {e}")
        except Exception as e:
            logger.error("base_l2_anchor_error", error=str(e))
            raise RuntimeError(f"Blockchain error: {e}")

    # =========================================================================
    # Verification
    # =========================================================================

    async def verify_on_chain(
        self, tx_hash: str, expected_ipfs_hash: str
    ) -> Tuple[bool, str]:
        """
        Verify that a transaction contains the expected IPFS hash.

        Returns:
            Tuple of (is_valid, message)
        """
        try:
            from web3 import Web3

            w3 = Web3(Web3.HTTPProvider(self.base_rpc_url))

            if not w3.is_connected():
                return False, "Cannot connect to Base L2"

            # Get transaction
            tx = w3.eth.get_transaction(tx_hash)
            if not tx:
                return False, "Transaction not found"

            # Decode data field
            data = tx.get("input", "")
            if isinstance(data, bytes):
                data = data.decode("utf-8", errors="ignore")
            else:
                # hex string
                data = bytes.fromhex(data[2:]).decode("utf-8", errors="ignore")

            # Check if it contains our IPFS hash
            expected_payload = f"studyforge:achievement:{expected_ipfs_hash}"
            if expected_payload in data:
                return True, "Verified on Base L2"
            else:
                return False, "IPFS hash not found in transaction"

        except ImportError:
            return False, "web3 not installed"
        except Exception as e:
            logger.error("verification_error", error=str(e))
            return False, f"Verification error: {str(e)}"

    async def get_ipfs_certificate(self, ipfs_hash: str) -> Optional[Dict[str, Any]]:
        """
        Fetch certificate from IPFS gateway.

        Returns certificate JSON or None on failure.
        """
        try:
            url = f"{self.pinata_gateway}/{ipfs_hash}"

            async with httpx.AsyncClient() as client:
                response = await client.get(url, timeout=30.0)

                if response.status_code == 200:
                    return response.json()
                else:
                    logger.error(
                        "ipfs_fetch_failed",
                        status_code=response.status_code,
                        ipfs_hash=ipfs_hash,
                    )
                    return None

        except Exception as e:
            logger.error("ipfs_fetch_error", error=str(e))
            return None


# Singleton instance
blockchain_service = BlockchainService()
