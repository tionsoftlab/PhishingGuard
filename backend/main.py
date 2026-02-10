from utils.logging_config import setup_colored_logging
from tools.url.analyzer import analyze_url
from tools.sms.analyzer import analyze_sms
from tools.qr.analyzer import analyze_qr
from tools.qr.qr_decoder import decode_qr_from_base64
from tools.qr.ai_vision import predict_qr_context_with_vision
from tools.url.steps.phishing_db import load_known_phishing_sites
from tools.url.steps.feature_extractors.type2_features import load_short_url_services

from tools.voice.analyzer import analyze_voice
from tools.email.analyzer import analyze_email
from fastapi import FastAPI, HTTPException, Request, UploadFile, File, Form
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import logging
from dotenv import load_dotenv
import colorlog
import mysql.connector
from mysql.connector import Error
import os
import json
import hashlib

load_dotenv()
logger = setup_colored_logging(__name__)

from routers import community, c446a56eca59, model_demo

DB_CONFIG = {
    "host": os.getenv("DB_HOST", "localhost"),
    "user": os.getenv("DB_USER", "dacon"),
    "password": os.getenv("DB_PASSWORD", "dacon0211!"),
    "database": os.getenv("DB_NAME", "dacondb"),
}


def get_db_connection():
    try:
        connection = mysql.connector.connect(**DB_CONFIG)
        return connection
    except Error as e:
        logger.error(f"DB 연결 오류: {e}")
        return None


def save_scan_to_db(
    user_id: int = None,
    scan_type: str = "",
    scan_target: str = "",
    result: str = "",
    risk_score: float = None,
    threat_types: list = None,
    analysis_result: dict = None,
    easy_summary: str = None,
    expert_summary: str = None,
    processing_time_ms: int = None,
    user_agent: str = None,
    ip_address: str = None,
):
    logger.info(
        f"DB 저장 시작 - User ID: {user_id}, Type: {scan_type}, Target: {scan_target[:50]}"
    )

    connection = get_db_connection()
    if not connection:
        logger.error("DB 연결 실패")
        return False

    try:
        cursor = connection.cursor()

        if user_id is not None:
            logger.info(f"User {user_id}: 스캔 결과 DB에 저장")
        else:
            logger.info("비로그인 사용자 - 캐시용으로 DB에 저장")

        insert_query = """
            INSERT INTO scan_history 
            (user_id, scan_type, scan_target, result, risk_score, threat_types, 
             analysis_result, easy_summary, expert_summary, processing_time_ms, user_agent, ip_address) 
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        """

        cursor.execute(
            insert_query,
            (
                user_id,
                scan_type,
                scan_target,
                result,
                risk_score,
                json.dumps(threat_types) if threat_types else None,
                json.dumps(analysis_result) if analysis_result else None,
                easy_summary,
                expert_summary,
                processing_time_ms,
                user_agent,
                ip_address,
            ),
        )

        scan_id = cursor.lastrowid
        logger.info(f"스캔 결과 저장 완료 (Scan ID: {scan_id})")

        if user_id is not None:
            update_stats = """
                UPDATE user_statistics SET 
                    total_scans = total_scans + 1,
                    safe_scans = safe_scans + IF(%s = 'safe', 1, 0),
                    warning_scans = warning_scans + IF(%s = 'warning', 1, 0),
                    danger_scans = danger_scans + IF(%s = 'danger', 1, 0),
                    url_scans = url_scans + IF(%s = 'url', 1, 0),
                    qr_scans = qr_scans + IF(%s = 'qr', 1, 0),
                    sms_scans = sms_scans + IF(%s = 'sms', 1, 0),
                    threats_blocked = threats_blocked + IF(%s = 'danger', 1, 0),
                    scans_this_month = scans_this_month + 1,
                    scans_this_week = scans_this_week + 1,
                    scans_today = scans_today + 1
                WHERE user_id = %s
            """

            cursor.execute(
                update_stats,
                (
                    result,
                    result,
                    result,
                    scan_type,
                    scan_type,
                    scan_type,
                    result,
                    user_id,
                ),
            )
            logger.info(f"통계 업데이트 완료 (User ID: {user_id})")

        connection.commit()
        return True

    except Error as e:
        logger.error(f"DB 저장 오류: {e}")
        connection.rollback()
        return False
    finally:
        if connection.is_connected():
            cursor.close()
            connection.close()


def get_user_id_from_email(email: str):
    connection = get_db_connection()
    if not connection:
        return None

    try:
        cursor = connection.cursor()
        cursor.execute("SELECT id FROM users WHERE email = %s", (email,))
        result = cursor.fetchone()
        return result[0] if result else None
    except Error as e:
        logger.error(f"사용자 조회 오류: {e}")
        return None
    finally:
        if connection.is_connected():
            cursor.close()
            connection.close()


