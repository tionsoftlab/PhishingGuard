import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: '설정',
  description: '계정 설정 및 환경 설정',
};

export default function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
