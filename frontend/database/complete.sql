-- ============================================================
-- 통합 데이터베이스 설정 스크립트
-- 설명: 전체 데이터베이스 테이블 DROP, CREATE, 샘플 데이터 삽입을 포함
-- ============================================================

-- 데이터베이스 생성
CREATE DATABASE IF NOT EXISTS dacondb CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

USE dacondb;

-- ============================================================
-- 1단계: 기존 테이블 삭제 (DROP 문)
-- ============================================================

DROP TABLE IF EXISTS credit_history;
DROP TABLE IF EXISTS expert_reviews;
DROP TABLE IF EXISTS ai_chat_messages;
DROP TABLE IF EXISTS ai_chat_threads;
DROP TABLE IF EXISTS messages;
DROP TABLE IF EXISTS message_threads;
DROP TABLE IF EXISTS scan_history;
DROP TABLE IF EXISTS user_statistics;
DROP TABLE IF EXISTS user_credits;
DROP TABLE IF EXISTS user_settings;
DROP TABLE IF EXISTS password_reset_tokens;
DROP TABLE IF EXISTS email_verification_tokens;
DROP TABLE IF EXISTS post_comments;
DROP TABLE IF EXISTS community_posts;
DROP TABLE IF EXISTS expert_news_comments;
DROP TABLE IF EXISTS expert_news;
DROP TABLE IF EXISTS follows;
DROP TABLE IF EXISTS expert_profiles;
DROP TABLE IF EXISTS users;

-- ============================================================
-- 2단계: 테이블 생성 (CREATE 문)
-- ============================================================