def find_existing_scan(scan_type: str, scan_target: str):
    connection = get_db_connection()
    if not connection:
        return None

    try:
        cursor = connection.cursor(dictionary=True)
        query = """
            SELECT sh.analysis_result, sh.risk_score, sh.threat_types, sh.result, 
                   sh.easy_summary, sh.expert_summary
            FROM scan_history sh
            WHERE sh.scan_type = %s AND sh.scan_target = %s AND sh.analysis_result IS NOT NULL
            ORDER BY sh.created_at DESC 
            LIMIT 1
        """
        cursor.execute(query, (scan_type, scan_target))
        row = cursor.fetchone()

        if row and row["analysis_result"]:
            try:
                if isinstance(row["analysis_result"], str):
                    row["analysis_result"] = json.loads(row["analysis_result"])
                if isinstance(row["threat_types"], str):
                    row["threat_types"] = json.loads(row["threat_types"])
                return row
            except json.JSONDecodeError as e:
                logger.error(f"JSON 파싱 오류: {e}")
                return None

        return None
    except Error as e:
        logger.error(f"기존 스캔 조회 오류: {e}")
        return None
    finally:
        if connection.is_connected():
            cursor.close()
            connection.close()


def map_result_to_db_format(result_value: str) -> str:
    if not result_value:
        return "unknown"

    result_upper = str(result_value).upper()
    mapping = {
        "SAFE": "safe",
        "DANGER": "danger",
        "SUSPICIOUS": "warning",
        "WARNING": "warning",
        "UNKNOWN": "unknown",
        "안전": "safe",
        "위험": "danger",
        "의심": "warning",
    }

    return mapping.get(result_upper, "unknown")


@asynccontextmanager
async def lifespan(app: FastAPI):
    load_known_phishing_sites()
    load_short_url_services()
    yield


app = FastAPI(
    title="URL 분석 API",
    lifespan=lifespan,
    docs_url=None,
    redoc_url=None,
    openapi_url=None,
)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://cslab.kku.ac.kr:3000",
        "https://cslab.kku.ac.kr",
        "http://cslab.kku.ac.kr:3000",
        "http://cslab.kku.ac.kr",
        "http://222.116.135.182:3000",
        "http://222.116.135.182",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(community.router)
app.include_router(c446a56eca59.router)
app.include_router(model_demo.router)

from fastapi.staticfiles import StaticFiles
import os

static_dir = os.path.join(os.path.dirname(__file__), "static")
profile_dir = os.path.join(static_dir, "profile")
screenshots_dir = os.path.join(static_dir, "screenshots")
uploads_dir = os.path.join(static_dir, "uploads")

for d in [static_dir, profile_dir, screenshots_dir, uploads_dir]:
    os.makedirs(d, exist_ok=True)

app.mount("/static", StaticFiles(directory=static_dir), name="static")
app.mount("/profile", StaticFiles(directory=profile_dir), name="profile")
app.mount("/screenshots", StaticFiles(directory=screenshots_dir), name="screenshots")
app.mount("/uploads", StaticFiles(directory=uploads_dir), name="uploads")


class URLCheckRequest(BaseModel):
    url: str
    user_email: str = None


