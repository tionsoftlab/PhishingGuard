import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: '통합 보안 검사',
  description: 'URL, 문자, 이메일, QR 코드, 보이스피싱 통합 보안 검사 서비스',
};

export default function ScannerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