-- 사용자 테이블 생성
CREATE TABLE users (
  -- 고유 ID
  id INT AUTO_INCREMENT PRIMARY KEY,
  
  -- 닉네임
  nickname VARCHAR(50) NOT NULL UNIQUE,
  
  -- 로그인 방식 (이메일)
  email VARCHAR(255) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  
  -- 전문가 여부
  is_expert BOOLEAN DEFAULT FALSE,
  
  -- 봇 여부 (AI 자동 응답)
  is_bot BOOLEAN DEFAULT FALSE,
  
  -- 전문가 인증 일자
  expert_verified_at DATETIME NULL,
  
  -- 전문 분야
  expert_field VARCHAR(255) NULL COMMENT '보안, 개인정보보호, 사이버범죄 등',
  
  -- 경력 정보
  career_info TEXT NULL COMMENT '전문가의 경력 정보',
  
  -- 이메일 인증 여부
  email_verified BOOLEAN DEFAULT FALSE,
  email_verified_at DATETIME NULL,
  
  -- 계정 상태 (활성/비활성/정지/탈퇴)
  account_status ENUM('active', 'inactive', 'suspended', 'withdrawn') DEFAULT 'active',
  
  -- 프로필 이미지 URL
  profile_image_url VARCHAR(500) NULL,
  
  -- 정보 수정 일자
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  -- 가입 일자
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  
  -- 최근 로그인 일자
  last_login_at DATETIME NULL,
  
  -- 탈퇴 일자
  withdrawn_at DATETIME NULL,
  
  -- 전문가 평점 (마이그레이션: add_expert_reviews)
  average_rating DECIMAL(3,2) DEFAULT 0.00,
  review_count INT DEFAULT 0,
  
  -- 인덱스
  INDEX idx_email (email),
  INDEX idx_nickname (nickname),
  INDEX idx_account_status (account_status),
  INDEX idx_is_expert (is_expert),
  INDEX idx_created_at (created_at),
  INDEX idx_user_rating (average_rating DESC)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 전문가 프로필 테이블 (Expert Dashboard)
CREATE TABLE expert_profiles (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL UNIQUE,
  bio TEXT,
  specialties TEXT,
  consultation_fee DECIMAL(10,2) DEFAULT 0.00,
  total_revenue DECIMAL(15,2) DEFAULT 0.00,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 팔로우 테이블 (마이그레이션: add_expert_dashboard_tables)
CREATE TABLE follows (
  id INT AUTO_INCREMENT PRIMARY KEY,
  follower_id INT NOT NULL,
  expert_id INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  UNIQUE KEY unique_follow (follower_id, expert_id),
  FOREIGN KEY (follower_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (expert_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_follower (follower_id),
  INDEX idx_expert (expert_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 이메일 인증 토큰 테이블
CREATE TABLE email_verification_tokens (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  token VARCHAR(255) NOT NULL UNIQUE,
  expires_at DATETIME NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_token (token),
  INDEX idx_expires_at (expires_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 비밀번호 재설정 토큰 테이블
CREATE TABLE password_reset_tokens (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  token VARCHAR(255) NOT NULL UNIQUE,
  expires_at DATETIME NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_token (token),
  INDEX idx_expires_at (expires_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 사용자 설정 테이블
CREATE TABLE user_settings (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL UNIQUE,
  
  -- 테마 설정
  theme ENUM('light', 'dark', 'system') DEFAULT 'system',
  
  -- 효과음 재생 설정
  sound_effects BOOLEAN DEFAULT TRUE,
  
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 사용자 크레딧 테이블
CREATE TABLE user_credits (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL UNIQUE,
  
  -- 월간 할당 크레딧
  monthly_credits INT DEFAULT 100,
  
  -- 사용한 크레딧
  used_credits INT DEFAULT 0,
  
  -- 남은 크레딧
  remaining_credits INT DEFAULT 100,
  
  -- 마지막 크레딧 갱신 일자
  last_reset_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  
  -- 다음 갱신 일자
  next_reset_at DATETIME DEFAULT (DATE_ADD(CURRENT_TIMESTAMP, INTERVAL 1 MONTH)),
  
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 사용자 통계 테이블
CREATE TABLE user_statistics (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL UNIQUE,
  
  -- 전체 스캔 수
  total_scans INT DEFAULT 0,
  
  -- 결과별 스캔 수
  safe_scans INT DEFAULT 0,
  warning_scans INT DEFAULT 0,
  danger_scans INT DEFAULT 0,
  
  -- 타입별 스캔 수
  url_scans INT DEFAULT 0,
  qr_scans INT DEFAULT 0,
  sms_scans INT DEFAULT 0,
  
  -- 차단된 위협 수
  threats_blocked INT DEFAULT 0,
  
  -- 이번 달 스캔 수
  scans_this_month INT DEFAULT 0,
  
  -- 이번 주 스캔 수
  scans_this_week INT DEFAULT 0,
  
  -- 오늘 스캔 수
  scans_today INT DEFAULT 0,
  
  -- 평균 위험도 점수
  avg_risk_score DECIMAL(5,2) DEFAULT 0.00,
  
  -- 마지막 스캔 일자
  last_scan_at DATETIME NULL,
  
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 스캔 히스토리 테이블 (마이그레이션: add_summary_columns 포함)
CREATE TABLE scan_history (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NULL,
  
  -- 스캔 타입 (url, qr, sms, voice, email)
  scan_type ENUM('url', 'qr', 'sms', 'voice', 'email') NOT NULL,
  
  -- 스캔 대상 (URL, SMS 내용 등)
  scan_target TEXT NOT NULL,
  
  -- 분석 결과 (safe, warning, danger)
  result ENUM('safe', 'warning', 'danger', 'unknown') NOT NULL,
  
  -- 위험도 점수 (0-100)
  risk_score DECIMAL(5,2) DEFAULT NULL,
  
  -- 위협 유형 (JSON 배열)
  threat_types JSON DEFAULT NULL,
  
  -- 상세 분석 결과 (JSON)
  analysis_result JSON DEFAULT NULL,
  
  -- 쉬운 요약 (마이그레이션: add_summary_columns)
  easy_summary TEXT DEFAULT NULL,
  
  -- 전문가 요약 (마이그레이션: add_summary_columns)
  expert_summary TEXT DEFAULT NULL,
  
  -- 처리 시간 (밀리초)
  processing_time_ms INT DEFAULT NULL,
  
  -- 사용자 에이전트
  user_agent VARCHAR(500) DEFAULT NULL,
  
  -- IP 주소
  ip_address VARCHAR(45) DEFAULT NULL,
  
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  
  INDEX idx_user_id (user_id),
  INDEX idx_scan_type (scan_type),
  INDEX idx_result (result),
  INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- TOS/개인정보 동의 테이블
CREATE TABLE tos_consent (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NULL,
  session_id VARCHAR(64) NULL,
  consent_type VARCHAR(50) NOT NULL DEFAULT 'privacy_and_tos',
  consented_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  ip_address VARCHAR(45) NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_user_id (user_id),
  INDEX idx_session_id (session_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- AI 채팅 스레드 테이블 (마이그레이션: add_ai_chat_tables)
CREATE TABLE ai_chat_threads (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_email VARCHAR(255) NOT NULL,
  scan_id INT,
  scan_type ENUM('url', 'sms', 'qr', 'voice', 'email') NOT NULL,
  scan_context JSON,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  INDEX idx_user_email (user_email),
  INDEX idx_scan_id (scan_id),
  INDEX idx_created_at (created_at DESC),
  FOREIGN KEY (scan_id) REFERENCES scan_history(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- AI 채팅 메시지 테이블 (마이그레이션: add_ai_chat_tables)
CREATE TABLE ai_chat_messages (
  id INT PRIMARY KEY AUTO_INCREMENT,
  thread_id INT NOT NULL,
  role ENUM('user', 'assistant') NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  INDEX idx_thread_id (thread_id),
  INDEX idx_created_at (created_at),
  FOREIGN KEY (thread_id) REFERENCES ai_chat_threads(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 전문가 뉴스 테이블
CREATE TABLE expert_news (
  id INT AUTO_INCREMENT PRIMARY KEY,
  
  -- 제목
  title VARCHAR(500) NOT NULL,
  
  -- 요약
  summary TEXT NOT NULL,
  
  -- 본문 내용
  content TEXT,
  
  -- 작성자 (전문가)
  author_id INT NOT NULL,
  
  -- 소속
  affiliation VARCHAR(255) DEFAULT NULL,
  
  -- 태그
  tag ENUM('긴급 리포트', '보안 뉴스', '업데이트', '분석', '가이드') DEFAULT '보안 뉴스',
  
  -- 배경 색상
  bg_color VARCHAR(100) DEFAULT 'bg-gradient-to-br from-blue-900 to-indigo-900',
  
  -- 조회수
  views INT DEFAULT 0,
  
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  FOREIGN KEY (author_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_created_at (created_at),
  INDEX idx_views (views)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 전문가 뉴스 댓글 테이블
CREATE TABLE expert_news_comments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  news_id INT NOT NULL,
  author_id INT NOT NULL,
  content TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (news_id) REFERENCES expert_news(id) ON DELETE CASCADE,
  FOREIGN KEY (author_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_news_id (news_id),
  INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 커뮤니티 게시글 테이블
CREATE TABLE community_posts (
  id INT AUTO_INCREMENT PRIMARY KEY,
  
  -- 작성자
  author_id INT NOT NULL,
  
  -- 제목
  title VARCHAR(500) NOT NULL,
  
  -- 카테고리
  category ENUM('정보', '질문', '일반') DEFAULT '일반',
  
  -- 내용
  content TEXT NOT NULL,
  
  -- 조회수
  views INT DEFAULT 0,
  
  -- 댓글 수
  comment_count INT DEFAULT 0,
  
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  -- 관련 스캔 결과 ID (선택사항)
  scan_result_id INT DEFAULT NULL,
  
  FOREIGN KEY (author_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (scan_result_id) REFERENCES scan_history(id) ON DELETE SET NULL,
  INDEX idx_created_at (created_at),
  INDEX idx_views (views),
  INDEX idx_comment_count (comment_count)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 커뮤니티 댓글 테이블
CREATE TABLE post_comments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  
  -- 게시글 ID
  post_id INT NOT NULL,
  
  -- 작성자
  author_id INT NOT NULL,
  
  -- 댓글 내용
  content TEXT NOT NULL,
  
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (post_id) REFERENCES community_posts(id) ON DELETE CASCADE,
  FOREIGN KEY (author_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_post_id (post_id),
  INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 1:1 상담 스레드 테이블 (마이그레이션: add_file_upload_support 포함)
CREATE TABLE message_threads (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  expert_id INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  last_message TEXT,
  unread_count INT DEFAULT 0,
  status ENUM('active', 'closed') DEFAULT 'active',
  
  -- 파일 업로드 지원 (마이그레이션: add_file_upload_support)
  file_url VARCHAR(500),
  file_name VARCHAR(255),
  file_size INTEGER,
  file_type VARCHAR(100),
  
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (expert_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_user_id (user_id),
  INDEX idx_expert_id (expert_id),
  INDEX idx_updated_at (updated_at),
  INDEX idx_message_threads_file (file_url)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 1:1 상담 메시지 테이블 (마이그레이션: fix_file_upload_schema 포함)
CREATE TABLE messages (
  id INT AUTO_INCREMENT PRIMARY KEY,
  thread_id INT NOT NULL,
  sender_id INT NOT NULL,
  message_text TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  is_read BOOLEAN DEFAULT FALSE,
  
  -- 파일 업로드 지원 (마이그레이션: fix_file_upload_schema)
  file_url VARCHAR(500),
  file_name VARCHAR(255),
  file_size INTEGER,
  file_type VARCHAR(100),
  
  FOREIGN KEY (thread_id) REFERENCES message_threads(id) ON DELETE CASCADE,
  FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_thread_id (thread_id),
  INDEX idx_sender_id (sender_id),
  INDEX idx_created_at (created_at),
  INDEX idx_messages_file (file_url)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 전문가 리뷰 테이블 (마이그레이션: add_expert_reviews)
CREATE TABLE expert_reviews (
  id INT AUTO_INCREMENT PRIMARY KEY,
  thread_id INT NOT NULL,
  user_email VARCHAR(255) NOT NULL,
  expert_email VARCHAR(255) NOT NULL,
  rating INT NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  UNIQUE KEY unique_review (thread_id, user_email),
  FOREIGN KEY (thread_id) REFERENCES message_threads(id) ON DELETE CASCADE,
  INDEX idx_expert_email (expert_email),
  INDEX idx_thread_id (thread_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 알림 테이블
CREATE TABLE notifications (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  type ENUM('comment', 'ai_comment', 'message', 'news_comment') NOT NULL,
  title VARCHAR(255) NOT NULL,
  content VARCHAR(500),
  link VARCHAR(255),
  is_read BOOLEAN DEFAULT FALSE,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_user_id (user_id),
  INDEX idx_is_read (is_read),
  INDEX idx_created_at (created_at DESC)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 크레딧 사용 히스토리 테이블
CREATE TABLE credit_history (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  
  -- 변경된 크레딧 수량 (+/-)
  credits_changed INT NOT NULL,
  
  -- 변경 후 잔액
  balance_after INT NOT NULL,
  
  -- 변경 유형 (scan, reset, bonus, purchase)
  change_type ENUM('scan', 'reset', 'bonus', 'purchase') NOT NULL,
  
  -- 설명
  description TEXT DEFAULT NULL,
  
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_user_id (user_id),
  INDEX idx_change_type (change_type),
  INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- 3단계: 트리거 생성
-- ============================================================

DELIMITER //

-- 사용자 가입 시 자동으로 설정, 크레딧, 통계 생성
CREATE TRIGGER after_user_insert
AFTER INSERT ON users
FOR EACH ROW
BEGIN
  -- 사용자 설정 생성
  INSERT INTO user_settings (user_id) VALUES (NEW.id);
  
  -- 사용자 크레딧 생성
  INSERT INTO user_credits (user_id) VALUES (NEW.id);
  
  -- 사용자 통계 생성
  INSERT INTO user_statistics (user_id) VALUES (NEW.id);
END//

DELIMITER ;

-- -- ============================================================
-- -- 4단계: 샘플 데이터 삽입 (SEED)
-- -- ============================================================

-- -- 테스트 사용자 추가 (비밀번호: password123)
-- -- bcrypt 해시: $2a$10$X9PWWZ.I1fgE8EE3mQZJ9.yYPO0TxTHvNkWx7Qg3Q0hxBZPZH.YNm

-- -- 일반 사용자 예시
-- INSERT INTO users (
--   email, 
--   password, 
--   nickname, 
--   is_expert, 
--   email_verified, 
--   account_status, 
--   created_at
-- ) VALUES (
--   'user@example.com',
--   '$2a$10$X9PWWZ.I1fgE8EE3mQZJ9.yYPO0TxTHvNkWx7Qg3Q0hxBZPZH.YNm',  -- password123
--   '일반사용자',
--   FALSE,
--   TRUE,
--   'active',
--   NOW()
-- );

-- -- 전문가 사용자 예시
-- INSERT INTO users (
--   email, 
--   password, 
--   nickname, 
--   is_expert, 
--   expert_verified_at,
--   expert_field,
--   career_info,
--   email_verified, 
--   account_status, 
--   created_at
-- ) VALUES (
--   'expert@example.com',
--   '$2a$10$X9PWWZ.I1fgE8EE3mQZJ9.yYPO0TxTHvNkWx7Qg3Q0hxBZPZH.YNm',  -- password123
--   '보안전문가',
--   TRUE,
--   NOW(),
--   '사이버 보안, 악성코드 분석',
--   '정보보안 전문가 10년 경력, CISSP 자격증 보유',
--   TRUE,
--   'active',
--   NOW()
-- );

-- -- 샘플 스캔 히스토리 추가 (일반 사용자용)
-- INSERT INTO scan_history (user_id, scan_type, scan_target, result, risk_score, created_at) VALUES
-- (1, 'url', 'https://google.com', 'safe', 5.0, DATE_SUB(NOW(), INTERVAL 1 DAY)),
-- (1, 'url', 'https://example-phishing.com', 'danger', 95.5, DATE_SUB(NOW(), INTERVAL 2 DAY)),
-- (1, 'qr', 'https://safe-qrcode.com', 'safe', 10.0, DATE_SUB(NOW(), INTERVAL 3 DAY)),
-- (1, 'sms', 'Your package is ready', 'warning', 65.0, DATE_SUB(NOW(), INTERVAL 4 DAY)),
-- (1, 'url', 'https://legitimate-site.com', 'safe', 8.0, DATE_SUB(NOW(), INTERVAL 5 DAY));

-- -- 사용자 통계 업데이트
-- UPDATE user_statistics SET 
--   total_scans = 5,
--   safe_scans = 3,
--   warning_scans = 1,
--   danger_scans = 1,
--   url_scans = 4,
--   qr_scans = 1,
--   sms_scans = 1,
--   threats_blocked = 1,
--   scans_this_month = 5,
--   scans_this_week = 3,
--   scans_today = 0
-- WHERE user_id = 1;

-- -- 크레딧 사용 히스토리 추가
-- INSERT INTO credit_history (user_id, credits_changed, balance_after, change_type, description) VALUES
-- (1, -5, 95, 'scan', '5회 스캔 사용'),
-- (1, 100, 100, 'reset', '월간 크레딧 갱신');

-- -- 크레딧 업데이트
-- UPDATE user_credits SET 
--   used_credits = 5,
--   remaining_credits = 95
-- WHERE user_id = 1;

-- -- 전문가 뉴스 샘플 데이터
-- INSERT INTO expert_news (author_id, title, summary, affiliation, tag, bg_color, views) VALUES
-- (2, '2024년 4분기 신종 스미싱 패턴 긴급 분석 리포트', 
--  '택배 사칭에서 부고장, 청첩장으로 진화하는 악성 URL 패턴을 심층 분석합니다. APK 설치 유도 방식의 변화와 대응책을 확인하세요.',
--  'TionLab', '긴급 리포트', 'bg-gradient-to-br from-slate-800 to-slate-900', 1523),
-- (2, '[주의] 금융기관 사칭 앱, 공식 마켓 우회 설치 기승',
--  '공식 앱스토어가 아닌 문자를 통해 설치되는 악성 앱이 급증하고 있습니다. V3, 알약 등 모바일 백신을 무력화하는 기능이 포함되어 있습니다.',
--  '사이버수사대 자문', '보안 뉴스', 'bg-gradient-to-br from-blue-900 to-indigo-900', 982);

-- -- 커뮤니티 게시글 샘플 데이터
-- INSERT INTO community_posts (author_id, title, category, content, views, comment_count) VALUES
-- (1, '제 부모님 폰에서 이 문자 발견하면 바로 삭제하세요', '정보', '요즘 부모님 세대를 노리는 스미싱이 정말 심각합니다.\n\n제가 직접 겪은 일인데요, 어머니 폰에서 이런 문자를 발견했어요:\n\n[Web발신]\n고객님의 택배가 주소 불명으로 반송됩니다. \n확인: https://cjlogis-kr.com/track/xxxxx\n\n얼핏 보면 CJ대한통운 같아 보이지만, 도메인을 자세히 보면 cjlogis-kr.com 이에요. \n정식 CJ대한통운은 cjlogistics.com 입니다!', 15443, 4),
-- (1, '요즘 유행하는 코인 리딩방 초대 수법 (실제 경험담)', '정보', '코인 투자 리딩방 초대 사기 수법 정리', 12100, 56),
-- (1, '당근마켓 사기꾼 특징 정리해드립니다.', '정보', '당근마켓 거래 시 주의사항', 8900, 45),
-- (1, '검찰청 사칭 보이스피싱 녹음 파일 공개', '정보', '실제 보이스피싱 사례 음성파일', 6500, 32),
-- (1, '해외 결제 문자 날아왔을 때 대처법 A to Z', '정보', '신용카드 부정사용 대응 가이드', 5200, 28);

-- -- ============================================================
-- -- 5단계: 데이터 확인
-- -- ============================================================

-- SELECT '========== 사용자 목록 ==========' AS '';
-- SELECT id, email, nickname, is_expert, account_status, average_rating, review_count, created_at FROM users;

-- SELECT '========== 사용자 설정 ==========' AS '';
-- SELECT * FROM user_settings;

-- SELECT '========== 사용자 크레딧 ==========' AS '';
-- SELECT * FROM user_credits;

-- SELECT '========== 사용자 통계 ==========' AS '';
-- SELECT * FROM user_statistics;

-- SELECT '========== 스캔 히스토리 (최근 5개) ==========' AS '';
-- SELECT id, user_id, scan_type, scan_target, result, risk_score, created_at 
-- FROM scan_history 
-- ORDER BY created_at DESC 
-- LIMIT 5;

-- SELECT '========== 전문가 뉴스 ==========' AS '';
-- SELECT * FROM expert_news ORDER BY created_at DESC;

-- SELECT '========== 커뮤니티 게시글 ==========' AS '';
-- SELECT id, author_id, title, category, views, comment_count, created_at FROM community_posts ORDER BY views DESC;