@app.post("/api/ocr/extract")
async def ocr_extract(file: UploadFile = File(...), mode: str = Form("general")):
    """
    업로드된 스크린샷 이미지에서 텍스트를 추출합니다.
    GPT-4o-mini 멀티모달을 사용해 OCR처럼 정확하게 텍스트만 반환합니다.
    mode: 'url' - URL 추출 특화, 'general' - 일반 텍스트 추출
    """
    import base64
    from openai import OpenAI

    logger.info(f"OCR 추출 요청 - 파일: {file.filename}, 타입: {file.content_type}, 모드: {mode}")

    allowed_types = ["image/png", "image/jpeg", "image/jpg", "image/webp", "image/gif"]
    if file.content_type not in allowed_types:
        raise HTTPException(status_code=400, detail="지원하지 않는 이미지 형식입니다. PNG, JPEG, WebP, GIF만 지원합니다.")

    try:
        image_bytes = await file.read()
        if len(image_bytes) > 20 * 1024 * 1024:
            raise HTTPException(status_code=400, detail="이미지 크기는 20MB 이하여야 합니다.")

        base64_image = base64.b64encode(image_bytes).decode("utf-8")

        client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

        if mode == "url":
            system_prompt = (
                "당신은 이미지에서 URL을 추출하는 전문 시스템입니다. "
                "이미지에 보이는 URL, 링크, 웹 주소를 정확히 그대로 추출하세요. "
                "http://, https://, www. 로 시작하는 주소뿐만 아니라 "
                "도메인 형태(예: example.com/path)의 텍스트도 모두 추출하세요. "
                "URL이 여러 줄에 걸쳐 있으면 한 줄로 합쳐서 추출하세요. "
                "URL이 아닌 일반 텍스트는 무시하세요. "
                "URL만 한 줄에 하나씩 출력하세요. "
                "이미지에 URL이 없으면 빈 문자열만 반환하세요."
            )
            user_prompt = "이 이미지에 보이는 모든 URL, 링크, 웹 주소를 정확히 그대로 추출해주세요. URL만 출력하고 다른 텍스트는 포함하지 마세요."
        else:
            system_prompt = (
                "당신은 정밀한 OCR 시스템입니다. "
                "이미지에 보이는 텍스트를 정확히 그대로 추출하세요. "
                "이미지에 적혀 있는 내용만 작성하세요. "
                "절대로 내용을 요약하거나, 해석하거나, 추가 설명을 붙이지 마세요. "
                "이미지에 없는 텍스트를 만들어내지 마세요. "
                "줄바꿈, 띄어쓰기 등 원본의 형식을 최대한 보존하세요. "
                "이미지에 텍스트가 없으면 빈 문자열만 반환하세요."
            )
            user_prompt = "이 이미지에 적혀 있는 모든 텍스트를 정확히 그대로 추출해주세요. 이미지에 써져 있는 것만 작성하고, 아무것도 추가하거나 생략하지 마세요."

        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {
                    "role": "system",
                    "content": system_prompt,
                },
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "text",
                            "text": user_prompt,
                        },
                        {
                            "type": "image_url",
                            "image_url": {
                                "url": f"data:{file.content_type};base64,{base64_image}"
                            },
                        },
                    ],
                },
            ],
            max_tokens=4096,
        )

        extracted_text = response.choices[0].message.content.strip()
        logger.info(f"OCR 추출 완료 - 추출된 텍스트 길이: {len(extracted_text)}자")

        return {"status": "success", "text": extracted_text}

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"OCR 추출 오류: {str(e)}")
        raise HTTPException(status_code=500, detail=f"텍스트 추출 중 오류가 발생했습니다: {str(e)}")


@app.post("/api/check/url/")
async def check_url(request: URLCheckRequest, req: Request):
    try:
        url = request.url
        logger.info(f"URL 분석 요청: {url}")

        existing_scan = find_existing_scan("url", url)
        if existing_scan:
            logger.info("기존 분석 결과 발견, 캐시된 결과 반환")
            result = existing_scan["analysis_result"]

            if request.user_email:
                user_id = get_user_id_from_email(request.user_email)
                if user_id:
                    save_scan_to_db(
                        user_id=user_id,
                        scan_type="url",
                        scan_target=url,
                        result=map_result_to_db_format(
                            result.get("결과") or result.get("final_status")
                        ),
                        risk_score=existing_scan["risk_score"],
                        threat_types=existing_scan["threat_types"],
                        analysis_result=result,
                        easy_summary=existing_scan["easy_summary"],
                        expert_summary=existing_scan["expert_summary"],
                        processing_time_ms=0,
                        user_agent=req.headers.get("user-agent", ""),
                        ip_address=req.client.host if req.client else None,
                    )
            return result

        import time

        start_time = time.time()
        result = await analyze_url(url)
        processing_time = int((time.time() - start_time) * 1000)

        user_id = None
        if request.user_email:
            logger.info(f"사용자 이메일 수신: {request.user_email}")
            user_id = get_user_id_from_email(request.user_email)
            if not user_id:
                logger.warning(f"사용자 ID를 찾을 수 없음: {request.user_email}")

        db_result = map_result_to_db_format(
            result.get("결과") or result.get("final_status")
        )
        save_scan_to_db(
            user_id=user_id,
            scan_type="url",
            scan_target=url,
            result=db_result,
            risk_score=result.get("신뢰도 점수", 0),
            threat_types=result.get("위협 유형", []),
            analysis_result=result,
            easy_summary=result.get("easy_summary"),
            expert_summary=result.get("expert_summary"),
            processing_time_ms=processing_time,
            user_agent=req.headers.get("user-agent", ""),
            ip_address=req.client.host if req.client else None,
        )

        return result
    except Exception as e:
        logger.error(f"URL 분석 중 오류 발생: {str(e)}")
        raise HTTPException(status_code=500, detail=f"URL 분석 중 오류 발생: {str(e)}")


class SMSCheckRequest(BaseModel):
    text: str
    user_email: str = None


