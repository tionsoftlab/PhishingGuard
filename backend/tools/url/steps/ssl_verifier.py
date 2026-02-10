import ssl
import socket
from typing import Dict, Any
from urllib.parse import urlparse
from datetime import datetime
import sys
import os

sys.path.append(os.path.dirname(os.path.dirname(__file__)))
from utils.logging_config import setup_colored_logging
from tools.url.config import (
    PENALTY_NO_SSL,
    PENALTY_INVALID_SSL,
    BONUS_OV_CERT,
    BONUS_EV_CERT,
)

logger = setup_colored_logging(__name__)


async def verify_ssl(url: str) -> Dict[str, Any]:
    logger.info("단계 3: SSL 인증서 검증 시작")

    try:
        parsed = urlparse(url)
        hostname = parsed.netloc

        if parsed.scheme != "https":
            logger.warning("HTTP 연결 - SSL 없음")
            return {
                "step": 3,
                "name": "SSL 인증서 검증",
                "has_ssl": False,
                "penalty": PENALTY_NO_SSL,
                "status": "WARNING",
                "message": "안전하지 않은 HTTP 연결",
            }

        context = ssl.create_default_context()

        with socket.create_connection((hostname, 443), timeout=5) as sock:
            with context.wrap_socket(sock, server_hostname=hostname) as ssock:
                cert = ssock.getpeercert()

        issuer = dict(x[0] for x in cert.get("issuer", []))
        subject = dict(x[0] for x in cert.get("subject", []))
        not_after = cert.get("notAfter")

        issuer_cn = issuer.get("commonName", "")
        subject_cn = subject.get("commonName", "")

        expiry_date = datetime.strptime(not_after, "%b %d %H:%M:%S %Y %Z")
        is_expired = expiry_date < datetime.now()

        if is_expired:
            logger.warning("SSL 인증서 만료됨")
            return {
                "step": 3,
                "name": "SSL 인증서 검증",
                "has_ssl": True,
                "is_valid": False,
                "issuer": issuer_cn,
                "expiry": not_after,
                "penalty": PENALTY_INVALID_SSL,
                "status": "WARNING",
                "message": "SSL 인증서가 만료되었습니다",
            }

        cert_type = "DV"
        bonus = 0

        if subject.get("organizationName"):
            if len(subject.get("organizationName", "")) > 0:
                cert_type = "OV"
                bonus = BONUS_OV_CERT

        penalty = -bonus

        logger.info(f"SSL 인증서 검증 완료 - 타입: {cert_type}, 발급자: {issuer_cn}")

        return {
            "step": 3,
            "name": "SSL 인증서 검증",
            "has_ssl": True,
            "is_valid": True,
            "cert_type": cert_type,
            "issuer": issuer_cn,
            "expiry": not_after,
            "penalty": penalty,
            "bonus": bonus,
            "status": "SAFE",
            "message": f"유효한 {cert_type} 인증서 (발급자: {issuer_cn})",
        }

    except Exception as e:
        logger.error(f"SSL 인증서 검증 오류: {e}")
        return {
            "step": 3,
            "name": "SSL 인증서 검증",
            "error": str(e),
            "penalty": PENALTY_INVALID_SSL,
            "status": "WARNING",
            "message": f"SSL 인증서 검증 실패: {str(e)}",
        }
