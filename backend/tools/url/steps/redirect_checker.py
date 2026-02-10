from typing import Dict, Any
from urllib.parse import urlparse
from playwright.async_api import async_playwright
import sys
import os

sys.path.append(os.path.dirname(os.path.dirname(__file__)))
from utils.logging_config import setup_colored_logging
from tools.url.config import PENALTY_REDIRECT_3_PLUS, PENALTY_REDIRECT_PER_EXTRA

logger = setup_colored_logging(__name__)


async def check_redirects(url: str) -> Dict[str, Any]:
    logger.info("단계 0: 리디렉션 검사 시작")

    redirect_chain = []
    redirect_count = 0
    final_url = url

    try:
        async with async_playwright() as p:
            browser = await p.chromium.launch(headless=True)
            context = await browser.new_context(
                user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
                ignore_https_errors=True,
            )

            async def create_monitored_page():
                page = await context.new_page()

                async def handle_response(response):
                    nonlocal redirect_count
                    if 300 <= response.status < 400:
                        redirect_count += 1
                        if redirect_count >= 20:
                            logger.warning(f"리디렉션 한계 도달 (20회). 중단합니다.")
                            await page.close()

                page.on("response", handle_response)
                return page

            page = await create_monitored_page()
            redirect_chain.append(url)

            try:
                await page.goto(url, wait_until="load", timeout=15000)
                final_url = page.url
            except Exception as e:
                error_msg = str(e)
                if redirect_count >= 20:
                    logger.warning("무한 리디렉션 탐지되어 중단됨")
                    final_url = "Stopped due to infinite redirect"
                else:
                    logger.warning(f"페이지 로드 중 오류: {error_msg}")

                    if (
                        "ERR_CERT" in error_msg
                        or "SSL" in error_msg
                        or "ERR_CONNECTION_REFUSED" in error_msg
                        or "chrome-error" in error_msg
                    ) and redirect_count < 20:
                        if url.startswith("https://"):
                            http_url = url.replace("https://", "http://", 1)
                            logger.info(
                                f"SSL/연결 오류로 인해 HTTP로 재시도: {http_url}"
                            )
                            try:
                                await page.close()
                                page = await create_monitored_page()

                                await page.goto(
                                    http_url, wait_until="load", timeout=15000
                                )
                                final_url = page.url
                                logger.info(f"HTTP 재시도 성공. 최종 URL: {final_url}")
                            except Exception as retry_e:
                                if redirect_count >= 20:
                                    logger.warning("HTTP 재시도 중 무한 리디렉션 탐지")
                                else:
                                    logger.error(
                                        f"Playwright HTTP 재시도 실패: {retry_e}"
                                    )

                                    try:
                                        import requests

                                        logger.info(
                                            "Requests 라이브러리로 최종 접속 시도"
                                        )
                                        resp = requests.get(
                                            http_url, timeout=10, verify=False
                                        )
                                        final_url = resp.url
                                        if len(resp.history) > 0:
                                            redirect_count += len(resp.history)
                                        logger.info(
                                            f"Requests 성공. 최종 URL: {final_url}"
                                        )
                                    except Exception as req_e:
                                        logger.error(f"Requests 시도 실패: {req_e}")
                                        final_url = http_url

            if final_url != url and final_url != "Stopped due to infinite redirect":
                redirect_chain.append(final_url)
                if redirect_count == 0:
                    redirect_count = 1

            await browser.close()

        if "10.200.74.91" in final_url:
            logger.info(
                f"내부 차단 페이지(10.200.74.91) 리디렉션 감지 - 원본 URL로 복귀: {url}"
            )
            final_url = url
            redirect_count = 0
            redirect_chain = [url]

        penalty = 0
        if redirect_count >= 20:
            penalty = 100
        elif redirect_count >= 3:
            penalty = PENALTY_REDIRECT_3_PLUS
            extra_redirects = redirect_count - 3
            penalty += extra_redirects * PENALTY_REDIRECT_PER_EXTRA

        status = (
            "DANGER"
            if redirect_count >= 20
            else ("SUSPICIOUS" if redirect_count >= 3 else "SAFE")
        )

        logger.info(f"리디렉션 횟수: {redirect_count}, 감점: {penalty}")

        return {
            "step": 0,
            "name": "리디렉션 검사",
            "redirect_count": redirect_count,
            "redirect_chain": redirect_chain,
            "final_url": final_url,
            "penalty": penalty,
            "status": status,
            "message": (
                f"리디렉션 {redirect_count}회 발생 (무한 리디렉션 의심)"
                if redirect_count >= 20
                else (
                    f"리디렉션 {redirect_count}회 발생"
                    if redirect_count > 0
                    else "리디렉션 없음"
                )
            ),
        }

    except Exception as e:
        logger.error(f"리디렉션 검사 오류: {e}")
        return {
            "step": 0,
            "name": "리디렉션 검사",
            "error": str(e),
            "penalty": 0,
            "status": "ERROR",
        }