@app.post("/api/check/sms/")
async def check_sms(request: SMSCheckRequest, req: Request):
    try:
        text = request.text
        logger.info(f"SMS 분석 요청: {text}")

        scan_target_key = text[:100]
        existing_scan = find_existing_scan("sms", scan_target_key)
        if existing_scan:
            logger.info("기존 SMS 분석 결과 발견, 캐시된 결과 반환")
            result = existing_scan["analysis_result"]

            if request.user_email:
                user_id = get_user_id_from_email(request.user_email)
                if user_id:
                    save_scan_to_db(
                        user_id=user_id,
                        scan_type="sms",
                        scan_target=scan_target_key,
                        result=map_result_to_db_format(
                            result.get("결과") or result.get("final_status")
                        ),
                        risk_score=existing_scan["risk_score"],
                        threat_types=existing_scan["threat_types"],
                        analysis_result=result,
                        easy_summary=existing_scan["easy_summary"],
                        expert_summary=existing_scan["expert_summary"],
                        processing_time_ms=0,
                        user_agent=req.headers.get("user-agent", ""),
                        ip_address=req.client.host if req.client else None,
                    )
            return result

        import time

        start_time = time.time()
        result = await analyze_sms(text)
        processing_time = int((time.time() - start_time) * 1000)

        user_id = None
        if request.user_email:
            logger.info(f"사용자 이메일 수신: {request.user_email}")
            user_id = get_user_id_from_email(request.user_email)
            if not user_id:
                logger.warning(f"사용자 ID를 찾을 수 없음: {request.user_email}")

        db_result = map_result_to_db_format(
            result.get("결과") or result.get("final_status")
        )
        save_scan_to_db(
            user_id=user_id,
            scan_type="sms",
            scan_target=text[:100],
            result=db_result,
            risk_score=result.get("신뢰도 점수", 0),
            threat_types=result.get("위협 유형", []),
            analysis_result=result,
            easy_summary=result.get("easy_summary"),
            expert_summary=result.get("expert_summary"),
            processing_time_ms=processing_time,
            user_agent=req.headers.get("user-agent", ""),
            ip_address=req.client.host if req.client else None,
        )

        return result
    except Exception as e:
        logger.error(f"SMS 분석 중 오류 발생: {str(e)}")
        raise HTTPException(status_code=500, detail=f"SMS 분석 중 오류 발생: {str(e)}")


class QRInitRequest(BaseModel):
    image: str


@app.post("/api/init/qr/")
async def init_qr(request: QRInitRequest):
    try:
        logger.info("QR 코드 타입 감지 요청")
        result = decode_qr_from_base64(request.image)
        return result
    except Exception as e:
        logger.error(f"QR 코드 타입 감지 중 오류 발생: {str(e)}")
        raise HTTPException(
            status_code=500, detail=f"QR 코드 타입 감지 중 오류 발생: {str(e)}"
        )


class QRAIRequest(BaseModel):
    image: str


@app.post("/api/ai/qr/")
async def ai_predict_qr(request: QRAIRequest):
    try:
        logger.info("AI QR 컨텍스트 예측 요청")
        result = await predict_qr_context_with_vision(request.image)
        return result
    except Exception as e:
        logger.error(f"AI QR 예측 중 오류 발생: {str(e)}")
        raise HTTPException(
            status_code=500, detail=f"AI QR 예측 중 오류 발생: {str(e)}"
        )


class QRCheckRequest(BaseModel):
    image: str
    text: str
    type_number: int
    qr_data: str = None
    skip_comparison: bool = False
    user_email: str = None


