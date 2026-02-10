import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: '전문가 매칭',
  description: '보안 전문가와 1:1 상담을 받아보세요',
};

export default function ExpertsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
