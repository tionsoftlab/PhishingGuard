import os
import csv
from typing import List
import sys

sys.path.append(os.path.dirname(os.path.dirname(__file__)))
from utils.logging_config import setup_colored_logging
from tools.url.config import ISCX_DB_PATH, KISA_DB_PATH

logger = setup_colored_logging(__name__)

_phishing_sites_cache = None


def load_known_phishing_sites() -> List[str]:
    global _phishing_sites_cache

    if _phishing_sites_cache is not None:
        return _phishing_sites_cache

    try:
        sites = set()

        if os.path.exists(ISCX_DB_PATH):
            with open(ISCX_DB_PATH, "r", encoding="utf-8", errors="ignore") as f:
                reader = csv.DictReader(f)
                for row in reader:
                    if "url" in row and row["url"]:
                        url = row["url"].strip().lower()
                        url = url.replace("http://", "").replace("https://", "")
                        sites.add(url)
            logger.info(f"ISCX_URL.csv 로드 완료: {len(sites)}개 항목")

        if os.path.exists(KISA_DB_PATH):
            with open(KISA_DB_PATH, "r", encoding="utf-8", errors="ignore") as f:
                for line in f:
                    url = line.strip().lower()
                    if url and not url.startswith("http"):
                        url = url.replace("http://", "").replace("https://", "")
                        sites.add(url)
            logger.info(f"KISA_URL.csv 로드 완료: 총 {len(sites)}개 항목")

        _phishing_sites_cache = list(sites)
        logger.info(f"피싱 사이트 DB 로드 완료: 총 {len(_phishing_sites_cache)}개 항목")
        return _phishing_sites_cache

    except Exception as e:
        logger.error(f"피싱 사이트 DB 로드 실패: {e}")
        _phishing_sites_cache = []
        return []