@app.post("/api/check/qr/")
async def check_qr(request: QRCheckRequest, req: Request):
    try:
        logger.info(f"QR 코드 분석 요청: 타입 {request.type_number}")

        import time

        start_time = time.time()
        target_text = request.qr_data or request.text
        scan_target_key = target_text[:100] if target_text else ""

        if scan_target_key:
            existing_scan = find_existing_scan("qr", scan_target_key)
            if existing_scan:
                cached_result = existing_scan["analysis_result"]
                cached_expected = cached_result.get("expected_text", "")
                current_expected = request.text or ""

                if cached_expected == current_expected:
                    logger.info("기존 QR 분석 결과 발견(목적 일치), 캐시된 결과 반환")

                    if request.user_email:
                        user_id = get_user_id_from_email(request.user_email)
                        if user_id:
                            save_scan_to_db(
                                user_id=user_id,
                                scan_type="qr",
                                scan_target=scan_target_key,
                                result=map_result_to_db_format(
                                    cached_result.get("결과")
                                    or cached_result.get("final_status")
                                    or cached_result.get("status")
                                ),
                                risk_score=existing_scan["risk_score"],
                                threat_types=existing_scan["threat_types"],
                                analysis_result=cached_result,
                                easy_summary=existing_scan["easy_summary"],
                                expert_summary=existing_scan["expert_summary"],
                                processing_time_ms=0,
                                user_agent=req.headers.get("user-agent", ""),
                                ip_address=req.client.host if req.client else None,
                            )
                    return cached_result
                else:
                    logger.info(
                        f"기존 QR 결과 있으나 목적 불일치 (기존: {cached_expected} vs 요청: {current_expected}) - 재분석"
                    )

        result = await analyze_qr(
            image_data=request.image,
            expected_text=request.text,
            type_number=request.type_number,
            qr_data=request.qr_data,
            skip_comparison=request.skip_comparison,
        )
        processing_time = int((time.time() - start_time) * 1000)

        if request.type_number == -1:
            raise HTTPException(
                status_code=400,
                detail=result.get("message", "QR 코드를 인식할 수 없습니다"),
            )

        user_id = None
        if request.user_email:
            logger.info(f"사용자 이메일 수신: {request.user_email}")
            user_id = get_user_id_from_email(request.user_email)
            if not user_id:
                logger.warning(f"사용자 ID를 찾을 수 없음: {request.user_email}")

        db_result = map_result_to_db_format(
            result.get("결과") or result.get("final_status") or result.get("status")
        )
        save_scan_to_db(
            user_id=user_id,
            scan_type="qr",
            scan_target=request.qr_data or request.text[:100],
            result=db_result,
            risk_score=result.get("신뢰도 점수", 0),
            threat_types=result.get("위협 유형", []),
            analysis_result=result,
            easy_summary=result.get("easy_summary"),
            expert_summary=result.get("expert_summary"),
            processing_time_ms=processing_time,
            user_agent=req.headers.get("user-agent", ""),
            ip_address=req.client.host if req.client else None,
        )

        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"QR 코드 분석 중 오류 발생: {str(e)}")
        raise HTTPException(
            status_code=500, detail=f"QR 코드 분석 중 오류 발생: {str(e)}"
        )


class EmailCheckRequest(BaseModel):
    text: str
    user_email: str = None


@app.post("/api/check/email/")
async def check_email(request: EmailCheckRequest, req: Request):
    try:
        text = request.text
        logger.info(f"이메일 분석 요청: {text[:50]}...")

        scan_target_key = text[:100]
        current_hash = hashlib.md5(text.encode()).hexdigest()
        existing_scan = find_existing_scan("email", scan_target_key)
        if existing_scan:
            cached_result = existing_scan["analysis_result"]
            cached_hash = cached_result.get("content_hash")

            is_duplicate = False
            if cached_hash and cached_hash == current_hash:
                is_duplicate = True
            elif not cached_hash and len(text) <= 100:
                is_duplicate = True

            if is_duplicate:
                logger.info(
                    "기존 이메일 분석 결과 발견(해시/내용 일치), 캐시된 결과 반환"
                )
                if request.user_email:
                    user_id = get_user_id_from_email(request.user_email)
                    if user_id:
                        save_scan_to_db(
                            user_id=user_id,
                            scan_type="email",
                            scan_target=scan_target_key,
                            result=map_result_to_db_format(
                                cached_result.get("final_status")
                            ),
                            risk_score=existing_scan["risk_score"],
                            threat_types=existing_scan["threat_types"],
                            analysis_result=cached_result,
                            easy_summary=existing_scan["easy_summary"],
                            expert_summary=existing_scan["expert_summary"],
                            processing_time_ms=0,
                            user_agent=req.headers.get("user-agent", ""),
                            ip_address=req.client.host if req.client else None,
                        )
                return cached_result
            else:
                logger.info(
                    "기존 이메일 분석 결과 발견했으나 내용(해시) 불일치 - 재분석 진행"
                )

        import time

        start_time = time.time()
        result = await analyze_email(text)
        result["content_hash"] = current_hash
        processing_time = int((time.time() - start_time) * 1000)

        user_id = None
        if request.user_email:
            logger.info(f"사용자 이메일 수신: {request.user_email}")
            user_id = get_user_id_from_email(request.user_email)
            if not user_id:
                logger.warning(f"사용자 ID를 찾을 수 없음: {request.user_email}")

        db_result = map_result_to_db_format(result.get("final_status"))
        save_scan_to_db(
            user_id=user_id,
            scan_type="email",
            scan_target=text[:100],
            result=db_result,
            risk_score=result.get("final_trust_score", 0),
            threat_types=result.get("threat_types", []),
            analysis_result=result,
            easy_summary=result.get("easy_summary"),
            expert_summary=result.get("expert_summary"),
            processing_time_ms=processing_time,
            user_agent=req.headers.get("user-agent", ""),
            ip_address=req.client.host if req.client else None,
        )

        return result
    except Exception as e:
        logger.error(f"이메일 분석 중 오류 발생: {str(e)}")
        raise HTTPException(
            status_code=500, detail=f"이메일 분석 중 오류 발생: {str(e)}"
        )


