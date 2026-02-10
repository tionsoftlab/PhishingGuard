import os
from openai import OpenAI
from utils.logging_config import setup_colored_logging

logger = setup_colored_logging(__name__)
client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))


def generate_summary(result_data: dict, scan_type: str) -> dict:
    try:
        logger.info(f"{scan_type} 검사 결과 요약 생성 시작")

        scan_type_korean = {
            "url": "URL",
            "sms": "문자 메시지",
            "qr": "QR 코드",
            "voice": "음성 통화",
            "email": "이메일",
        }.get(scan_type, scan_type)

        import json

        # 핵심 수치를 미리 추출하여 프롬프트에 명시적으로 전달
        key_metrics = {}
        steps = result_data.get("steps", {})
        step1 = steps.get("step1", {})
        if "phishing_probability" in step1:
            key_metrics["ml_phishing_prob"] = f"{step1['phishing_probability']:.4f}"
            key_metrics["ml_phishing_pct"] = (
                f"{step1['phishing_probability'] * 100:.2f}%"
            )
        if "ensemble_result" in step1:
            key_metrics["ensemble_result"] = step1["ensemble_result"]
        key_metrics["final_trust_score"] = result_data.get("final_trust_score", "N/A")
        key_metrics["final_status"] = result_data.get("final_status", "N/A")

        step2 = steps.get("step2", {})
        if "ai_confidence" in step2:
            key_metrics["ai_confidence"] = f"{step2['ai_confidence'] * 100:.0f}%"
            key_metrics["ai_is_phishing"] = step2.get("is_phishing", "N/A")

        ai_analysis = steps.get("ai_analysis", {})
        if ai_analysis:
            key_metrics["ai_risk_level"] = ai_analysis.get("risk_level", "N/A")

        key_metrics_str = json.dumps(key_metrics, ensure_ascii=False, indent=2)
        result_str = json.dumps(result_data, ensure_ascii=False, indent=2)

        system_prompt = f"""당신은 보안 전문가입니다. {scan_type_korean} 검사 결과를 두 가지 방식으로 요약해야 합니다:

1. **쉬운 정리**: 일반 사용자가 이해하기 쉽게, 핵심만 간단명료하게 2-3문장으로 요약
2. **전문가 정리**: 보안 전문가나 기술적 이해도가 높은 사용자를 위한 상세한 요약 (3-5문장)

**절대 규칙 (위반 시 오류)**:
- 검사 결과의 수치(확률, 점수, 퍼센트 등)를 절대로 변경, 과장, 왜곡, 반올림하지 마세요
- 반드시 아래 "핵심 수치"에 제시된 정확한 값을 그대로 인용하세요
- 예: ML 피싱 확률이 4.44%이면 반드시 "4.44%"라고 써야 하며, "100%"나 "높은 확률"로 바꾸는 것은 절대 금지
- ML 모델의 앙상블 판정이 "안전(SAFE)"이면 반드시 "안전"이라고 써야 하며, "위험"으로 바꾸는 것은 절대 금지
- 수치를 모르거나 없으면 언급하지 마세요. 추측하거나 만들어내지 마세요

요약은 반드시 한국어로 작성하며, 다음 형식의 JSON으로 응답하세요:
{{
  "easy_summary": "쉬운 정리 내용",
  "expert_summary": "전문가 정리 내용"
}}"""

        user_prompt = f"""다음 {scan_type_korean} 검사 결과를 요약해주세요:

=== 핵심 수치 (반드시 이 값을 정확히 인용) ===
{key_metrics_str}

=== 전체 검사 결과 ===
{result_str}

**중요**: 반드시 위 검사 결과의 구체적인 내용을 바탕으로 작성하세요.
- "검사가 완료되었습니다"와 같은 일반적 문구는 절대 사용하지 마세요
- 위 "핵심 수치"의 정확한 값을 반드시 그대로 인용하세요. 수치를 변경하면 안 됩니다!
- 쉬운 정리: 안전/위험/의심 여부를 명확히 판단하여 2-3문장으로
- 전문가 정리: 분석 과정과 기술적 근거를 포함하여 3-5문장으로"""

        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
            temperature=0.7,
            max_tokens=500,
            response_format={"type": "json_object"},
        )

        summary_data = json.loads(response.choices[0].message.content)

        logger.info(f"{scan_type} 검사 결과 요약 생성 완료")
        logger.info(
            f"생성된 요약 - 쉬운: {summary_data.get('easy_summary', '')[:50]}..."
        )
        return {
            "easy_summary": summary_data.get(
                "easy_summary", "요약을 생성할 수 없습니다."
            ),
            "expert_summary": summary_data.get(
                "expert_summary", "요약을 생성할 수 없습니다."
            ),
        }

    except Exception as e:
        logger.error(f"요약 생성 중 오류 발생: {str(e)}")
        import traceback

        logger.error(traceback.format_exc())
        return {
            "easy_summary": "요약 생성에 실패했습니다. 검사 결과를 직접 확인해주세요.",
            "expert_summary": "요약 생성 중 오류가 발생했습니다. 상세 분석 결과를 참고하시기 바랍니다.",
        }


async def generate_summary_async(result_data: dict, scan_type: str) -> dict:
    import asyncio

    return await asyncio.to_thread(generate_summary, result_data, scan_type)
