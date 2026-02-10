import re
import requests
import whois
import time
from datetime import datetime
from typing import Dict
from urllib.parse import urlparse
import sys
import os

sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(__file__))))
from utils.logging_config import setup_colored_logging

logger = setup_colored_logging(__name__)


def extract_type1_features(url: str, final_url: str = None) -> Dict[str, any]:
    features = {}
    target_url = final_url if final_url else url

    try:
        features["URL_LENGTH"] = len(url)

        special_chars = re.findall(r"[^a-zA-Z0-9]", url)
        features["NUMBER_SPECIAL_CHARACTERS"] = len(special_chars)

        try:
            response = requests.head(target_url, timeout=5, allow_redirects=True)
            headers = response.headers

            content_type = headers.get("Content-Type", "")
            if "charset=" in content_type:
                charset = content_type.split("charset=")[1].split(";")[0].strip()
                features["CHARSET"] = charset
            else:
                features["CHARSET"] = "Unknown"

            features["SERVER"] = headers.get("Server", "Unknown")

            content_length = headers.get("Content-Length", -1)
            try:
                features["CONTENT_LENGTH"] = int(content_length)
            except:
                features["CONTENT_LENGTH"] = -1

        except Exception as e:
            logger.warning(f"HTTP 헤더 가져오기 실패: {e}")
            features["CHARSET"] = "Unknown"
            features["SERVER"] = "Unknown"
            features["CONTENT_LENGTH"] = -1

        try:
            parsed = urlparse(target_url)
            domain = parsed.netloc.replace("www.", "")

            w = whois.whois(domain)

            country = "Unknown"

            if hasattr(w, "country") and w.country:
                if isinstance(w.country, list):
                    country = w.country[0]
                else:
                    country = w.country

            if (
                (not country or country.lower() == "unknown")
                and hasattr(w, "text")
                and w.text
            ):
                country_patterns = [
                    r"Registrant Country:\s*([A-Za-z]+)",
                    r"Admin Country:\s*([A-Za-z]+)",
                    r"Tech Country:\s*([A-Za-z]+)",
                    r"Country:\s*([A-Za-z]+)",
                ]
                for pattern in country_patterns:
                    match = re.search(pattern, w.text, re.IGNORECASE)
                    if match:
                        country = match.group(1).strip()
                        break
            features["WHOIS_COUNTRY"] = country if country else "Unknown"

            state = "Unknown"

            if hasattr(w, "state") and w.state:
                if isinstance(w.state, list):
                    state = w.state[0]
                else:
                    state = w.state

            if (
                (not state or state.lower() == "unknown")
                and hasattr(w, "text")
                and w.text
            ):
                state_patterns = [
                    r"Registrant State/Province:\s*(.+)",
                    r"Admin State/Province:\s*(.+)",
                    r"Tech State/Province:\s*(.+)",
                    r"State/Province:\s*(.+)",
                ]
                for pattern in state_patterns:
                    match = re.search(pattern, w.text, re.IGNORECASE)
                    if match:
                        state = match.group(1).strip()
                        break
            features["WHOIS_STATEPRO"] = state if state else "Unknown"

            creation_date = w.creation_date
            if isinstance(creation_date, list):
                creation_date = creation_date[0]

            if not creation_date and w.text:
                date_patterns = [
                    r"Creation Date:\s*(.+)",
                    r"Registered on:\s*(.+)",
                    r"Created on:\s*(.+)",
                ]
                for pattern in date_patterns:
                    match = re.search(pattern, w.text, re.IGNORECASE)
                    if match:
                        try:
                            date_str = match.group(1).strip()
                            if "T" in date_str:
                                creation_date = datetime.strptime(
                                    date_str.split("T")[0], "%Y-%m-%d"
                                )
                            break
                        except:
                            pass

            if creation_date:
                if isinstance(creation_date, str):
                    try:
                        if "T" in creation_date:
                            creation_date = datetime.strptime(
                                creation_date.split("T")[0], "%Y-%m-%d"
                            )
                        else:
                            creation_date = datetime.strptime(creation_date, "%Y-%m-%d")
                    except:
                        pass

                if isinstance(creation_date, datetime):
                    diff = (datetime.now() - creation_date).days
                    features["WHOIS_DATE_DIFF"] = diff
                else:
                    features["WHOIS_DATE_DIFF"] = -1
            else:
                features["WHOIS_DATE_DIFF"] = -1

        except Exception as e:
            logger.warning(f"WHOIS 정보 가져오기 실패: {e}")
            features["WHOIS_COUNTRY"] = "Unknown"
            features["WHOIS_STATEPRO"] = "Unknown"
            features["WHOIS_DATE_DIFF"] = -1

        try:
            import socket

            parsed = urlparse(target_url)
            domain = parsed.netloc.replace("www.", "")

            start = time.time()
            socket.gethostbyname(domain)
            dns_time = (time.time() - start) * 1000
            features["DNS_QUERY_TIMES"] = dns_time
        except Exception as e:
            logger.warning(f"DNS 쿼리 실패: {e}")
            features["DNS_QUERY_TIMES"] = -1

        logger.info(f"Type1 피처 추출 완료: {features}")
        return features

    except Exception as e:
        logger.error(f"Type1 피처 추출 오류: {e}")
        return {
            "URL_LENGTH": len(url),
            "NUMBER_SPECIAL_CHARACTERS": 0,
            "CHARSET": "Unknown",
            "SERVER": "Unknown",
            "CONTENT_LENGTH": -1,
            "WHOIS_COUNTRY": "Unknown",
            "WHOIS_STATEPRO": "Unknown",
            "WHOIS_DATE_DIFF": -1,
            "DNS_QUERY_TIMES": -1,
        }