@app.post("/api/check/voice/")
async def check_voice(
    file: UploadFile = File(...), user_email: str = Form(None), req: Request = None
):
    try:
        logger.info(f"보이스피싱 분석 요청: {file.filename}")

        content = await file.read()
        file_hash = hashlib.md5(content).hexdigest()
        await file.seek(0)

        existing_scan = find_existing_scan("voice", file.filename)

        if existing_scan:
            cached_result = existing_scan["analysis_result"]
            cached_hash = cached_result.get("content_hash")

            if cached_hash and cached_hash == file_hash:
                logger.info("기존 보이스 분석 결과 발견(해시 일치), 캐시된 결과 반환")
                if user_email:
                    user_id = get_user_id_from_email(user_email)
                    if user_id:
                        save_scan_to_db(
                            user_id=user_id,
                            scan_type="voice",
                            scan_target=file.filename,
                            result=map_result_to_db_format(
                                cached_result.get("final_status")
                            ),
                            risk_score=existing_scan["risk_score"],
                            threat_types=existing_scan["threat_types"],
                            analysis_result=cached_result,
                            easy_summary=existing_scan["easy_summary"],
                            expert_summary=existing_scan["expert_summary"],
                            processing_time_ms=0,
                            user_agent=req.headers.get("user-agent", "") if req else "",
                            ip_address=req.client.host if req and req.client else None,
                        )
                return cached_result

        import time

        start_time = time.time()
        result = await analyze_voice(file)
        result["content_hash"] = file_hash
        processing_time = int((time.time() - start_time) * 1000)

        user_id = None
        if user_email:
            logger.info(f"사용자 이메일 수신: {user_email}")
            user_id = get_user_id_from_email(user_email)
            if not user_id:
                logger.warning(f"사용자 ID를 찾을 수 없음: {user_email}")

        db_result = map_result_to_db_format(result.get("final_status"))
        save_scan_to_db(
            user_id=user_id,
            scan_type="voice",
            scan_target=file.filename,
            result=db_result,
            risk_score=result.get("final_trust_score", 0),
            threat_types=result.get("threat_types", []),
            analysis_result=result,
            easy_summary=result.get("easy_summary"),
            expert_summary=result.get("expert_summary"),
            processing_time_ms=processing_time,
            user_agent=req.headers.get("user-agent", "") if req else "",
            ip_address=req.client.host if req and req.client else None,
        )

        return result
    except Exception as e:
        logger.error(f"보이스피싱 분석 중 오류 발생: {str(e)}")
        raise HTTPException(
            status_code=500, detail=f"보이스피싱 분석 중 오류 발생: {str(e)}"
        )


class CreateThreadRequest(BaseModel):
    user_email: str
    scan_id: int = None
    scan_type: str
    scan_context: dict


@app.post("/api/chat/thread/create")
async def create_ai_chat_thread(request: CreateThreadRequest):
    try:
        conn = get_db_connection()
        if not conn:
            raise HTTPException(status_code=500, detail="DB 연결 실패")

        cursor = conn.cursor()
        cursor.execute(
            """INSERT INTO ai_chat_threads 
            (user_email, scan_id, scan_type, scan_context) 
            VALUES (%s, %s, %s, %s)""",
            (
                request.user_email,
                request.scan_id,
                request.scan_type,
                json.dumps(request.scan_context, ensure_ascii=False),
            ),
        )
        thread_id = cursor.lastrowid
        conn.commit()
        cursor.close()
        conn.close()

        logger.info(f"AI 채팅 스레드 생성 완료: {thread_id}")
        return {"status": "success", "thread_id": thread_id}

    except Exception as e:
        logger.error(f"AI 채팅 스레드 생성 중 오류: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/chat/threads")
async def get_ai_chat_threads(user_email: str):
    try:
        conn = get_db_connection()
        if not conn:
            raise HTTPException(status_code=500, detail="DB 연결 실패")

        cursor = conn.cursor(dictionary=True)
        cursor.execute(
            """SELECT 
                t.id, t.scan_type, t.scan_context, t.created_at, t.updated_at,
                (SELECT content FROM ai_chat_messages 
                 WHERE thread_id = t.id ORDER BY created_at DESC LIMIT 1) as last_message
            FROM ai_chat_threads t
            WHERE t.user_email = %s
            ORDER BY t.updated_at DESC""",
            (user_email,),
        )
        threads = cursor.fetchall()
        cursor.close()
        conn.close()

        for thread in threads:
            if thread["scan_context"]:
                thread["scan_context"] = json.loads(thread["scan_context"])

        return threads

    except Exception as e:
        logger.error(f"AI 채팅 스레드 목록 조회 중 오류: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/chat/thread/{thread_id}/messages")
