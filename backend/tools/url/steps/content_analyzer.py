import os
import json
from typing import Dict, Any
from playwright.async_api import async_playwright
from openai import OpenAI
from bs4 import BeautifulSoup
import sys

sys.path.append(os.path.dirname(os.path.dirname(__file__)))
from utils.logging_config import setup_colored_logging
from tools.url.config import (
    MAX_CRAWL_CHARS,
    PENALTY_AI_HIGH_RISK,
    PENALTY_AI_MEDIUM_RISK,
)

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


async def analyze_content_with_ai(url: str) -> Dict[str, Any]:
    logger.info("단계 2: AI 사이트 내용 분석 시작")

    try:
        async with async_playwright() as p:
            browser = await p.chromium.launch(headless=True)
            context = await browser.new_context()
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

        logger.info("OpenAI API 호출 시작")

        client = get_openai_client()

        prompt = f"""다음은 웹사이트에서 크롤링한 텍스트 내용입니다. 이 사이트가 피싱, 멀웨어, 스팸 사이트일 가능성을 분석해주세요.

웹사이트 제목: {page_title}
웹사이트 URL: {url}

크롤링된 텍스트:
{text}

위 내용을 분석하여 다음 JSON 형식으로 답변해주세요:
{{
  "risk_level": "high" | "medium" | "low",
  "is_phishing": true/false,
  "is_malware": true/false,
  "is_spam": true/false,
  "confidence": 0-100 (판단의 확신도),
  "reason": "판단 근거를 한국어로 설명",
  "suspicious_elements": ["의심스러운 요소들을 배열로 나열"]
}}

반드시 JSON 형식으로만 답변하세요."""

        response = client.chat.completions.create(
            model="o4-mini",
            messages=[
                {
                    "role": "system",
                    "content": "당신은 웹사이트 보안 전문가입니다. 사이트 내용을 분석하여 피싱, 멀웨어, 스팸 여부를 판단합니다.",
                },
                {"role": "user", "content": prompt},
            ],
            response_format={"type": "json_object"},
        )

        ai_result_text = response.choices[0].message.content
        ai_result = json.loads(ai_result_text)

        penalty = 0
        risk_level = ai_result.get("risk_level", "low")

        if risk_level == "high":
            penalty = PENALTY_AI_HIGH_RISK
            status = "DANGER"
        elif risk_level == "medium":
            penalty = PENALTY_AI_MEDIUM_RISK
            status = "SUSPICIOUS"
        else:
            penalty = 0
            status = "SAFE"

        logger.info(f"AI 분석 완료 - 위험도: {risk_level}, 감점: {penalty}")

        return {
            "step": 2,
            "name": "AI 사이트 내용 분석",
            "ai_analysis": ai_result,
            "crawled_text_length": len(text),
            "penalty": penalty,
            "status": status,
            "message": ai_result.get("reason", "AI 분석 완료"),
        }

    except Exception as e:
        logger.error(f"AI 사이트 내용 분석 오류: {e}")
        return {
            "step": 2,
            "name": "AI 사이트 내용 분석",
            "error": str(e),
            "penalty": 0,
            "status": "ERROR",
        }
