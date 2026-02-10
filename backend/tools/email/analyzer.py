import os
import openai
import json
import logging
import asyncio
from tools.url.analyzer import analyze_url

logger = logging.getLogger(__name__)


async def analyze_email(text: str):
    try:
        ai_result = await analyze_email_with_ai(text)

        final_status = ai_result.get("status", "UNKNOWN")
        trust_score = ai_result.get("trust_score", 50)
        threat_types = ai_result.get("threat_types", [])
        suspicious_urls = ai_result.get("suspicious_urls", [])

        url_analysis_results = []

        if suspicious_urls:
            logger.info(f"Checking suspicious URLs found in email: {suspicious_urls}")
            for url in suspicious_urls:
                try:
                    url_result = await analyze_url(url)
                    url_analysis_results.append({"url": url, "result": url_result})

                    url_status = url_result.get("final_status", "UNKNOWN")
                    url_score = url_result.get("final_trust_score", 100)

                    if url_status == "DANGER":
                        final_status = "DANGER"
                        trust_score = min(trust_score, url_score)
                        threat_types.append("악성 URL")
                    elif url_status == "WARNING" and final_status != "DANGER":
                        final_status = "WARNING"
                        trust_score = min(trust_score, url_score)

                except Exception as e:
                    logger.error(f"Error checking URL {url}: {e}")

        result_data = {
            "status": "SUCCESS",
            "ai_analysis": ai_result,
            "url_analysis": url_analysis_results,
            "final_status": final_status,
            "final_trust_score": trust_score,
            "threat_types": list(set(threat_types)),
            "message": ai_result.get("reason", "분석 완료"),
        }

        try:
            from utils.summary_generator import generate_summary_async

            summary = await generate_summary_async(result_data, "email")
            result_data["easy_summary"] = summary.get("easy_summary")
            result_data["expert_summary"] = summary.get("expert_summary")
            logger.info("Email 분석 결과 요약 생성 완료")
        except Exception as e:
            logger.error(f"요약 생성 중 오류: {e}")

        return result_data

    except Exception as e:
        logger.error(f"Email analysis error: {e}")
        return {
            "status": "ERROR",
            "message": f"이메일 분석 중 오류 발생: {str(e)}",
            "final_status": "UNKNOWN",
        }


async def analyze_email_with_ai(text: str):
    try:
        client = openai.AsyncOpenAI(api_key=os.getenv("OPENAI_API_KEY"))

        prompt = f"""
        다음은 이메일 원문(Raw Text)입니다.
        헤더와 본문을 분석하여 피싱/스팸/악성 이메일인지 판단해주세요.
        특히 본문이나 헤더에 포함된 URL 중에서 검사가 필요한 의심스러운 URL이 있다면 추출해주세요.
        
        이메일 원문:
        "{text[:4000]}"
        
        다음 JSON 형식으로만 응답해주세요:
        {{
            "status": "SAFE" | "WARNING" | "DANGER",
            "trust_score": 0~100 (높을수록 안전),
            "threat_types": ["해킹 메일", "사칭 메일(CEO/거래처)", "피싱(계정탈취)", "스팸", "기타"] 중 해당되는 것들,
            "suspicious_urls": ["http://...", "https://..."] (검사가 필요한 URL 목록, 없으면 빈 배열),
            "reason": "한 문장으로 요약된 판단 이유"
        }}
        """

        response = await client.chat.completions.create(
            model="o4-mini",
            messages=[
                {"role": "system", "content": "당신은 이메일 보안 전문가입니다."},
                {"role": "user", "content": prompt},
            ],
            response_format={"type": "json_object"},
        )

        content = response.choices[0].message.content
        return json.loads(content)

    except Exception as e:
        logger.error(f"AI analysis error: {e}")
        return {
            "status": "UNKNOWN",
            "trust_score": 50,
            "threat_types": [],
            "suspicious_urls": [],
            "reason": "AI 분석 중 오류가 발생했습니다.",
        }