async def get_thread_messages(thread_id: int):
    try:
        conn = get_db_connection()
        if not conn:
            raise HTTPException(status_code=500, detail="DB 연결 실패")

        cursor = conn.cursor(dictionary=True)
        cursor.execute(
            """SELECT id, role, content, created_at 
            FROM ai_chat_messages 
            WHERE thread_id = %s 
            ORDER BY created_at ASC""",
            (thread_id,),
        )
        messages = cursor.fetchall()
        cursor.close()
        conn.close()

        return messages

    except Exception as e:
        logger.error(f"메시지 조회 중 오류: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


class AIChatRequest(BaseModel):
    thread_id: int = None
    scan_context: dict
    message: str
    conversation_history: list = []


@app.post("/api/chat/ai")
async def chat_with_ai(request: AIChatRequest):
    try:
        import openai

        client = openai.AsyncOpenAI(api_key=os.getenv("OPENAI_API_KEY"))

        scan_type = request.scan_context.get("scan_type", "unknown")
        final_status = request.scan_context.get("final_status", "UNKNOWN")
        trust_score = request.scan_context.get("final_trust_score", 0)
        easy_summary = request.scan_context.get("easy_summary", "")
        expert_summary = request.scan_context.get("expert_summary", "")

        system_message = f"""당신은 보안 전문가 AI 어시스턴트입니다. 
사용자가 방금 수행한 보안 검사 결과에 대해 질문하고 있습니다.

검사 타입: {scan_type}
검사 결과: {final_status}
신뢰도 점수: {trust_score}점

쉬운 정리: {easy_summary}
전문가 정리: {expert_summary}

사용자의 질문에 대해 친절하고 전문적으로 답변해주세요. 답변은 한국어로 해주세요."""

        messages = [{"role": "system", "content": system_message}]
        for msg in request.conversation_history:
            messages.append(msg)
        messages.append({"role": "user", "content": request.message})

        response = await client.chat.completions.create(
            model="gpt-4o-mini",
            messages=messages,
            temperature=0.7,
            max_completion_tokens=1000,
        )

        ai_response = response.choices[0].message.content
        logger.info("AI 채팅 응답 생성 완료")

        if request.thread_id:
            try:
                conn = get_db_connection()
                if conn:
                    cursor = conn.cursor()
                    cursor.execute(
                        "INSERT INTO ai_chat_messages (thread_id, role, content) VALUES (%s, %s, %s)",
                        (request.thread_id, "user", request.message),
                    )
                    cursor.execute(
                        "INSERT INTO ai_chat_messages (thread_id, role, content) VALUES (%s, %s, %s)",
                        (request.thread_id, "assistant", ai_response),
                    )
                    conn.commit()
                    cursor.close()
                    conn.close()
            except Exception as e:
                logger.error(f"메시지 DB 저장 오류: {str(e)}")

        return {
            "status": "success",
            "response": ai_response,
            "conversation_history": messages
            + [{"role": "assistant", "content": ai_response}],
        }

    except Exception as e:
        logger.error(f"AI 채팅 중 오류: {str(e)}")
        raise HTTPException(status_code=500, detail=f"AI 채팅 중 오류: {str(e)}")


class ReviewCreate(BaseModel):
    thread_id: int
    user_email: str
    expert_email: str
    rating: int
    comment: str = None


@app.post("/api/reviews/create")
async def create_review(request: ReviewCreate):
    try:
        if request.rating < 1 or request.rating > 5:
            raise HTTPException(
                status_code=400, detail="Rating must be between 1 and 5"
            )

        conn = get_db_connection()
        if not conn:
            raise HTTPException(status_code=500, detail="Database connection failed")

        cursor = conn.cursor(dictionary=True)

        cursor.execute(
            "SELECT COUNT(*) as count FROM messages WHERE thread_id = %s",
            (request.thread_id,),
        )
        msg_count = cursor.fetchone()["count"]

        if msg_count < 2:
            cursor.close()
            conn.close()
            raise HTTPException(
                status_code=400,
                detail="Need at least one bidirectional conversation to leave a review",
            )

        cursor.execute(
            "SELECT id FROM expert_reviews WHERE thread_id = %s AND user_email = %s",
            (request.thread_id, request.user_email),
        )
        existing = cursor.fetchone()

        if existing:
            cursor.close()
            conn.close()
            raise HTTPException(
                status_code=400, detail="Already reviewed this conversation"
            )

        cursor.execute(
            """INSERT INTO expert_reviews (thread_id, user_email, expert_email, rating, comment)
               VALUES (%s, %s, %s, %s, %s)""",
            (
                request.thread_id,
                request.user_email,
                request.expert_email,
                request.rating,
                request.comment,
            ),
        )
        review_id = cursor.lastrowid

        cursor.execute(
            """SELECT AVG(rating) as avg_rating, COUNT(*) as count 
               FROM expert_reviews 
               WHERE expert_email = %s""",
            (request.expert_email,),
        )
        stats = cursor.fetchone()

        cursor.execute(
            """UPDATE users 
               SET average_rating = %s, review_count = %s 
               WHERE email = %s""",
            (float(stats["avg_rating"]), stats["count"], request.expert_email),
        )

        conn.commit()
        cursor.close()
        conn.close()

        logger.info(f"Review created: {review_id} for expert {request.expert_email}")
        return {"success": True, "review_id": review_id}

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating review: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/reviews/check/{thread_id}")
async def check_review(thread_id: int, user_email: str):
    try:
        conn = get_db_connection()
        if not conn:
            raise HTTPException(status_code=500, detail="Database connection failed")

        cursor = conn.cursor(dictionary=True)
        cursor.execute(
            """SELECT id, rating, comment, created_at 
               FROM expert_reviews 
               WHERE thread_id = %s AND user_email = %s""",
            (thread_id, user_email),
        )
        review = cursor.fetchone()
        cursor.close()
        conn.close()

        return {"has_review": review is not None, "review": review}

    except Exception as e:
        logger.error(f"Error checking review: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/reviews/expert/{expert_email}")
async def get_expert_reviews(expert_email: str, limit: int = 20):
    try:
        conn = get_db_connection()
        if not conn:
            raise HTTPException(status_code=500, detail="Database connection failed")

        cursor = conn.cursor(dictionary=True)

        cursor.execute(
            """SELECT r.id, r.rating, r.comment, r.created_at, r.user_email
               FROM expert_reviews r
               WHERE r.expert_email = %s
               ORDER BY r.created_at DESC
               LIMIT %s""",
            (expert_email, limit),
        )
        reviews = cursor.fetchall()

        cursor.execute(
            """SELECT average_rating, review_count 
               FROM users 
               WHERE email = %s""",
            (expert_email,),
        )
        stats = cursor.fetchone()

        cursor.close()
        conn.close()

        return {
            "reviews": reviews,
            "average_rating": (
                float(stats["average_rating"])
                if stats and stats["average_rating"]
                else 0.0
            ),
            "total_count": stats["review_count"] if stats else 0,
        }

    except Exception as e:
        logger.error(f"Error getting expert reviews: {e}")
        raise HTTPException(status_code=500, detail=str(e))


class TOSAgreeRequest(BaseModel):
    user_email: str = None
    session_id: str = None


@app.post("/api/tos/agree")
async def agree_tos(request: TOSAgreeRequest, req: Request):
    try:
        conn = get_db_connection()
        if not conn:
            raise HTTPException(status_code=500, detail="DB 연결 실패")

        cursor = conn.cursor()

        user_id = None
        if request.user_email:
            user_id = get_user_id_from_email(request.user_email)

        ip_address = req.client.host if req.client else None

        cursor.execute(
            """INSERT INTO tos_consent (user_id, session_id, consent_type, ip_address)
            VALUES (%s, %s, %s, %s)""",
            (user_id, request.session_id, "privacy_and_tos", ip_address),
        )
        conn.commit()
        cursor.close()
        conn.close()

        logger.info(
            f"TOS 동의 기록 완료 - User ID: {user_id}, Session: {request.session_id}"
        )
        return {"status": "success", "message": "동의가 기록되었습니다."}

    except Exception as e:
        logger.error(f"TOS 동의 기록 중 오류: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/tos/status")
async def check_tos_status(user_email: str = None, session_id: str = None):
    try:
        conn = get_db_connection()
        if not conn:
            raise HTTPException(status_code=500, detail="DB 연결 실패")

        cursor = conn.cursor(dictionary=True)

        if user_email:
            user_id = get_user_id_from_email(user_email)
            if user_id:
                cursor.execute(
                    "SELECT id, consented_at FROM tos_consent WHERE user_id = %s ORDER BY consented_at DESC LIMIT 1",
                    (user_id,),
                )
            else:
                cursor.close()
                conn.close()
                return {"consented": False}
        elif session_id:
            cursor.execute(
                "SELECT id, consented_at FROM tos_consent WHERE session_id = %s ORDER BY consented_at DESC LIMIT 1",
                (session_id,),
            )
        else:
            cursor.close()
            conn.close()
            return {"consented": False}

        row = cursor.fetchone()
        cursor.close()
        conn.close()

        if row:
            return {"consented": True, "consented_at": str(row["consented_at"])}
        return {"consented": False}

    except Exception as e:
        logger.error(f"TOS 동의 상태 확인 중 오류: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/")
async def root():
    return {
        "service": "URL 분석 API",
        "version": "2.0",
        "endpoint": "/api/check/url/",
        "description": "URL의 신뢰도를 100점 만점으로 평가합니다",
    }


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8099)
