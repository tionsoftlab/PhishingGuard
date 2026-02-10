import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: '메시지',
  description: '전문가 및 AI와의 상담 메시지',
};

export default function MessagesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
