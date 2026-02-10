"use client";

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Bell, Search, User, LogIn, MessageCircle, Bot, Newspaper, Check, CheckCheck } from 'lucide-react';
import { usePathname, useRouter } from 'next/navigation';
import { signOut } from 'next-auth/react';
import { useUserProfile } from '@/hooks/useUserProfile';

interface Notification {
  id: number;
  type: 'comment' | 'ai_comment' | 'message' | 'news_comment';
  title: string;
  content: string;
  link: string;
  is_read: boolean;
  created_at: string;
}

const Header: React.FC = () => {
    const pathname = usePathname();
    const router = useRouter();
    const { profileImage, status } = useUserProfile();
    const [searchQuery, setSearchQuery] = useState('');
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [showNotifications, setShowNotifications] = useState(false);
    const notifRef = useRef<HTMLDivElement>(null);

    const fetchNotifications = useCallback(async () => {
      if (status !== 'authenticated') return;
      try {
        const res = await fetch('/api/notifications');
        if (res.ok) {
          const data = await res.json();
          if (pathname === '/messages') {
            const filtered = data.notifications.filter((n: Notification) => n.type !== 'message');
            setNotifications(data.notifications);
            setUnreadCount(filtered.filter((n: Notification) => !n.is_read).length);
          } else {
            setNotifications(data.notifications);
            setUnreadCount(data.unreadCount);
          }
        }
      } catch (err) {
      }
    }, [status, pathname]);

    useEffect(() => {
      fetchNotifications();
      const interval = setInterval(fetchNotifications, 15000);
      return () => clearInterval(interval);
    }, [fetchNotifications]);

    useEffect(() => {
      const handleClickOutside = (e: MouseEvent) => {
        if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
          setShowNotifications(false);
        }
      };
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const markAsRead = async (id: number) => {
      try {
        await fetch(`/api/notifications/${id}`, { method: 'PATCH' });
        setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
        setUnreadCount(prev => Math.max(prev - 1, 0));
      } catch {}
    };

    const markAllAsRead = async () => {
      try {
        await fetch('/api/notifications/all', { method: 'PATCH' });
        setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
        setUnreadCount(0);
      } catch {}
    };

    const handleNotificationClick = async (notif: Notification) => {
      if (!notif.is_read) {
        await markAsRead(notif.id);
      }
      setShowNotifications(false);
      if (notif.link) {
        router.push(notif.link);
      }
    };

    const getNotifIcon = (type: string) => {
      switch (type) {
        case 'comment': return <MessageCircle size={16} className="text-blue-500" />;
        case 'ai_comment': return <Bot size={16} className="text-purple-500" />;
        case 'message': return <MessageCircle size={16} className="text-emerald-500" />;
        case 'news_comment': return <Newspaper size={16} className="text-amber-500" />;
        default: return <Bell size={16} className="text-neutral-500" />;
      }
    };

    const getTimeAgo = (dateStr: string) => {
      const now = new Date();
      const date = new Date(dateStr);
      const diffMs = now.getTime() - date.getTime();
      const diffMin = Math.floor(diffMs / 60000);
      if (diffMin < 1) return '방금';
      if (diffMin < 60) return `${diffMin}분 전`;
      const diffHours = Math.floor(diffMin / 60);
      if (diffHours < 24) return `${diffHours}시간 전`;
      const diffDays = Math.floor(diffHours / 24);
      if (diffDays < 7) return `${diffDays}일 전`;
      return date.toLocaleDateString('ko-KR', { month: 'numeric', day: 'numeric' });
    };
    
    const getPageTitle = (pathname: string) => {
        switch(pathname) {
            case '/': return '위협 정보 커뮤니티';
            case '/scanner': return '통합 보안 검사';
            case '/trends': return '보안 트렌드 & 뉴스';
            case '/community': return '커뮤니티';
            case '/experts': return '전문가 매칭';
            case '/messages': return '메시지';
            case '/settings': return '설정';
            case '/mypage': return '마이 페이지';
            case '/auth/signin': return '로그인';
            case '/auth/signup': return '회원가입';
            case '/expert/scans' : return '전체 데이터 열람';
            default: return '피싱가드';
        }
    }

    const handleSearch = (e?: React.KeyboardEvent<HTMLInputElement>) => {
        if (e && e.key !== 'Enter') return;
        if (!searchQuery.trim()) return;

        router.push(`/search?q=${encodeURIComponent(searchQuery)}`);
    }

  return (
    <header className="h-14 md:h-16 bg-white/80 dark:bg-neutral-950/80 backdrop-blur-md border-b border-gray-200 dark:border-neutral-800 flex items-center justify-between px-4 md:px-8 sticky top-0 z-40">
      <div className="flex items-center gap-4">
        <h2 className="text-lg md:text-xl font-bold text-neutral-900 dark:text-neutral-100 truncate max-w-[200px] md:max-w-none">
            {getPageTitle(pathname)}
        </h2>
      </div>

      <div className="flex items-center gap-3 md:gap-6">
        <div className="relative hidden md:block">
            <input 
                type="text" 
                placeholder="통합 검색..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyPress={handleSearch}
                className="pl-10 pr-10 py-2 bg-gray-100 dark:bg-neutral-900 border-none rounded-lg text-sm focus:ring-2 focus:ring-blue-500 w-64 text-neutral-900 dark:text-neutral-200 placeholder:text-neutral-500 dark:placeholder:text-neutral-600"
            />
            <Search 
                onClick={() => handleSearch()}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500 dark:text-neutral-600 cursor-pointer hover:text-neutral-700 dark:hover:text-neutral-400 transition-colors" 
                size={16} 
            />
        </div>
        
        <div className="flex items-center gap-3">
            {status === 'authenticated' && (
              <>
                <div ref={notifRef} className="relative">
                  <button
                    onClick={() => setShowNotifications(!showNotifications)}
                    className="relative cursor-pointer hover:bg-gray-100 dark:hover:bg-neutral-800 p-2 rounded-full transition-colors"
                  >
                    <Bell size={20} className="text-gray-600 dark:text-neutral-400" />
                    {unreadCount > 0 && (
                      <span className="absolute top-1 right-1 min-w-[16px] h-4 flex items-center justify-center bg-rose-500 rounded-full text-[10px] font-bold text-white px-1 border-2 border-white dark:border-neutral-950">
                        {unreadCount > 99 ? '99+' : unreadCount}
                      </span>
                    )}
                  </button>

                  {showNotifications && (
                    <div className="absolute right-0 top-12 w-80 md:w-96 bg-white dark:bg-neutral-900 border border-gray-200 dark:border-neutral-800 rounded-2xl shadow-2xl z-50 overflow-hidden">
                      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-neutral-800">
                        <h3 className="font-bold text-neutral-900 dark:text-white text-sm">알림</h3>
                        {unreadCount > 0 && (
                          <button
                            onClick={markAllAsRead}
                            className="text-xs text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1"
                          >
                            <CheckCheck size={13} />
                            모두 읽음
                          </button>
                        )}
                      </div>
                      <div className="max-h-80 overflow-y-auto">
                        {notifications.length === 0 ? (
                          <div className="py-10 text-center text-neutral-400 dark:text-neutral-500 text-sm">
                            알림이 없습니다
                          </div>
                        ) : (
                          notifications.map((notif) => (
                            <button
                              key={notif.id}
                              onClick={() => handleNotificationClick(notif)}
                              className={`w-full text-left px-4 py-3 flex items-start gap-3 hover:bg-gray-50 dark:hover:bg-neutral-800/50 transition-colors border-b border-gray-50 dark:border-neutral-800/50 ${
                                !notif.is_read ? 'bg-blue-50/50 dark:bg-blue-900/10' : ''
                              }`}
                            >
                              <div className="mt-0.5 flex-shrink-0 w-8 h-8 rounded-full bg-gray-100 dark:bg-neutral-800 flex items-center justify-center">
                                {getNotifIcon(notif.type)}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className={`text-sm leading-snug ${!notif.is_read ? 'font-semibold text-neutral-900 dark:text-white' : 'text-neutral-700 dark:text-neutral-300'}`}>
                                  {notif.title}
                                </p>
                                {notif.content && (
                                  <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5 line-clamp-1">
                                    {notif.content}
                                  </p>
                                )}
                                <p className="text-[11px] text-neutral-400 dark:text-neutral-500 mt-1">
                                  {getTimeAgo(notif.created_at)}
                                </p>
                              </div>
                              {!notif.is_read && (
                                <div className="mt-2 w-2 h-2 rounded-full bg-blue-500 flex-shrink-0" />
                              )}
                            </button>
                          ))
                        )}
                      </div>
                    </div>
                  )}
                </div>
                <div 
                    onClick={() => router.push('/mypage')}
                    className="w-8 h-8 rounded-full bg-gray-200 dark:bg-neutral-800 overflow-hidden border border-gray-300 dark:border-neutral-700 cursor-pointer"
                >
                    {profileImage ? (
                      <img src={profileImage} alt="Profile" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <User size={16} className="text-gray-600 dark:text-neutral-400" />
                      </div>
                    )}
                </div>
                <div className="hidden md:flex items-center gap-2">
                  <button
                    onClick={async () => {
                      await signOut({ redirect: false });
                      router.push('/auth/signin');
                    }}
                    className="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                  >
                    로그아웃
                  </button>
                </div>
              </>
            )}
            {status === 'unauthenticated' && (
              <button
                onClick={() => router.push('/auth/signin')}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
              >
                <LogIn size={16} />
                <span className="hidden md:inline">로그인</span>
              </button>
            )}
        </div>
      </div>
    </header>
  );
};

export default Header;