"use client";

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTheme } from 'next-themes';
import { Lock, User, Palette, Moon, Shield, HelpCircle, ChevronRight, LogOut, Check, Volume2, X, Globe, MessageSquare, Mail, QrCode, Mic, Bot, Users, BarChart3, BookOpen, Sparkles, Search, ScanLine, ArrowRight } from 'lucide-react';
import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { HELP_CONTENTS } from '@/lib/helpContents';

interface UserSettings {
  theme: string;
  sound_effects: boolean;
  auto_scan: boolean;
}

interface UserProfile {
  nickname: string;
  email: string;
  profile_image_url?: string;
}

const Settings: React.FC = () => {
  const { theme, setTheme } = useTheme();
  const { data: session, status } = useSession();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState('');
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [showHelpModal, setShowHelpModal] = useState(false);
  const [helpStep, setHelpStep] = useState(0);

  const DEMO_ACCOUNTS = ['user@example.com', 'expert@example.com'];
  const isDemoAccount = DEMO_ACCOUNTS.includes(session?.user?.email || '');

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin');
      return;
    }
    
    if (status === 'authenticated') {
      fetchUserData();
    }
  }, [status, router]);

  const fetchUserData = async () => {
    try {
      const [settingsRes, profileRes] = await Promise.all([
        fetch('/api/user/settings'),
        fetch('/api/user/profile')
      ]);

      if (settingsRes.ok) {
        const settingsData = await settingsRes.json();
        setSettings(settingsData);
        
        if (settingsData.theme && settingsData.theme !== 'system') {
          setTheme(settingsData.theme);
        }
      }

      if (profileRes.ok) {
        const profileData = await profileRes.json();
        setProfile(profileData);
      }
    } catch (error) {
      console.error('사용자 데이터 조회 오류:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateSetting = async (field: string, value: any) => {
    try {
      const response = await fetch('/api/user/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [field]: value })
      });

      if (response.ok) {
        const data = await response.json();
        setSettings(data.settings);
      }
    } catch (error) {
      console.error('설정 업데이트 오류:', error);
      alert('설정 업데이트에 실패했습니다.');
    }
  };

  const handleThemeToggle = () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
    updateSetting('theme', newTheme);
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError('');
    setPasswordSuccess('');

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPasswordError('새 비밀번호가 일치하지 않습니다.');
      return;
    }

    if (passwordForm.newPassword.length < 8) {
      setPasswordError('비밀번호는 최소 8자 이상이어야 합니다.');
      return;
    }

    setIsChangingPassword(true);

    try {
      const response = await fetch('/api/user/password', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentPassword: passwordForm.currentPassword,
          newPassword: passwordForm.newPassword
        })
      });

      const data = await response.json();

      if (response.ok) {
        setPasswordSuccess('비밀번호가 성공적으로 변경되었습니다.');
        setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
        setTimeout(() => {
          setShowPasswordModal(false);
          setPasswordSuccess('');
        }, 2000);
      } else {
        setPasswordError(data.error || '비밀번호 변경에 실패했습니다.');
      }
    } catch (error) {
      console.error('비밀번호 변경 오류:', error);
      setPasswordError('비밀번호 변경 중 오류가 발생했습니다.');
    } finally {
      setIsChangingPassword(false);
    }
  };

  const handleLogout = async () => {
    await signOut({ redirect: true, callbackUrl: '/auth/signin' });
  };

  if (loading || status === 'loading') {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">로딩 중...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto pb-20 md:pb-20 p-4 md:p-8">
      <div className="mb-6 md:mb-8">
        <h2 className="text-2xl font-bold text-neutral-900 dark:text-neutral-50">설정</h2>
        <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">앱 환경설정 및 계정 관리</p>
      </div>

      <div className="space-y-6">
        <section className="bg-white dark:bg-neutral-900 rounded-2xl border border-gray-200 dark:border-neutral-800 overflow-hidden">
            <div className="p-6 flex items-center gap-4">
                <div className="w-16 h-16 rounded-full bg-neutral-100 dark:bg-neutral-800 overflow-hidden">
                    {profile?.profile_image_url ? (
                      <img src={profile.profile_image_url} alt="Profile" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-2xl font-bold text-neutral-400 dark:text-neutral-600">
                        {profile?.nickname?.charAt(0) || 'U'}
                      </div>
                    )}
                </div>
                <div className="flex-1">
                    <h3 className="font-bold text-lg text-neutral-900 dark:text-neutral-50">{profile?.nickname || '사용자'}</h3>
                    <p className="text-sm text-neutral-500 dark:text-neutral-400">{profile?.email || session?.user?.email}</p>
                </div>
                <button 
                  onClick={() => router.push('/mypage')}
                  className="px-4 py-2 bg-neutral-50 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 rounded-lg text-sm font-medium hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors"
                >
                    프로필 편집
                </button>
            </div>
        </section>

        <section className="bg-white dark:bg-neutral-900 rounded-2xl border border-gray-200 dark:border-neutral-800 overflow-hidden">
            <div className="p-4 border-b border-gray-100 dark:border-neutral-800">
                <h3 className="font-bold text-neutral-900 dark:text-neutral-50 text-sm flex items-center gap-2">
                    <User size={18} className="text-blue-500" />
                    계정 설정
                </h3>
            </div>
            <div className="divide-y divide-gray-100 dark:divide-neutral-800">
                <button 
                  onClick={() => {
                    if (isDemoAccount) {
                      alert('데모 계정은 비밀번호를 변경할 수 없습니다.');
                      return;
                    }
                    setShowPasswordModal(true);
                  }}
                  className={`w-full flex items-center justify-between p-4 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors text-left ${isDemoAccount ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                    <div className="flex items-center gap-3">
                        <Lock size={18} className="text-neutral-400 dark:text-neutral-500" />
                        <span className="text-sm font-medium text-neutral-700 dark:text-neutral-200">비밀번호 변경</span>
                        {isDemoAccount && <span className="text-xs text-neutral-400 dark:text-neutral-500">(데모 계정)</span>}
                    </div>
                    <ChevronRight size={16} className="text-neutral-300 dark:text-neutral-600" />
                </button>
            </div>
        </section>

        <section className="bg-white dark:bg-neutral-900 rounded-2xl border border-gray-200 dark:border-neutral-800 overflow-hidden">
            <div className="p-4 border-b border-gray-100 dark:border-neutral-800">
                <h3 className="font-bold text-neutral-900 dark:text-neutral-50 text-sm flex items-center gap-2">
                    <Palette size={18} className="text-purple-500" />
                    앱 설정
                </h3>
            </div>
            <div className="divide-y divide-gray-100 dark:divide-neutral-800">
                <div className="w-full flex items-center justify-between p-4 bg-white dark:bg-neutral-900">
                    <div className="flex items-center gap-3">
                        <Volume2 size={18} className="text-neutral-400 dark:text-neutral-500" />
                        <div>
                            <p className="text-sm font-medium text-neutral-700 dark:text-neutral-200">효과음</p>
                            <p className="text-xs text-neutral-400 dark:text-neutral-500">앱 효과음 재생</p>
                        </div>
                    </div>
                    <button 
                        onClick={() => {
                          const newValue = !settings?.sound_effects;
                          updateSetting('sound_effects', newValue);
                        }}
                        className={`w-11 h-6 rounded-full transition-colors relative ${settings?.sound_effects ? 'bg-blue-500' : 'bg-neutral-200 dark:bg-neutral-700'}`}
                    >
                        <span className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${settings?.sound_effects ? 'left-6' : 'left-1'}`} />
                    </button>
                </div>

                <div className="w-full flex items-center justify-between p-4 bg-white dark:bg-neutral-900">
                    <div className="flex items-center gap-3">
                        <Moon size={18} className="text-neutral-400 dark:text-neutral-500" />
                        <div>
                            <p className="text-sm font-medium text-neutral-700 dark:text-neutral-200">다크 모드</p>
                            <p className="text-xs text-neutral-400 dark:text-neutral-500">어두운 테마 사용</p>
                        </div>
                    </div>
                    <button 
                        onClick={handleThemeToggle}
                        className={`w-11 h-6 rounded-full transition-colors relative ${mounted && theme === 'dark' ? 'bg-blue-500' : 'bg-neutral-200 dark:bg-neutral-700'}`}
                    >
                        <span className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${mounted && theme === 'dark' ? 'left-6' : 'left-1'}`} />
                    </button>
                </div>
            </div>
        </section>

        <section className="bg-white dark:bg-neutral-900 rounded-2xl border border-gray-200 dark:border-neutral-800 overflow-hidden">
            <div className="p-4 border-b border-gray-100 dark:border-neutral-800">
                <h3 className="font-bold text-neutral-900 dark:text-neutral-50 text-sm flex items-center gap-2">
                    <Shield size={18} className="text-emerald-500" />
                    기타
                </h3>
            </div>
            <div className="divide-y divide-gray-100 dark:divide-neutral-800">
                <button 
                  onClick={() => { setHelpStep(0); setShowHelpModal(true); }}
                  className="w-full flex items-center justify-between p-4 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors text-left"
                >
                    <div className="flex items-center gap-3">
                        <HelpCircle size={18} className="text-neutral-400 dark:text-neutral-500" />
                        <span className="text-sm font-medium text-neutral-700 dark:text-neutral-200">도움말 및 지원</span>
                    </div>
                    <ChevronRight size={16} className="text-neutral-300 dark:text-neutral-600" />
                </button>
                <button 
                  onClick={handleLogout}
                  className="w-full flex items-center justify-between p-4 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors text-left text-rose-600 hover:text-rose-700 dark:hover:text-rose-400"
                >
                    <div className="flex items-center gap-3">
                        <LogOut size={18} />
                        <span className="text-sm font-medium">로그아웃</span>
                    </div>
                </button>
            </div>
        </section>
      </div>

      {showPasswordModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white dark:bg-neutral-900 rounded-2xl p-6 max-w-md w-full shadow-2xl"
          >
            <h3 className="text-xl font-bold text-neutral-900 dark:text-white mb-4">비밀번호 변경</h3>
            
            <form onSubmit={handlePasswordChange} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                  현재 비밀번호
                </label>
                <input
                  type="password"
                  value={passwordForm.currentPassword}
                  onChange={(e) => setPasswordForm({...passwordForm, currentPassword: e.target.value})}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                  새 비밀번호
                </label>
                <input
                  type="password"
                  value={passwordForm.newPassword}
                  onChange={(e) => setPasswordForm({...passwordForm, newPassword: e.target.value})}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                  minLength={8}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                  새 비밀번호 확인
                </label>
                <input
                  type="password"
                  value={passwordForm.confirmPassword}
                  onChange={(e) => setPasswordForm({...passwordForm, confirmPassword: e.target.value})}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>

              {passwordError && (
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-900/50 rounded-lg p-3">
                  <p className="text-sm text-red-600 dark:text-red-400">{passwordError}</p>
                </div>
              )}

              {passwordSuccess && (
                <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-900/50 rounded-lg p-3">
                  <p className="text-sm text-emerald-600 dark:text-emerald-400 flex items-center gap-2">
                    <Check size={16} />
                    {passwordSuccess}
                  </p>
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowPasswordModal(false);
                    setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
                    setPasswordError('');
                    setPasswordSuccess('');
                  }}
                  disabled={isChangingPassword}
                  className="flex-1 px-4 py-2 bg-gray-200 dark:bg-neutral-800 text-gray-700 dark:text-gray-300 rounded-lg font-medium hover:bg-gray-300 dark:hover:bg-neutral-700 transition-colors disabled:opacity-50"
                >
                  취소
                </button>
                <button
                  type="submit"
                  disabled={isChangingPassword}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isChangingPassword ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      변경 중...
                    </>
                  ) : (
                    '변경하기'
                  )}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      <AnimatePresence>
        {showHelpModal && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[60] p-4"
            onClick={() => setShowHelpModal(false)}
          >
            <motion.div
              initial={{ y: 40, opacity: 0, scale: 0.97 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              exit={{ y: 40, opacity: 0, scale: 0.97 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="bg-white dark:bg-neutral-900 rounded-3xl max-w-lg w-full shadow-2xl overflow-hidden max-h-[85vh] flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between p-5 border-b border-gray-100 dark:border-neutral-800">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                    <BookOpen size={16} className="text-blue-600 dark:text-blue-400" />
                  </div>
                  <h3 className="text-lg font-bold text-neutral-900 dark:text-white">피싱가드 도움말</h3>
                </div>
                <button
                  onClick={() => setShowHelpModal(false)}
                  className="w-8 h-8 rounded-full bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors"
                >
                  <X size={16} className="text-neutral-500" />
                </button>
              </div>

              <div className="px-5 pt-4">
                <div className="flex gap-1.5">
                  {HELP_CONTENTS.map((_, i) => (
                    <button
                      key={i}
                      onClick={() => setHelpStep(i)}
                      className={`h-1 flex-1 rounded-full transition-all duration-300 ${
                        i <= helpStep 
                          ? 'bg-blue-500' 
                          : 'bg-neutral-200 dark:bg-neutral-700'
                      }`}
                    />
                  ))}
                </div>
                <p className="text-xs text-neutral-400 dark:text-neutral-500 mt-2">
                  {helpStep + 1} / {HELP_CONTENTS.length}
                </p>
              </div>

              <div className="flex-1 overflow-y-auto px-5 py-4">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={helpStep}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.2 }}
                  >
                    <div className={`w-14 h-14 rounded-2xl ${HELP_CONTENTS[helpStep].iconBg} flex items-center justify-center mb-4`}>
                      {HELP_CONTENTS[helpStep].icon}
                    </div>
                    <h4 className="text-xl font-bold text-neutral-900 dark:text-white mb-2">
                      {HELP_CONTENTS[helpStep].title}
                    </h4>
                    <p className="text-sm text-neutral-500 dark:text-neutral-400 mb-5 leading-relaxed">
                      {HELP_CONTENTS[helpStep].description}
                    </p>

                    <div className="space-y-3">
                      {HELP_CONTENTS[helpStep].items.map((item, i) => (
                        <motion.div
                          key={i}
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: i * 0.06 }}
                          className="flex items-start gap-3 p-3 bg-neutral-50 dark:bg-neutral-800/50 rounded-xl"
                        >
                          <div className={`w-7 h-7 rounded-lg ${item.color} flex items-center justify-center flex-shrink-0 mt-0.5`}>
                            {item.icon}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-neutral-800 dark:text-neutral-200">{item.label}</p>
                            <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5 leading-relaxed">{item.desc}</p>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  </motion.div>
                </AnimatePresence>
              </div>

              <div className="p-5 border-t border-gray-100 dark:border-neutral-800 flex gap-3">
                {helpStep > 0 ? (
                  <button
                    onClick={() => setHelpStep(helpStep - 1)}
                    className="px-5 py-2.5 bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 rounded-xl text-sm font-semibold hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors"
                  >
                    이전
                  </button>
                ) : <div />}
                <button
                  onClick={() => {
                    if (helpStep < HELP_CONTENTS.length - 1) {
                      setHelpStep(helpStep + 1);
                    } else {
                      setShowHelpModal(false);
                    }
                  }}
                  className="flex-1 px-5 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
                >
                  {helpStep < HELP_CONTENTS.length - 1 ? (
                    <>다음 <ArrowRight size={14} /></>
                  ) : (
                    <>완료 <Check size={14} /></>
                  )}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Settings;
