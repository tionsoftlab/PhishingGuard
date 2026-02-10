from typing import Dict, Any, Optional
import sys
import os

sys.path.append(os.path.dirname(os.path.dirname(__file__)))
from utils.logging_config import setup_colored_logging
from tools.qr.qr_utils import (
    get_redirect_chain,
    fetch_url_content,
    compare_content_with_openai,
    check_qr_phishing_probability,
)
from tools.url.analyzer import analyze_url

logger = setup_colored_logging(__name__)


async def analyze_qr(
    image_data: str,
    expected_text: str,
    type_number: int,
    qr_data: Optional[str] = None,
    skip_comparison: bool = False,
) -> Dict[str, Any]:
    logger.info(f"===== QR 코드 분석 시작: 타입 {type_number} =====")

    if type_number == -1:
        logger.warning("QR 코드 인식 실패")
        return {
            "type": -1,
            "status": "ERROR",
            "message": "QR 코드를 인식할 수 없습니다",
            "error": "QR code not detected",
        }

    if not qr_data:
        logger.error("QR 데이터가 제공되지 않음")
        return {
            "type": type_number,
            "status": "ERROR",
            "message": "QR 데이터가 제공되지 않았습니다",
            "error": "Missing qr_data parameter",
        }

    if type_number == 2:
        logger.info("Type 2: 비-URL QR 코드 분석 시작")

        phishing_result = await check_qr_phishing_probability(qr_data, expected_text)

        if not phishing_result.get("success", False):
            return {
                "type": 2,
                "status": "ERROR",
                "message": "큐싱 확률 분석 중 오류 발생",
                "error": phishing_result.get("error", "Unknown error"),
            }

        logger.info(
            f"큐싱 확률 분석 완료: {phishing_result.get('phishing_probability')}%"
        )

        result_data = {
            "type": 2,
            "status": "SUCCESS",
            "qr_data": qr_data,
            "expected_text": expected_text,
            "phishing_analysis": {
                "phishing_probability": phishing_result.get("phishing_probability", 0),
                "risk_level": phishing_result.get("risk_level", "low"),
                "confidence": phishing_result.get("confidence", 0),
                "reason": phishing_result.get("reason", ""),
                "suspicious_elements": phishing_result.get("suspicious_elements", []),
            },
            "message": f"큐싱 확률: {phishing_result.get('phishing_probability')}%",
        }

        try:
            from utils.summary_generator import generate_summary_async

            summary = await generate_summary_async(result_data, "qr")
            result_data["easy_summary"] = summary.get("easy_summary")
            result_data["expert_summary"] = summary.get("expert_summary")
            logger.info("QR 분석 결과 요약 생성 완료")
        except Exception as e:
            logger.error(f"요약 생성 중 오류: {e}")

        return result_data

    if type_number == 1:
        logger.info("Type 1: URL QR 코드 분석 시작")

        url = qr_data.strip()

        if not (url.startswith("http://") or url.startswith("https://")):
            if "://" not in url:
                url = "https://" + url
                logger.info(f"URL 프로토콜 추가: {url}")

        result = {
            "type": 1,
            "qr_data": qr_data,
            "url": url,
            "expected_text": expected_text,
        }

        logger.info("1단계: 리디렉션 체인 가져오기")
        redirect_result = await get_redirect_chain(url)
        result["redirect_analysis"] = redirect_result

        final_url = redirect_result.get("final_url", url)
        redirect_chain = redirect_result.get("redirect_chain", [url])

        logger.info(
            f"리디렉션 체인: {len(redirect_chain)}개 URL, 최종 URL: {final_url}"
        )

        if redirect_result.get("redirect_count", 0) >= 20:
            logger.warning("무한 리디렉션 탐지 - 분석 중단")
            result["status"] = "DANGER"
            result["message"] = "무한 리디렉션 탐지"
            return result

        logger.info("2단계: 최종 URL 컨텐츠 가져오기")
        content_result = await fetch_url_content(final_url)
        result["content_fetch"] = content_result

        if not content_result.get("success", False):
            logger.warning(f"컨텐츠 가져오기 실패: {content_result.get('error')}")

        if skip_comparison:
            logger.info("3단계: 사용자 요청으로 컨텐츠 비교 건너뜀")
            result["content_comparison"] = {
                "success": True,
                "skipped": True,
                "message": "사용자 요청으로 컨텐츠 비교를 건너뛰었습니다",
            }
        elif content_result.get("success", False):
            logger.info("3단계: OpenAI 컨텐츠 비교")
            content_text = content_result.get("content", "")
            comparison_result = await compare_content_with_openai(
                content_text, expected_text, final_url
            )
            result["content_comparison"] = comparison_result

            if comparison_result.get("success", False):
                logger.info(
                    f"컨텐츠 비교 완료 - 일치 여부: {comparison_result.get('matches', False)}"
                )
        else:
            result["content_comparison"] = {
                "success": False,
                "error": "컨텐츠를 가져올 수 없어 비교를 건너뜁니다",
            }

        logger.info("4단계: 전체 URL 분석 실행")
        url_analysis_result = await analyze_url(url)
        result["url_analysis"] = url_analysis_result

        final_trust_score = url_analysis_result.get("final_trust_score", 100)
        final_status = url_analysis_result.get("final_status", "SAFE")

        result["status"] = final_status
        result["final_trust_score"] = final_trust_score
        result["final_url"] = final_url
        result["message"] = f"QR 코드 URL 분석 완료 - 신뢰도: {final_trust_score}점"

        try:
            from utils.summary_generator import generate_summary_async

            summary = await generate_summary_async(result, "qr")
            result["easy_summary"] = summary.get("easy_summary")
            result["expert_summary"] = summary.get("expert_summary")
            logger.info("QR 분석 결과 요약 생성 완료")
        except Exception as e:
            logger.error(f"요약 생성 중 오류: {e}")

        logger.info(
            f"===== QR 코드 분석 완료: 타입 1, 신뢰도 {final_trust_score}점, 상태 {final_status} ====="
        )

        return result

    logger.error(f"지원하지 않는 타입 번호: {type_number}")
    return {
        "type": type_number,
        "status": "ERROR",
        "message": f"지원하지 않는 타입 번호입니다: {type_number}",
        "error": "Invalid type_number",
    }
