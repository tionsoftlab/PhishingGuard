import os
import json
from typing import Dict, Any
from playwright.async_api import async_playwright
from bs4 import BeautifulSoup
from openai import OpenAI
import sys

sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(__file__))))
from utils.logging_config import setup_colored_logging
from tools.url.config import MAX_CRAWL_CHARS
from tools.url.steps.redirect_checker import check_redirects

logger = setup_colored_logging(__name__)

_openai_client = None


def get_openai_client():
    global _openai_client
    if _openai_client is None:
        api_key = os.getenv("OPENAI_API_KEY")
        if not api_key:
            raise ValueError("OPENAI_API_KEY 환경변수가 설정되지 않았습니다")
        _openai_client = OpenAI(api_key=api_key)
    return _openai_client


async def get_redirect_chain(url: str) -> Dict[str, Any]:
    logger.info(f"리디렉션 체인 가져오기: {url}")
    result = await check_redirects(url)
    return result


async def fetch_url_content(url: str) -> Dict[str, Any]:
    logger.info(f"URL 컨텐츠 가져오기: {url}")

    try:
        async with async_playwright() as p:
            browser = await p.chromium.launch(headless=True)
            context = await browser.new_context(
                user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
                ignore_https_errors=True,
            )
            page = await context.new_page()

            try:
                await page.goto(url, wait_until="networkidle", timeout=15000)
                html_content = await page.content()
                page_title = await page.title()
            except Exception as e:
                logger.warning(f"페이지 로드 중 오류: {e}")
                html_content = ""
                page_title = ""

            await browser.close()

        soup = BeautifulSoup(html_content, "html.parser")

        for script in soup(["script", "style"]):
            script.decompose()

        text = soup.get_text(separator=" ", strip=True)

        if len(text) > MAX_CRAWL_CHARS:
            text = text[:MAX_CRAWL_CHARS] + "..."
            logger.info(f"크롤링 텍스트가 너무 길어 {MAX_CRAWL_CHARS}자로 제한")

        return {
            "success": True,
            "title": page_title,
            "content": text,
            "content_length": len(text),
        }

    except Exception as e:
        logger.error(f"URL 컨텐츠 가져오기 오류: {e}")
        return {
            "success": False,
            "error": str(e),
        }


async def compare_content_with_openai(
    content: str, expected_text: str, url: str
) -> Dict[str, Any]:
    logger.info("OpenAI를 사용하여 컨텐츠 비교 시작")

    try:
        client = get_openai_client()

        prompt = f"""다음은 QR 코드로 연결된 웹사이트의 내용입니다. 
사용자가 예상한 QR 코드의 목적과 실제 웹사이트 내용이 일치하는지 판단해주세요.

웹사이트 URL: {url}

웹사이트 내용:
{content}

사용자가 예상한 QR 코드의 목적:
{expected_text}

위 내용을 분석하여 다음 JSON 형식으로 답변해주세요:
{{
  "matches": true/false (예상 목적과 실제 내용이 일치하는지),
  "confidence": 0-100 (판단의 확신도),
  "reason": "판단 근거를 한국어로 설명",
  "suspicious_elements": ["의심스러운 요소가 있다면 배열로 나열, 없으면 빈 배열"]
}}

반드시 JSON 형식으로만 답변하세요."""

        response = client.chat.completions.create(
            model="o4-mini",
            messages=[
                {
                    "role": "system",
                    "content": "당신은 QR 코드 검증 전문가입니다. QR 코드의 예상 목적과 실제 연결된 웹사이트의 내용이 일치하는지 판단합니다.",
                },
                {"role": "user", "content": prompt},
            ],
            response_format={"type": "json_object"},
        )

        ai_result_text = response.choices[0].message.content
        ai_result = json.loads(ai_result_text)

        logger.info(
            f"OpenAI 컨텐츠 비교 완료 - 일치 여부: {ai_result.get('matches', False)}"
        )

        return {
            "success": True,
            "matches": ai_result.get("matches", False),
            "confidence": ai_result.get("confidence", 0),
            "reason": ai_result.get("reason", ""),
            "suspicious_elements": ai_result.get("suspicious_elements", []),
        }

    except Exception as e:
        logger.error(f"OpenAI 컨텐츠 비교 오류: {e}")
        return {
            "success": False,
            "error": str(e),
        }


async def check_qr_phishing_probability(
    qr_data: str, expected_text: str
) -> Dict[str, Any]:
    logger.info("OpenAI를 사용하여 QR 피싱 확률 분석 시작")

    try:
        client = get_openai_client()

        prompt = f"""다음은 QR 코드에서 추출된 데이터입니다. 
이 QR 코드가 피싱을 위한 큐싱(Qishing)일 가능성을 분석해주세요.

QR 코드 데이터:
{qr_data}

사용자가 예상한 QR 코드의 목적:
{expected_text}

위 내용을 분석하여 다음 JSON 형식으로 답변해주세요:
{{
  "phishing_probability": 0-100 (큐싱일 확률, 숫자),
  "risk_level": "high" | "medium" | "low",
  "confidence": 0-100 (판단의 확신도),
  "reason": "판단 근거를 한국어로 상세히 설명",
  "suspicious_elements": ["의심스러운 요소들을 배열로 나열"]
}}

큐싱(Qishing)은 QR 코드를 이용한 피싱 공격으로, 사용자를 속여 악성 사이트로 유도하거나 민감한 정보를 탈취하는 공격입니다.
예상 목적과 실제 데이터의 불일치, 의심스러운 패턴, 악의적인 요소 등을 고려하여 판단해주세요.

반드시 JSON 형식으로만 답변하세요."""

        response = client.chat.completions.create(
            model="o4-mini",
            messages=[
                {
                    "role": "system",
                    "content": "당신은 QR 코드 보안 전문가입니다. QR 코드 데이터를 분석하여 큐싱(Qishing) 공격 여부를 판단합니다.",
                },
                {"role": "user", "content": prompt},
            ],
            response_format={"type": "json_object"},
        )

        ai_result_text = response.choices[0].message.content
        ai_result = json.loads(ai_result_text)

        logger.info(
            f"OpenAI 큐싱 확률 분석 완료 - 확률: {ai_result.get('phishing_probability', 0)}%"
        )

        return {
            "success": True,
            "phishing_probability": ai_result.get("phishing_probability", 0),
            "risk_level": ai_result.get("risk_level", "low"),
            "confidence": ai_result.get("confidence", 0),
            "reason": ai_result.get("reason", ""),
            "suspicious_elements": ai_result.get("suspicious_elements", []),
        }

    except Exception as e:
        logger.error(f"OpenAI 큐싱 확률 분석 오류: {e}")
        return {
            "success": False,
            "error": str(e),
        }
