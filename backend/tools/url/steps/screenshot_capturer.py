import os
import uuid
import sys
from typing import Dict, Any
from playwright.async_api import async_playwright

sys.path.append(
    os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(__file__))))
)
from utils.logging_config import setup_colored_logging

logger = setup_colored_logging(__name__)

# 백엔드 내부 static 디렉토리에 저장
SCREENSHOT_DIR = os.path.join(
    os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(__file__)))),
    "static",
    "screenshots",
)

# 백엔드 서버 URL (포트 8088로 가정 - main.py 실행 환경에 따라 조정 필요)
# 주의: 실제 배포 환경의 도메인/포트에 맞춰야 함
# 현재 설정: https://cslab.kku.ac.kr:8088/static/screenshots
BASE_URL = "https://cslab.kku.ac.kr:8088/static/screenshots"


async def capture_screenshot(url: str) -> Dict[str, Any]:
    logger.info(f"단계 4: 스크린샷 캡처 시작 ({url})")

    if not os.path.exists(SCREENSHOT_DIR):
        try:
            os.makedirs(SCREENSHOT_DIR)
            logger.info(f"스크린샷 디렉토리 생성: {SCREENSHOT_DIR}")
        except Exception as e:
            logger.error(f"스크린샷 디렉토리 생성 실패: {e}")
            return {"step": 4, "status": "ERROR", "message": "디렉토리 생성 실패"}

    filename = f"{uuid.uuid4()}.png"
    filepath = os.path.join(SCREENSHOT_DIR, filename)
    public_url = f"{BASE_URL}/{filename}"

    try:
        async with async_playwright() as p:
            device = p.devices["Pixel 7"]
            browser = await p.chromium.launch(headless=True)

            context_options = {
                **device,
                "locale": "ko-KR",
                "timezone_id": "Asia/Seoul",
                "geolocation": {"latitude": 37.5665, "longitude": 126.9780},
                "permissions": ["geolocation"],
                "java_script_enabled": True,
                "is_mobile": True,
                "has_touch": True,
            }

            context = await browser.new_context(**context_options)

            page = await context.new_page()

            try:
                await page.goto(url, wait_until="networkidle", timeout=30000)

                await page.wait_for_load_state("domcontentloaded")

                await page.wait_for_timeout(2000)

            except Exception as e:
                logger.warning(
                    f"페이지 로드 타임아웃/오류 (부분 로드 상태로 캡처 시도): {e}"
                )
                try:
                    await page.wait_for_timeout(1000)
                except:
                    pass

            await page.screenshot(path=filepath, full_page=True)
            await browser.close()

            logger.info(f"스크린샷 저장 완료: {filepath}")

            return {
                "step": 4,
                "name": "스크린샷 캡처",
                "screenshot_path": filepath,
                "screenshot_url": public_url,
                "status": "SUCCESS",
                "message": "스크린샷 캡처 성공",
            }

    except Exception as e:
        logger.error(f"스크린샷 캡처 실패: {e}")
        return {
            "step": 4,
            "name": "스크린샷 캡처",
            "error": str(e),
            "status": "ERROR",
            "message": "스크린샷 캡처 중 오류 발생",
        }
