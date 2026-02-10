"use client";

import React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { ShieldCheck, Globe, Users, MessageSquare, Settings, LogOut, TrendingUp, LogIn, Database } from 'lucide-react';
import { motion } from 'framer-motion';
import { useSession, signOut } from 'next-auth/react';
import { useUserProfile } from '@/hooks/useUserProfile';

const Sidebar: React.FC = () => {
  const router = useRouter();
  const pathname = usePathname();
  const { profileImage, session, status } = useUserProfile();
  
  // Added Trends
  const navItems = [
    { icon: Globe, label: '위협 커뮤니티', path: '/' },
    { icon: ShieldCheck, label: '통합 보안 검사', path: '/scanner' },
    { icon: TrendingUp, label: '보안 트렌드', path: '/trends' },
    { icon: Users, label: '전문가 매칭', path: '/experts' },
    { icon: MessageSquare, label: '메시지', path: '/messages' },
  ];

  // Expert only nav items
  if (session?.user && (session.user as any).is_expert) {
    navItems.push({ icon: Database, label: '전체 검사 기록', path: '/expert/scans' });
  }

  const handleLogout = async () => {
    await signOut({ redirect: true, callbackUrl: '/auth/signin' });
  };

  return (
    <div className="hidden md:flex h-screen w-64 bg-neutral-950 text-white flex-col fixed left-0 top-0 shadow-2xl z-50 border-r border-neutral-900">
      <div className="p-6 border-b border-neutral-900">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 flex items-center justify-center">
            <img src="/logo.png" alt="Logo" className="w-full h-full object-contain" />
          </div>
          <div>
            <h1 className="font-bold text-lg tracking-tight text-white">피싱가드</h1>
            <p className="text-xs text-neutral-500">by 보안방범대</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 py-6 px-3 space-y-1 overflow-y-auto custom-scrollbar">
        {navItems.map((item) => {
          const isActive = pathname === item.path;
          return (
          <Link
            key={item.path}
            href={item.path}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group relative overflow-hidden ${
                isActive
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/50'
                  : 'text-neutral-400 hover:bg-neutral-900 hover:text-white'
              }`
            }
          >
              <>
                <item.icon size={20} className={isActive ? 'text-white' : 'text-neutral-500 group-hover:text-white transition-colors'} />
                <span className="font-medium text-sm">{item.label}</span>
                {isActive && (
                  <motion.div
                    layoutId="activeNav"
                    className="absolute inset-0 bg-white/10"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                  />
                )}
              </>
          </Link>
        )})}
      </nav>

      <div className="p-4 border-t border-neutral-900">
        <Link 
            href="/settings"
            className={`flex items-center gap-3 px-4 py-3 w-full rounded-xl transition-all text-sm font-medium ${
                    pathname === '/settings' ? 'bg-neutral-900 text-white' : 'text-neutral-400 hover:bg-neutral-900 hover:text-white'
                }`
            }
        >
          <Settings size={20} />
          <span>설정</span>
        </Link>
        
        {status === 'authenticated' && session?.user ? (
          <div className="mt-4">
            <div 
              onClick={() => router.push('/mypage')}
              className="flex items-center gap-3 px-4 py-2 cursor-pointer hover:bg-neutral-900 rounded-xl transition-colors group"
            >
              <div className="w-8 h-8 rounded-full ring-2 ring-neutral-800 group-hover:ring-neutral-600 transition-all bg-neutral-800 flex items-center justify-center overflow-hidden">
                {profileImage ? (
                  <img src={profileImage} alt="User" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-white text-sm font-bold">
                    {session.user.name?.charAt(0) || 'U'}
                  </span>
                )}
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-white">{session.user.name || '사용자'}</p>
                <p className="text-xs text-neutral-500">
                  {(session.user as any).is_expert ? 'Expert User' : 'User'}
                </p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="mt-2 flex items-center gap-3 px-4 py-2 w-full rounded-xl transition-all text-sm font-medium text-neutral-400 hover:bg-neutral-900 hover:text-white"
            >
              <LogOut size={20} />
              <span>로그아웃</span>
            </button>
          </div>
        ) : (
          <button
            onClick={() => router.push('/auth/signin')}
            className="mt-4 flex items-center gap-3 px-4 py-3 w-full rounded-xl transition-all text-sm font-medium bg-blue-600 hover:bg-blue-700 text-white"
          >
            <LogIn size={20} />
            <span>로그인</span>
          </button>
        )}
      </div>
    </div>
  );
};

export default Sidebar;