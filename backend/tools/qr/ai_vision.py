"""
AI 기반 QR 컨텍스트 예측 유틸리티
OpenAI Vision API를 사용하여 QR 외곽 텍스트로 QR 내용 추측
"""

import base64
from typing import Dict, Any
from openai import OpenAI
import os
import sys
import json

sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(__file__))))
from utils.logging_config import setup_colored_logging

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


async def predict_qr_context_with_vision(base64_image: str) -> Dict[str, Any]:
    logger.info("AI 기반 QR 컨텍스트 예측 시작")

    try:
        if "," in base64_image:
            base64_image = base64_image.split(",")[1]

        client = get_openai_client()

        prompt = """이 이미지에는 QR 코드가 포함되어 있습니다.

**중요**: QR 코드 자체는 절대 디코딩하거나 읽지 마세요!

당신의 임무는 **오직 QR 코드 외곽에 있는 텍스트, 로고, 이미지, 디자인만** 분석하여 
이 QR 코드가 어떤 내용을 담고 있을지 **추측**하는 것입니다.

분석 대상 (QR 코드 외곽만):
- QR 코드 주변에 적힌 텍스트
- 회사 이름, 브랜드명, 로고
- 제목, 부제, 설명문
- 광고 문구나 홍보 문구
- 전단지/포스터의 전체적인 맥락

절대 하지 말 것:
❌ QR 코드 자체를 스캔하거나 디코딩
❌ QR 패턴을 분석하여 내용 파악
❌ QR 코드에 담긴 실제 데이터 추출

다음 JSON 형식으로 답변하세요:
{
  "prediction": "외곽 텍스트를 바탕으로 QR이 담고 있을 것으로 추측되는 내용 (예: '네이버 홈페이지', '음식점 메뉴', '이벤트 참여 페이지' 등)",
  "confidence": 0-100 (추측의 확신도),
  "context_found": true/false (외곽에 의미있는 정보가 있었는지),
  "reasoning": "어떤 외곽 텍스트/요소를 보고 이렇게 추측했는지 상세히 설명",
  "status": "success" 또는 "insufficient_info"
}

**status는 다음 경우에만 "insufficient_info"로 설정하세요:**
- QR 외곽에 텍스트나 로고가 전혀 없음
- 있어도 너무 애매모호해서 추측이 불가능
- 빈 배경에 QR만 덩그러니 있음

반드시 JSON 형식으로만 답변하세요."""

        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {
                    "role": "user",
                    "content": [
                        {"type": "text", "text": prompt},
                        {
                            "type": "image_url",
                            "image_url": {
                                "url": f"data:image/jpeg;base64,{base64_image}"
                            },
                        },
                    ],
                }
            ],
            response_format={"type": "json_object"},
            max_tokens=500,
        )

        ai_result_text = response.choices[0].message.content
        ai_result = json.loads(ai_result_text)

        logger.info(
            f"AI 분석 완료 - Status: {ai_result.get('status')}, Confidence: {ai_result.get('confidence')}%"
        )

        if ai_result.get("status") == "insufficient_info":
            logger.warning("정보 부족으로 QR 내용 추측 불가능")
            return {
                "prediction": None,
                "confidence": 0,
                "context_found": False,
                "reasoning": ai_result.get(
                    "reasoning", "외곽에 정보가 부족하여 QR 내용을 추측할 수 없습니다"
                ),
                "status": "insufficient_info",
                "result_code": -1,
            }

        return {
            "prediction": ai_result.get("prediction"),
            "confidence": ai_result.get("confidence", 0),
            "context_found": ai_result.get("context_found", False),
            "reasoning": ai_result.get("reasoning", ""),
            "status": "success",
            "result_code": 1,
        }

    except Exception as e:
        logger.error(f"AI QR 컨텍스트 예측 오류: {e}")
        return {
            "prediction": None,
            "confidence": 0,
            "context_found": False,
            "reasoning": f"오류 발생: {str(e)}",
            "status": "error",
            "result_code": -1,
        }
