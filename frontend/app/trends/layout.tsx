import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: '보안 트렌드 & 뉴스',
  description: '최신 보안 트렌드와 전문가 분석, 인기 게시글을 확인하세요',
};

export default function TrendsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
