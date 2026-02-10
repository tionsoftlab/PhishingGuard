import { Globe, MessageSquare, Mail, QrCode, Mic, Bot, Users, BarChart3, BookOpen, Sparkles, Search, ScanLine, HelpCircle, Moon } from 'lucide-react';
import React from 'react';

export interface HelpItem {
  label: string;
  desc: string;
  icon: React.ReactNode;
  color: string;
}

export interface HelpContent {
  title: string;
  description: string;
  icon: React.ReactNode;
  iconBg: string;
  items: HelpItem[];
}

export const HELP_CONTENTS: HelpContent[] = [
  {
    title: '통합 보안 스캐너',
    description: '의심되는 URL, 문자, 이메일, QR코드, 음성파일을 검사해 피싱 여부를 판별합니다.',
    icon: React.createElement(ScanLine, { size: 28, className: 'text-blue-600 dark:text-blue-400' }),
    iconBg: 'bg-blue-100 dark:bg-blue-900/30',
    items: [
      { label: 'URL 검사', desc: '링크를 붙여넣으면 리디렉션 추적, 피싱 DB 대조, AI 분석까지 다단계로 검사해요.', icon: React.createElement(Globe, { size: 14, className: 'text-white' }), color: 'bg-blue-500' },
      { label: 'SMS 검사', desc: '문자 내용을 입력하면 한국어·영어 AI 모델이 스미싱 여부를 판별해요.', icon: React.createElement(MessageSquare, { size: 14, className: 'text-white' }), color: 'bg-emerald-500' },
      { label: '이메일 검사', desc: '이메일 본문을 붙여넣으면 피싱 패턴과 악성 링크를 자동으로 탐지해요.', icon: React.createElement(Mail, { size: 14, className: 'text-white' }), color: 'bg-violet-500' },
      { label: 'QR코드 검사', desc: '카메라로 스캔하거나 이미지를 업로드하면 큐싱(QR 피싱) 위협을 잡아내요.', icon: React.createElement(QrCode, { size: 14, className: 'text-white' }), color: 'bg-orange-500' },
      { label: '보이스피싱 검사', desc: '통화 녹음 파일을 올리면 AI가 보이스피싱 패턴을 분석해요.', icon: React.createElement(Mic, { size: 14, className: 'text-white' }), color: 'bg-rose-500' },
    ]
  },
  {
    title: 'AI 채팅 상담',
    description: '검사 결과가 궁금하거나 추가 도움이 필요할 때, AI에게 물어보세요.',
    icon: React.createElement(Bot, { size: 28, className: 'text-violet-600 dark:text-violet-400' }),
    iconBg: 'bg-violet-100 dark:bg-violet-900/30',
    items: [
      { label: '맞춤형 상담', desc: '검사 결과를 기반으로 AI가 위험도와 대응 방법을 알려줘요.', icon: React.createElement(Sparkles, { size: 14, className: 'text-white' }), color: 'bg-violet-500' },
      { label: '대화 기록', desc: '이전 상담 내용이 스레드별로 저장되어 언제든 다시 볼 수 있어요.', icon: React.createElement(MessageSquare, { size: 14, className: 'text-white' }), color: 'bg-blue-500' },
    ]
  },
  {
    title: '커뮤니티',
    description: '다른 사용자들과 피싱 위협 정보를 공유하고 질문할 수 있어요.',
    icon: React.createElement(Users, { size: 28, className: 'text-emerald-600 dark:text-emerald-400' }),
    iconBg: 'bg-emerald-100 dark:bg-emerald-900/30',
    items: [
      { label: '정보 공유', desc: '발견한 피싱 사례나 검사 결과를 커뮤니티에 공유해 다른 사람들에게 알려주세요.', icon: React.createElement(Globe, { size: 14, className: 'text-white' }), color: 'bg-emerald-500' },
      { label: '질문 게시판', desc: '보안 관련 궁금한 점이 있다면 자유롭게 질문할 수 있어요.', icon: React.createElement(HelpCircle, { size: 14, className: 'text-white' }), color: 'bg-amber-500' },
      { label: '인기글 랭킹', desc: '조회수 기반으로 유용한 게시글을 빠르게 찾아볼 수 있어요.', icon: React.createElement(BarChart3, { size: 14, className: 'text-white' }), color: 'bg-blue-500' },
    ]
  },
  {
    title: '전문가 상담',
    description: '보안 전문가에게 직접 1:1 상담을 받을 수 있어요.',
    icon: React.createElement(Users, { size: 28, className: 'text-amber-600 dark:text-amber-400' }),
    iconBg: 'bg-amber-100 dark:bg-amber-900/30',
    items: [
      { label: '전문가 찾기', desc: '분야별 보안 전문가 프로필과 평점을 확인하고 선택할 수 있어요.', icon: React.createElement(Search, { size: 14, className: 'text-white' }), color: 'bg-amber-500' },
      { label: '1:1 메시지', desc: '전문가에게 직접 메시지를 보내 파일 첨부와 함께 상담받을 수 있어요.', icon: React.createElement(MessageSquare, { size: 14, className: 'text-white' }), color: 'bg-blue-500' },
      { label: '전문가 뉴스', desc: '전문가가 작성한 최신 보안 리포트와 뉴스를 확인하세요.', icon: React.createElement(BookOpen, { size: 14, className: 'text-white' }), color: 'bg-violet-500' },
    ]
  },
  {
    title: '마이페이지 & 크레딧',
    description: '검사 이력과 통계를 확인하고, 크레딧을 관리하세요.',
    icon: React.createElement(BarChart3, { size: 28, className: 'text-rose-600 dark:text-rose-400' }),
    iconBg: 'bg-rose-100 dark:bg-rose-900/30',
    items: [
      { label: '검사 이력', desc: '지금까지 수행한 모든 검사 결과를 한눈에 볼 수 있어요.', icon: React.createElement(BarChart3, { size: 14, className: 'text-white' }), color: 'bg-rose-500' },
      { label: '월 100회 크레딧', desc: '매월 100회의 무료 검사 크레딧이 제공돼요.', icon: React.createElement(Sparkles, { size: 14, className: 'text-white' }), color: 'bg-emerald-500' },
      { label: '테마 설정', desc: '라이트/다크 모드로 눈에 편한 환경을 선택하세요.', icon: React.createElement(Moon, { size: 14, className: 'text-white' }), color: 'bg-indigo-500' },
    ]
  },
];
