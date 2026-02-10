import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: '인증',
  description: '피싱가드 로그인 및 회원가입',
};

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
