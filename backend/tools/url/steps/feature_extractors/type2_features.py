import re
import requests
from urllib.parse import urlparse
from datetime import datetime
from bs4 import BeautifulSoup
from typing import Dict
import whois
import sys
import os

sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(__file__))))
from utils.logging_config import setup_colored_logging

logger = setup_colored_logging(__name__)

SHORT_URL_LIST_PATH = os.path.join(
    os.path.dirname(
        os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(__file__))))
    ),
    "data",
    "short",
    "list.txt",
)

SHORT_URL_SERVICES = []


def load_short_url_services():
    global SHORT_URL_SERVICES
    try:
        if not os.path.exists(SHORT_URL_LIST_PATH):
            logger.warning(f"단축 URL 리스트 파일이 없습니다: {SHORT_URL_LIST_PATH}")
            SHORT_URL_SERVICES = [
                "bit.ly",
                "goo.gl",
                "tinyurl.com",
                "t.co",
                "ow.ly",
                "is.gd",
                "buff.ly",
            ]
            return

        with open(SHORT_URL_LIST_PATH, "r", encoding="utf-8") as f:
            SHORT_URL_SERVICES = [
                line.strip() for line in f if line.strip() and not line.startswith("#")
            ]

        logger.info(
            f"단축 URL 서비스 목록 로드 완료: {len(SHORT_URL_SERVICES)}개 도메인"
        )

    except Exception as e:
        logger.error(f"단축 URL 리스트 로드 실패: {e}")
        SHORT_URL_SERVICES = [
            "bit.ly",
            "goo.gl",
            "tinyurl.com",
            "t.co",
            "ow.ly",
            "is.gd",
            "buff.ly",
        ]


def extract_type2_features(url: str, final_url: str = None) -> Dict[str, int]:
    features = {}
    target_url = final_url if final_url else url

    try:
        parsed = urlparse(url)
        domain = parsed.netloc.replace("www.", "")

        ip_pattern = re.compile(r"^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$")
        features["UsingIP"] = 1 if ip_pattern.match(domain) else -1

        features["LongURL"] = 1 if len(url) >= 75 else -1

        features["ShortURL"] = (
            1 if any(service in domain for service in SHORT_URL_SERVICES) else -1
        )

        features["Symbol@"] = 1 if "@" in url else -1

        url_without_protocol = url.split("://")[1] if "://" in url else url
        features["Redirecting//"] = 1 if "//" in url_without_protocol else -1

        features["PrefixSuffix-"] = 1 if "-" in domain else -1

        subdomains = domain.count(".")
        features["SubDomains"] = 1 if subdomains >= 3 else -1

        features["HTTPS"] = -1 if parsed.scheme == "https" else 1

        target_parsed = urlparse(target_url)
        target_domain = target_parsed.netloc.replace("www.", "")

        try:
            w = whois.whois(target_domain)
            creation_date = w.creation_date
            if isinstance(creation_date, list):
                creation_date = creation_date[0]

            if creation_date:
                days = (datetime.now() - creation_date).days
                features["DomainRegLen"] = -1 if days >= 365 else 1
            else:
                features["DomainRegLen"] = 1
        except:
            features["DomainRegLen"] = 1

        try:
            response = requests.get(target_url, timeout=10)
            soup = BeautifulSoup(response.content, "html.parser")
            html_content = response.text

            favicon = soup.find("link", rel="icon") or soup.find(
                "link", rel="shortcut icon"
            )
            if favicon and favicon.get("href"):
                favicon_url = favicon.get("href")
                if favicon_url.startswith("http"):
                    favicon_domain = urlparse(favicon_url).netloc
                    features["Favicon"] = 1 if favicon_domain != target_domain else -1
                else:
                    features["Favicon"] = -1
            else:
                features["Favicon"] = -1

            port = target_parsed.port
            features["NonStdPort"] = 1 if port and port not in [80, 443] else -1

            features["HTTPSDomainURL"] = 1 if "https" in target_domain.lower() else -1

            external_resources = 0
            total_resources = 0

            for tag in soup.find_all(["img", "script", "link"]):
                src = tag.get("src") or tag.get("href")
                if src:
                    total_resources += 1
                    if src.startswith("http") and target_domain not in src:
                        external_resources += 1

            if total_resources > 0:
                external_ratio = external_resources / total_resources
                features["RequestURL"] = 1 if external_ratio > 0.22 else -1
            else:
                features["RequestURL"] = -1

            email_pattern = re.compile(
                r"[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}"
            )
            emails = email_pattern.findall(html_content)
            features["InfoEmail"] = -1 if len(emails) > 0 else 1

            meta_refresh = soup.find("meta", attrs={"http-equiv": "refresh"})
            features["WebsiteForwarding"] = 1 if meta_refresh else -1

            disable_right_click = (
                "event.button==2" in html_content or "event.button == 2" in html_content
            )
            features["DisableRightClick"] = 1 if disable_right_click else -1

            popup_keywords = ["window.open", "popup"]
            has_popup = any(
                keyword in html_content.lower() for keyword in popup_keywords
            )
            features["UsingPopupWindow"] = 1 if has_popup else -1

            iframes = soup.find_all("iframe")
            features["IframeRedirection"] = 1 if len(iframes) > 0 else -1

            try:
                w = whois.whois(target_domain)
                creation_date = w.creation_date
                if isinstance(creation_date, list):
                    creation_date = creation_date[0]

                if creation_date:
                    months = (datetime.now() - creation_date).days / 30
                    features["AgeofDomain"] = -1 if months >= 6 else 1
                else:
                    features["AgeofDomain"] = 1
            except:
                features["AgeofDomain"] = 1

        except Exception as e:
            logger.warning(f"HTML 콘텐츠 분석 실패: {e}")
            features["Favicon"] = 1
            features["NonStdPort"] = -1
            features["HTTPSDomainURL"] = -1
            features["RequestURL"] = -1
            features["InfoEmail"] = 1
            features["WebsiteForwarding"] = -1
            features["DisableRightClick"] = -1
            features["UsingPopupWindow"] = -1
            features["IframeRedirection"] = -1
            features["AgeofDomain"] = 1

        logger.info(f"Type2 피처 추출 완료: {features}")
        return features

    except Exception as e:
        logger.error(f"Type2 피처 추출 오류: {e}")
        return {
            "UsingIP": 1,
            "LongURL": -1,
            "ShortURL": -1,
            "Symbol@": -1,
            "Redirecting//": -1,
            "PrefixSuffix-": -1,
            "SubDomains": -1,
            "HTTPS": 1,
            "DomainRegLen": 1,
            "Favicon": 1,
            "NonStdPort": -1,
            "HTTPSDomainURL": -1,
            "RequestURL": -1,
            "InfoEmail": 1,
            "WebsiteForwarding": -1,
            "DisableRightClick": -1,
            "UsingPopupWindow": -1,
            "IframeRedirection": -1,
            "AgeofDomain": 1,
        }
