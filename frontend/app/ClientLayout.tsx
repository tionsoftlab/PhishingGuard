"use client";

import React, { useState, useEffect } from 'react';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';
import MobileNav from '@/components/MobileNav';
import LoadingScreen from '@/components/LoadingScreen';
import { SecurityHelmet } from '@/hooks/useSecurityHelmet';

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 2500);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    const banner = `
                   =======                    
               ===========++++**               
            =========== ++++*******            
            ==========       ******            
            ===== ====        *****            
            ===== ==++     ** ***##            
            ==    ++++   **** *####            
              === ++** ****** #####            
            ===++ ****   **## #####            
            +++++ ********### #####            
             +++*** ****### ######             
              ******* ### #######              
                *****#  #######                
                  **  #######                  
                     ######                    
                                               
                                               
 /$$$$$$$   /$$$$$$         /$$$$$$  /$$   /$$  /$$$$$$  /$$$$$$$  /$$$$$$$ 
| $$__  $$ /$$__  $$       /$$__  $$| $$  | $$ /$$__  $$| $$__  $$| $$__  $$
| $$  \\ $$| $$  \\__/      | $$  \\__/| $$  | $$| $$  \\ $$| $$  \\ $$| $$  \\ $$
| $$$$$$$/|  $$$$$$       | $$ /$$$$| $$  | $$| $$$$$$$$| $$$$$$$/| $$  | $$
| $$____/  \\____  $$      | $$|_  $$| $$  | $$| $$__  $$| $$__  $$| $$  | $$
| $$       /$$  \\ $$      | $$  \\ $$| $$  | $$| $$  | $$| $$  \\ $$| $$  | $$
| $$      |  $$$$$$/      |  $$$$$$/|  $$$$$$/| $$  | $$| $$  | $$| $$$$$$$/
|__/       \\______/        \\______/  \\______/ |__/  |__/|__/  |__/|_______/ 
                                                                            
저희도 저희 시스템의 취약점이 많이 존재한다는 것을 알고 있습니다.
하지만, 이 프로젝트는 MVP인 만큼 그냥 넘어가주시고 봐주시면 감사하겠습니다 ㅠㅠ
살려주시라우,,,
`;
    const interval = setInterval(() => {
      console.clear();
      console.log(banner);
    }, 100);
    return () => clearInterval(interval);
  }, []);

  return (
    <>
      <SecurityHelmet />
      {isLoading && <LoadingScreen />}
      <div className={`flex h-[100dvh] w-full max-w-full overflow-hidden bg-[#F8FAFC] dark:bg-neutral-950 transition-opacity duration-500 ${isLoading ? 'opacity-0' : 'opacity-100'}`}>
        <Sidebar />
        <div className="flex-1 md:ml-64 flex flex-col w-full overflow-hidden">
          <Header />
          <main className="flex-1 overflow-y-auto w-full scrollbar-hide">
            {children}
          </main>
        </div>
        <MobileNav />
      </div>
    </>
  );
}
