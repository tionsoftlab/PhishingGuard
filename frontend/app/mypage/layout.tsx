import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: '마이 페이지',
  description: '내 프로필, 검사 이력, 통계 정보를 확인하세요',
};

export default function MypageLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
