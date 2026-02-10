# ================================
# 감점/가산점 설정
# ================================
PENALTY_KNOWN_PHISHING = 100  # 알려진 피싱 사이트 발견 시 (즉시 0점)
PENALTY_REDIRECT_3_PLUS = 15  # 리디렉션 3회 이상
PENALTY_REDIRECT_PER_EXTRA = 5  # 3회 초과시 추가 1회당 감점
PENALTY_AI_HIGH_RISK = 50  # AI가 고위험으로 판단
PENALTY_AI_MEDIUM_RISK = 30  # AI가 중위험으로 판단
PENALTY_NO_SSL = 30  # SSL 미사용 (HTTP)
PENALTY_INVALID_SSL = 30  # SSL 인증서 유효하지 않음
BONUS_OV_CERT = 20  # OV 인증서 가산점
BONUS_EV_CERT = 30  # EV 인증서 가산점

# ================================
# 크롤링 설정
# ================================
MAX_CRAWL_TOKENS = 2000  # 최대 토큰 수
MAX_CRAWL_CHARS = MAX_CRAWL_TOKENS * 4  # 대략 1토큰 = 4글자

# ================================
# 데이터베이스 경로
# ================================
ISCX_DB_PATH = "/home/dacon/project/backend/data/phishing/ISCX_URL.csv"
KISA_DB_PATH = "/home/dacon/project/backend/data/phishing/KISA_URL.csv"

# ================================
# 신뢰도 임계값
# ================================
TRUST_SCORE_SAFE = 70  # 70점 이상: SAFE
TRUST_SCORE_SUSPICIOUS = 40  # 40-69점: SUSPICIOUS
# 40점 미만: DANGER
