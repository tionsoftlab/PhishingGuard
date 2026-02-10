from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.date import DateTrigger
from datetime import datetime, timedelta
import mysql.connector
import os
import openai
import logging
from typing import Optional

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/community", tags=["community"])

DB_CONFIG = {
    "host": os.getenv("DB_HOST", "localhost"),
    "user": os.getenv("DB_USER", "dacon"),
    "password": os.getenv("DB_PASSWORD", "dacon0211!"),
    "database": os.getenv("DB_NAME", "dacondb"),
}

scheduler = BackgroundScheduler()
scheduler.start()


class ScheduleCommentRequest(BaseModel):
    post_id: int
    title: str = ""
    content: str
    scan_result_id: Optional[int] = None


def get_db_connection():
    try:
        return mysql.connector.connect(**DB_CONFIG)
    except Exception as e:
        logger.error(f"DB Connection Error: {e}")
        return None


def generate_and_post_comment(
    post_id: int, title: str, content: str, scan_result_id: Optional[int]
):
    logger.info(f"Starting delayed AI comment task for post {post_id}")

    conn = get_db_connection()
    if not conn:
        logger.error("Failed to connect to DB for ai comment task")
        return

    try:
        cursor = conn.cursor(dictionary=True)

        scan_info = ""
        if scan_result_id:
            cursor.execute(
                "SELECT * FROM scan_history WHERE id = %s", (scan_result_id,)
            )
            scan = cursor.fetchone()
            if scan:
                scan_info = f"""
                [첨부된 보안 검사 결과]
                - 유형: {scan['scan_type']}
                - 결과: {scan['result']}
                - 위험도: {scan['risk_score']}
                - 요약: {scan['easy_summary'] or scan['expert_summary']}
                """

        client = openai.OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

        system_msg = """당신은 '피싱가드(Phishing Guard)' 플랫폼의 AI 보안 전문가 'SecureAI'입니다.
        사용자의 게시글 제목과 본문, 그리고 첨부된 보안 검사 결과(있다면)를 종합적으로 분석하여 도움이 되는 조언이나 분석 내용을 댓글로 작성해주세요.

        [피싱가드 플랫폼 정보]
        피싱가드는 다양한 유형의 피싱 공격을 탐지하고 분석하는 통합 보안 검사 플랫폼입니다.
        - 5종 통합 스캐너: URL 분석, SMS(문자) 분석, 이메일 분석, QR코드 분석, 보이스피싱 분석
        - URL 분석: 리디렉션 체인 추적 → 피싱 DB 대조 → ML 모델(Random Forest) → AI 콘텐츠 분석(GPT) → SSL 인증서 검증 → 스크린샷 캡처의 다단계 분석
        - SMS 분석: 한국어(KoBERT)·영어(RoBERTa) 이중 언어 ML 분류 → URL 추출 후 URL 분석 연계 → GPT 종합 분석
        - 이메일 분석: 이메일 본문 AI 분석 → 내장 URL 자동 추출 및 분석 → 피싱 패턴 탐지
        - QR코드 분석: 카메라 실시간 스캔 / 이미지 업로드 → AI 피싱 확률 예측 → URL 포함 시 URL 분석 연계 → 큐싱(Qshing) 위협 탐지
        - 보이스피싱 분석: 음성 파일 업로드 → AI 기반 음성 내용 분석 → 보이스피싱 패턴 탐지
        - AI 채팅 상담: 검사 결과 기반 맞춤형 AI 상담, 스레드 기반 대화 이력 관리
        - 커뮤니티: 정보/질문/일반 카테고리 게시글, 검사 결과 공유 가능
        - 전문가 시스템: 보안 전문가 프로필 열람, 1:1 메시지 상담, 전문가 리뷰/평점, 전문가 뉴스/리포트, 팔로우 기능
        - 트렌드: 최신 보안 뉴스 및 전문가 리포트, 인기 커뮤니티 게시글 랭킹
        - 사용자 시스템: 이메일 기반 회원가입/로그인, 프로필 관리, 크레딧 시스템(월 100회 검사), 검사 이력 및 통계 대시보드, 다크/라이트 테마

        [핵심 규칙]
        - 친절하고 전문적인 어조를 사용하세요.
        - 게시글의 '제목'을 반드시 참고하세요. 본문이 짧거나 불명확해도 제목에 핵심 질문이나 맥락이 담겨 있을 수 있습니다.
        - 본문이 초성(ㅈㄱㄴ 등), 짧은 약어, 또는 의미 없는 텍스트일 경우, 제목을 기반으로 답변하세요.
        - 제목이 질문 형태라면 그 질문에 대해 구체적이고 실용적인 보안 조언을 제공하세요.
        - 플랫폼 사용법이나 기능에 대한 질문이면 위 플랫폼 정보를 참고하여 안내해주세요.
        - 첨부된 검사 결과가 있다면 참고하되, 본문 내용이 매우 짧거나 의미 없는 텍스트(초성, 테스트 등)인 경우 검사 결과를 맹목적으로 신뢰하지 마세요. 실제 위험한 내용인지 비판적으로 판단하세요.
        - 게시글 내용에 실제 위험 요소가 보이면 경고해주세요.
        - 300자 이내로 핵심만 요약해서 작성하세요.
        - 답변 시작에 "SecureAI 분석:" 같은 말머리는 붙이지 마세요.
        - "게시글 내용이 불명확합니다" 같은 모호한 답변은 피하고, 제목과 맥락에서 최대한 유용한 정보를 추출해 답변하세요.
        """

        user_msg = f"""
        [게시글 제목]
        {title}

        [게시글 본문]
        {content}

        {scan_info}
        """

        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": system_msg},
                {"role": "user", "content": user_msg},
            ],
            temperature=0.7,
            max_completion_tokens=500,
        )

        ai_comment = response.choices[0].message.content

        cursor.execute("SELECT id FROM users WHERE is_bot = 1 LIMIT 1")
        bot_user = cursor.fetchone()

        if bot_user:
            cursor.execute(
                "INSERT INTO post_comments (post_id, author_id, content) VALUES (%s, %s, %s)",
                (post_id, bot_user["id"], ai_comment),
            )

            cursor.execute(
                "UPDATE community_posts SET comment_count = comment_count + 1 WHERE id = %s",
                (post_id,),
            )

            cursor.execute(
                "SELECT author_id FROM community_posts WHERE id = %s",
                (post_id,),
            )
            post_row = cursor.fetchone()
            if post_row:
                trunc_comment = ai_comment[:100] + "..." if len(ai_comment) > 100 else ai_comment
                cursor.execute(
                    "INSERT INTO notifications (user_id, type, title, content, link) VALUES (%s, %s, %s, %s, %s)",
                    (
                        post_row["author_id"],
                        "ai_comment",
                        "AI가 회원님의 글에 분석 댓글을 달았습니다",
                        trunc_comment,
                        f"/community/{post_id}",
                    ),
                )

            conn.commit()
            logger.info(f"AI comment posted successfully for post {post_id}")
        else:
            logger.error("Bot user not found")

    except Exception as e:
        logger.error(f"Error in ai comment task: {e}")
    finally:
        if conn.is_connected():
            cursor.close()
            conn.close()


@router.post("/schedule-comment")
async def schedule_comment(request: ScheduleCommentRequest):
    try:
        run_date = datetime.now() + timedelta(minutes=10)

        scheduler.add_job(
            generate_and_post_comment,
            DateTrigger(run_date=run_date),
            args=[request.post_id, request.title, request.content, request.scan_result_id],
            id=f"ai_comment_{request.post_id}",
            replace_existing=True,
        )

        logger.info(f"Scheduled AI comment for post {request.post_id} at {run_date}")
        return {"status": "success", "scheduled_at": run_date}
    except Exception as e:
        logger.error(f"Failed to schedule comment: {e}")
        raise HTTPException(status_code=500, detail=str(e))
