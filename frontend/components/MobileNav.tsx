"use client";

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ShieldCheck, Globe, Users, MessageSquare, Flame, Database } from 'lucide-react';
import { motion } from 'framer-motion';
import { useSession } from 'next-auth/react';

const MobileNav: React.FC = () => {
    const pathname = usePathname();
    const { data: session } = useSession();
    const [navItems, setNavItems] = useState([
      { icon: Globe, label: '홈', path: '/' },
      { icon: ShieldCheck, label: '검사', path: '/scanner' },
      { icon: Flame, label: '인기/뉴스', path: '/trends' },
      { icon: Users, label: '전문가', path: '/experts' },
      { icon: MessageSquare, label: '채팅', path: '/messages' },
    ]);

    useEffect(() => {
      if (session?.user && (session.user as any).is_expert) {
        setNavItems(prev => [...prev, { icon: Database, label: '검사기록', path: '/expert/scans' }]);
      }
    }, [session]);

  return (
    <div className="fixed bottom-0 left-0 right-0 h-16 bg-white dark:bg-neutral-950 border-t border-neutral-200 dark:border-neutral-800 z-50 md:hidden pb-safe">
      <nav className="flex h-full items-center justify-around px-2">
        {navItems.map((item) => {
          const isActive = pathname === item.path;
          return (
          <Link
            key={item.path}
            href={item.path}
            className={`flex flex-col items-center justify-center w-full h-full space-y-1 relative ${
                isActive ? 'text-blue-600' : 'text-neutral-400 dark:text-neutral-500'
              }`
            }
          >
              <>
                <div className="relative p-1">
                    <item.icon size={22} strokeWidth={isActive ? 2.5 : 2} />
                    {isActive && (
                        <motion.div
                            layoutId="mobileNavActive"
                            className="absolute inset-0 bg-blue-100 dark:bg-blue-900/30 -z-10 rounded-full scale-125"
                            transition={{ type: "spring", stiffness: 300, damping: 30 }}
                        />
                    )}
                </div>
                <span className="text-[10px] font-medium">{item.label}</span>
              </>
          </Link>
        )})}
      </nav>
    </div>
  );
};

export default MobileNav;