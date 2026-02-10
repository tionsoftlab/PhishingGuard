import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: '전문가 대시보드',
  description: '전문가 전용 데이터 관리 및 상담 현황',
};

export default function ExpertDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
