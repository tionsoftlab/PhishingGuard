from typing import Dict, Any
from urllib.parse import urlparse
import sys
import os

sys.path.append(os.path.dirname(os.path.dirname(__file__)))
from utils.logging_config import setup_colored_logging
from tools.url.config import (
    PENALTY_KNOWN_PHISHING,
    TRUST_SCORE_SAFE,
    TRUST_SCORE_SUSPICIOUS,
)
from tools.url.steps.phishing_db import load_known_phishing_sites
from tools.url.steps.redirect_checker import check_redirects
from tools.url.steps.content_analyzer import analyze_content_with_ai
from tools.url.steps.ssl_verifier import verify_ssl
from tools.url.steps.ml_analyzer import analyze_with_ml_models

logger = setup_colored_logging(__name__)


async def analyze_url(url: str) -> Dict[str, Any]:
    logger.info(f"===== URL 분석 시작: {url} =====")

    base_trust_score = 100
    current_trust_score = base_trust_score

    results = {"url": url, "base_trust_score": base_trust_score, "steps": {}}

    step0_result = await check_redirects(url)
    results["steps"]["step0"] = step0_result
    current_trust_score -= step0_result.get("penalty", 0)

    if step0_result.get("redirect_count", 0) >= 20:
        logger.warning("무한 리디렉션 발생 (20회 이상) - 추가 검사 중단")
        results["final_trust_score"] = 0
        results["final_status"] = "DANGER"
        results["final_url"] = step0_result.get("final_url", url)
        results["message"] = "무한 리디렉션 발생 (20회 초과)으로 분석 중단"

        logger.info(f"===== URL 분석 완료: 신뢰도 0점, 상태 DANGER =====")
        return results

    redirect_chain = step0_result.get("redirect_chain", [url])
    final_url = step0_result.get("final_url", url)

    logger.info(
        f"단계 1: Known 피싱 사이트 검사 시작 (총 {len(redirect_chain)}개 URL 검사)"
    )

    is_known_phishing = False
    matched_entry = None
    matched_url = None

    known_sites = load_known_phishing_sites()

    for check_url in redirect_chain:
        try:
            parsed = urlparse(check_url)
            domain = parsed.netloc.lower()
            full_url = check_url.lower().replace("http://", "").replace("https://", "")

            for entry in known_sites:
                if entry == domain or entry == full_url:
                    is_known_phishing = True
                    matched_entry = entry
                    matched_url = check_url
                    break

            if is_known_phishing:
                break

        except Exception as e:
            logger.error(f"URL 검사 오류 ({check_url}): {e}")
            continue

    if is_known_phishing:
        logger.warning(f"알려진 피싱 사이트 발견: {matched_entry} (URL: {matched_url})")
        step1_result = {
            "step": 1,
            "name": "Known 피싱 사이트 검사",
            "is_known_phishing": True,
            "matched_entry": matched_entry,
            "matched_url": matched_url,
            "checked_urls": redirect_chain,
            "penalty": PENALTY_KNOWN_PHISHING,
            "status": "DANGER",
            "message": f"알려진 피싱 사이트입니다: {matched_entry}",
        }
        results["steps"]["step1"] = step1_result
        current_trust_score -= PENALTY_KNOWN_PHISHING

        results["final_trust_score"] = max(0, current_trust_score)
        results["final_status"] = "DANGER"
        results["final_url"] = final_url
        results["message"] = "알려진 피싱 사이트입니다"

        logger.warning("Known 피싱 사이트 발견 - 추가 검사 생략")
        logger.info(f"===== URL 분석 완료: 신뢰도 0점, 상태 DANGER =====")
        return results
    else:
        logger.info(f"모든 URL이 알려진 피싱 사이트 DB에 없음")
        step1_result = {
            "step": 1,
            "name": "Known 피싱 사이트 검사",
            "is_known_phishing": False,
            "checked_urls": redirect_chain,
            "penalty": 0,
            "status": "SAFE",
            "message": f"{len(redirect_chain)}개 URL 모두 피싱 DB에 없음",
        }
        results["steps"]["step1"] = step1_result

    step1_5_result = await analyze_with_ml_models(url, final_url=final_url)
    results["steps"]["step1.5"] = step1_5_result
    current_trust_score -= step1_5_result.get("penalty", 0)

    step2_result = await analyze_content_with_ai(final_url)
    results["steps"]["step2"] = step2_result
    current_trust_score -= step2_result.get("penalty", 0)

    step3_result = await verify_ssl(final_url)
    results["steps"]["step3"] = step3_result
    current_trust_score -= step3_result.get("penalty", 0)

    from tools.url.steps.screenshot_capturer import capture_screenshot

    step4_result = await capture_screenshot(final_url)
    results["steps"]["step4"] = step4_result

    if step4_result.get("status") == "SUCCESS":
        results["screenshot_url"] = step4_result.get("screenshot_url")

    final_trust_score = max(0, min(100, current_trust_score))

    if final_trust_score >= TRUST_SCORE_SAFE:
        final_status = "SAFE"
    elif final_trust_score >= TRUST_SCORE_SUSPICIOUS:
        final_status = "SUSPICIOUS"
    else:
        final_status = "DANGER"

    results["final_trust_score"] = final_trust_score
    results["final_status"] = final_status
    results["final_url"] = final_url
    results["message"] = f"최종 신뢰도: {final_trust_score}점"

    try:
        from utils.summary_generator import generate_summary_async

        summary = await generate_summary_async(results, "url")
        results["easy_summary"] = summary.get("easy_summary")
        results["expert_summary"] = summary.get("expert_summary")
        logger.info("URL 분석 결과 요약 생성 완료")
    except Exception as e:
        logger.error(f"요약 생성 중 오류: {e}")

    logger.info(
        f"===== URL 분석 완료: 신뢰도 {final_trust_score}점, 상태 {final_status} ====="
    )

    return results
