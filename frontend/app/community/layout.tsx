import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: '커뮤니티',
  description: '보안 위협 정보를 공유하고 소통하는 커뮤니티',
};

export default function CommunityLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
