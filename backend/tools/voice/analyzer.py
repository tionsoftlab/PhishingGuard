import os
import whisper
import openai
import json
import logging
from fastapi import UploadFile

logger = logging.getLogger(__name__)

try:
    whisper_model = whisper.load_model("tiny")
    logger.info("Whisper model loaded successfully")
except Exception as e:
    logger.error(f"Failed to load Whisper model: {e}")
    whisper_model = None


async def analyze_voice(file: UploadFile):
    if not whisper_model:
        return {
            "status": "ERROR",
            "message": "Whisper 모델이 로드되지 않았습니다.",
            "final_status": "UNKNOWN",
        }

    temp_filename = f"temp_{file.filename}"
    try:
        with open(temp_filename, "wb") as buffer:
            content = await file.read()
            buffer.write(content)

        logger.info(f"Transcribing audio file: {temp_filename}")
        result = whisper_model.transcribe(temp_filename)
        transcribed_text = result["text"]
        logger.info(f"Transcription result: {transcribed_text[:100]}...")

        analysis_result = await analyze_text_with_ai(transcribed_text)

        result_data = {
            "status": "SUCCESS",
            "text": transcribed_text,
            "ai_analysis": analysis_result,
            "final_status": analysis_result.get("status", "UNKNOWN"),
            "final_trust_score": analysis_result.get("trust_score", 0),
            "threat_types": analysis_result.get("threat_types", []),
            "message": analysis_result.get("reason", "분석 완료"),
        }

        try:
            from utils.summary_generator import generate_summary_async

            summary = await generate_summary_async(result_data, "voice")
            result_data["easy_summary"] = summary.get("easy_summary")
            result_data["expert_summary"] = summary.get("expert_summary")
            logger.info("Voice 분석 결과 요약 생성 완료")
        except Exception as e:
            logger.error(f"요약 생성 중 오류: {e}")

        return result_data

    except Exception as e:
        logger.error(f"Voice analysis error: {e}")
        return {
            "status": "ERROR",
            "message": f"음성 분석 중 오류 발생: {str(e)}",
            "final_status": "UNKNOWN",
        }
    finally:
        if os.path.exists(temp_filename):
            os.remove(temp_filename)


async def analyze_text_with_ai(text: str):
    try:
        client = openai.AsyncOpenAI(api_key=os.getenv("OPENAI_API_KEY"))

        prompt = f"""
        다음은 통화 내용 또는 음성 메시지의 텍스트 변환 결과입니다.
        이 내용이 보이스피싱(Vishing)인지 분석해주세요.
        
        텍스트:
        "{text}"
        
        다음 JSON 형식으로만 응답해주세요:
        {{
            "status": "SAFE" | "WARNING" | "DANGER",
            "trust_score": 0~100 (높을수록 안전),
            "threat_types": ["검찰 사칭", "대출 사기", "가족 납치 빙자", "기관 사칭", "기타"] 중 해당되는 것들,
            "reason": "한 문장으로 요약된 판단 이유"
        }}
        """

        response = await client.chat.completions.create(
            model="o4-mini",
            messages=[
                {"role": "system", "content": "당신은 보이스피싱 탐지 전문가입니다."},
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
            "reason": "AI 분석 중 오류가 발생했습니다.",
        }
