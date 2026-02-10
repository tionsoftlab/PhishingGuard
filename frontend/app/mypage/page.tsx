"use client";

import React, { useEffect, useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { User, Shield, CreditCard, ChevronRight, AlertTriangle, Camera, X, Sparkles, TrendingUp } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { useRouter } from 'next/navigation';
import { useSession, signOut } from 'next-auth/react';
import ResultDisplay from '@/components/scanner/results/ResultDisplay';

interface UserProfile {
  id: number;
  nickname: string;
  email: string;
  is_expert: boolean;
  expert_verified_at?: string;
  expert_field?: string;
  career_info?: string;
  email_verified: boolean;
  account_status: string;
  profile_image_url?: string;
  created_at: string;
  last_login_at?: string;
  updated_at: string;
}

interface UserCredits {
  total_credits: number;
  used_credits: number;
  remaining_credits: number;
  subscription_type: string;
  next_billing_date?: string;
}

interface UserStatistics {
  total_scans: number;
  safe_scans: number;
  warning_scans: number;
  danger_scans: number;
  threats_blocked: number;
}

interface ExpertStats {
  total_consultations: number;
  average_rating: number;
  monthly_stats: { month: string; count: number }[];
}

interface ScanHistory {
  id: number;
  scan_type: string;
  scan_target: string;
  result: string;
  risk_score?: number;
  threat_types?: string;
  analysis_result?: string;
  processing_time_ms?: number;
  created_at: string;
}

const DEMO_ACCOUNTS = ['user@example.com', 'expert@example.com'];

const MyPage: React.FC = () => {
  const router = useRouter();
  const { data: session, status } = useSession();
  const isDemoAccount = DEMO_ACCOUNTS.includes(session?.user?.email || '');
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [credits, setCredits] = useState<UserCredits | null>(null);
  const [statistics, setStatistics] = useState<UserStatistics | null>(null);
  const [loading, setLoading] = useState(true);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showImageModal, setShowImageModal] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showScanDetailModal, setShowScanDetailModal] = useState(false);
  const [selectedScan, setSelectedScan] = useState<ScanHistory | null>(null);
  const [loadingScanDetail, setLoadingScanDetail] = useState(false);
  const [easyMode, setEasyMode] = useState(true);
  const [showSecurityReportModal, setShowSecurityReportModal] = useState(false);
  const [loadingReport, setLoadingReport] = useState(false);
  const [reportHistory, setReportHistory] = useState<ScanHistory[]>([]);
  const [expertStats, setExpertStats] = useState<ExpertStats | null>(null);


  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin');
      return;
    }

    if (status === 'authenticated') {
      fetchAllData();
    }
  }, [status, router]);

  const fetchAllData = async () => {
    try {
      const [profileRes, creditsRes, statsRes] = await Promise.all([
        fetch('/api/user/profile'),
        fetch('/api/user/credits'),
        fetch('/api/user/statistics')
      ]);

      let profileData = null;

      if (profileRes.ok) {
        profileData = await profileRes.json();
        setProfile(profileData);
      }

      if (creditsRes.ok) {
        const data = await creditsRes.json();
        setCredits(data);
      }

      if (statsRes.ok) {
        const data = await statsRes.json();
        setStatistics(data);
      }

      if (profileData && profileData.is_expert) {
        try {
          const expertRes = await fetch(`/api/expert/dashboard/stats?user_email=${session?.user?.email}`);
          if (expertRes.ok) {
            const expertData = await expertRes.json();
            setExpertStats(expertData);
          }
        } catch (e) {
          console.error('Failed to fetch expert stats', e);
        }
      }
    } catch (error) {
      console.error('데이터 조회 오류:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    setIsDeleting(true);
    try {
      const response = await fetch('/api/user/account', {
        method: 'DELETE',
      });

      if (response.ok) {
        alert('회원 탈퇴가 완료되었습니다.');
        await signOut({ redirect: true, callbackUrl: '/auth/signin' });
      } else {
        const data = await response.json();
        alert(data.error || '회원 탈퇴에 실패했습니다.');
      }
    } catch (error) {
      console.error('회원 탈퇴 오류:', error);
      alert('회원 탈퇴 처리 중 오류가 발생했습니다.');
    } finally {
      setIsDeleting(false);
      setShowDeleteModal(false);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      alert('파일 크기는 5MB 이하여야 합니다.');
      return;
    }

    if (!file.type.startsWith('image/')) {
      alert('이미지 파일만 업로드 가능합니다.');
      return;
    }

    setIsUploadingImage(true);

    try {
      const formData = new FormData();
      formData.append('image', file);

      const response = await fetch('/api/user/profile-image', {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        const data = await response.json();
        await fetchAllData();
        window.dispatchEvent(new Event('user-profile-updated'));
        setShowImageModal(false);
        alert('프로필 이미지가 업데이트되었습니다.');
      } else {
        const data = await response.json();
        alert(data.error || '이미지 업로드에 실패했습니다.');
      }
    } catch (error) {
      console.error('이미지 업로드 오류:', error);
      alert('이미지 업로드 중 오류가 발생했습니다.');
    } finally {
      setIsUploadingImage(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleImageDelete = async () => {
    if (!confirm('프로필 이미지를 삭제하시겠습니까?')) return;

    try {
      const response = await fetch('/api/user/profile-image', {
        method: 'DELETE',
      });

      if (response.ok) {
        await fetchAllData();
        window.dispatchEvent(new Event('user-profile-updated'));
        setShowImageModal(false);
        alert('프로필 이미지가 삭제되었습니다.');
      } else {
        const data = await response.json();
        alert(data.error || '이미지 삭제에 실패했습니다.');
      }
    } catch (error) {
      console.error('이미지 삭제 오류:', error);
      alert('이미지 삭제 중 오류가 발생했습니다.');
    }
  };

  const handleSecurityReportClick = async () => {
    setShowSecurityReportModal(true);
    setLoadingReport(true);

    try {
      const response = await fetch('/api/user/scan-history?limit=20');
      if (response.ok) {
        const data = await response.json();
        setReportHistory(data.history || []);
      }
    } catch (error) {
      console.error('보안 리포트 조회 오류:', error);
    } finally {
      setLoadingReport(false);
    }
  };

  const handleScanClick = async (scan: ScanHistory) => {
    setSelectedScan(scan);
    setShowScanDetailModal(true);
    setLoadingScanDetail(true);

    try {
      const response = await fetch(`/api/user/scan-history/${scan.id}`);
      if (response.ok) {
        const detailData = await response.json();
        setSelectedScan(detailData);
      }
    } catch (error) {
      console.error('스캔 상세 정보 조회 오류:', error);
    } finally {
      setLoadingScanDetail(false);
    }
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

  if (!profile) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-gray-600 dark:text-gray-400">프로필을 불러올 수 없습니다.</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto pb-20 md:pb-20 p-4 md:p-6">
      <div className="bg-white dark:bg-neutral-900 rounded-2xl p-6 md:p-8 shadow-sm border border-gray-100 dark:border-neutral-800 mb-6 flex flex-col md:flex-row items-center gap-6 md:gap-8">
        <div className="relative">
            <div className="w-24 h-24 md:w-32 md:h-32 rounded-full bg-gray-100 dark:bg-neutral-800 p-1 border border-gray-200 dark:border-neutral-700 flex items-center justify-center overflow-hidden">
                {profile.profile_image_url ? (
                  <img src={profile.profile_image_url} alt="Profile" className="w-full h-full rounded-full object-cover" />
                ) : (
                  <span className="text-4xl md:text-5xl font-bold text-gray-400 dark:text-gray-600">
                    {profile.nickname.charAt(0)}
                  </span>
                )}
            </div>
            <button 
              onClick={() => {
                if (isDemoAccount) {
                  alert('데모 계정은 프로필 이미지를 변경할 수 없습니다.');
                  return;
                }
                setShowImageModal(true);
              }}
              className="absolute bottom-0 right-0 p-2 bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 rounded-full hover:bg-blue-600 dark:hover:bg-gray-200 transition-colors shadow-md"
            >
                <Camera size={16} />
            </button>
        </div>
        <div className="flex-1 text-center md:text-left">
            <h2 className="text-2xl font-bold text-neutral-900 dark:text-white mb-1">{profile.nickname}</h2>
            <p className="text-neutral-500 dark:text-neutral-400 text-sm mb-4">{profile.email}</p>
            <div className="flex flex-wrap justify-center md:justify-start gap-2">
                {profile.is_expert ? (
                  <span className="px-3 py-1 bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded-lg text-xs font-bold border border-purple-100 dark:border-purple-800">
                    전문가 인증
                  </span>
                ) : (
                  <span className="px-3 py-1 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-lg text-xs font-bold border border-blue-100 dark:border-blue-800">
                    일반 사용자
                  </span>
                )}
                {profile.email_verified && (
                  <span className="px-3 py-1 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 rounded-lg text-xs font-bold border border-emerald-100 dark:border-emerald-800">
                    이메일 인증 완료
                  </span>
                )}
            </div>
        </div>
        <div className="grid grid-cols-2 gap-4 w-full md:w-auto">
             <div className="bg-gray-50 dark:bg-neutral-800 p-4 rounded-xl text-center min-w-[100px]">
                <p className="text-xs text-neutral-500 dark:text-neutral-400 mb-1">가입일</p>
                <p className="text-sm font-bold text-neutral-900 dark:text-white">
                  {new Date(profile.created_at).toLocaleDateString('ko-KR', { year: '2-digit', month: '2-digit', day: '2-digit' })}
                </p>
             </div>
             <div className="bg-gray-50 dark:bg-neutral-800 p-4 rounded-xl text-center min-w-[100px]">
                <p className="text-xs text-neutral-500 dark:text-neutral-400 mb-1">최근 로그인</p>
                <p className="text-sm font-bold text-neutral-900 dark:text-white">
                  {profile.last_login_at 
                    ? new Date(profile.last_login_at).toLocaleDateString('ko-KR', { month: '2-digit', day: '2-digit' })
                    : '오늘'
                  }
                </p>
             </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-6">
            {profile?.is_expert && (
              <div className="space-y-6 mb-8">
                <h3 className="font-bold text-neutral-900 dark:text-neutral-100 text-lg px-2 flex items-center gap-2">
                  <span className="w-2 h-6 bg-purple-600 rounded-full"></span>
                  전문가 대시보드
                </h3>
                
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-4 mb-4 md:mb-6">
                  <div className="bg-white dark:bg-neutral-900 p-4 md:p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-neutral-800 flex flex-col justify-between">
                    <div>
                      <p className="text-xs md:text-sm text-neutral-500 dark:text-neutral-400 mb-1 font-medium">누적 상담</p>
                      <div className="flex items-end gap-1.5 md:gap-2">
                        <span className="text-2xl md:text-4xl font-bold text-neutral-900 dark:text-white">
                          {expertStats?.total_consultations || 0}
                        </span>
                        <span className="text-xs md:text-sm text-neutral-400 mb-1 md:mb-1.5">건</span>
                      </div>
                    </div>
                    <div className="mt-2 md:mt-4 flex items-center gap-1 text-emerald-600 text-[10px] md:text-xs font-medium">
                      <TrendingUp size={12} className="md:w-[14px] md:h-[14px]" />
                      <span>지난달 대비 증가</span>
                    </div>
                  </div>
                  
                  <div className="bg-white dark:bg-neutral-900 p-4 md:p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-neutral-800 flex flex-col justify-between">
                    <div>
                      <p className="text-xs md:text-sm text-neutral-500 dark:text-neutral-400 mb-1 font-medium">전문가 평점</p>
                      <div className="flex items-end gap-1.5 md:gap-2">
                        <span className="text-2xl md:text-4xl font-bold text-neutral-900 dark:text-white">
                          {expertStats?.average_rating || 0.0}
                        </span>
                        <span className="text-xs md:text-sm text-yellow-500 mb-1 md:mb-1.5">★</span>
                      </div>
                    </div>
                     <div className="mt-2 md:mt-4 text-[10px] md:text-xs text-neutral-400">
                      최근 30일 기준
                    </div>
                  </div>

                  <div className="col-span-2 md:col-span-1 bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20 p-4 md:p-6 rounded-2xl border border-indigo-100 dark:border-indigo-900/50 flex flex-col justify-center">
                    <h4 className="font-bold text-indigo-900 dark:text-indigo-100 mb-1.5 md:mb-2 flex items-center gap-1.5 md:gap-2 text-xs md:text-sm">
                      <Sparkles size={14} className="md:w-[16px] md:h-[16px] text-indigo-600 dark:text-indigo-400" />
                      성장 팁
                    </h4>
                    <p className="text-[11px] md:text-xs text-indigo-800 dark:text-indigo-200 leading-relaxed">
                       {(expertStats?.average_rating || 0) >= 4.5 
                        ? "평점이 완벽합니다! 상담료 인상을 고려해보세요." 
                        : "상담 후기 요청을 통해 평점을 관리해보세요."}
                    </p>
                  </div>
                </div>

                <div className="bg-white dark:bg-neutral-900 p-4 md:p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-neutral-800">
                  <h4 className="font-bold text-neutral-900 dark:text-white mb-4 md:mb-6 text-xs md:text-sm">월별 상담 현황</h4>
                  <div className="h-[180px] md:h-[250px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={expertStats?.monthly_stats || []}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                        <XAxis 
                          dataKey="month" 
                          axisLine={false} 
                          tickLine={false} 
                          tick={{fill: '#9CA3AF', fontSize: 11}} 
                          dy={10}
                        />
                        <YAxis 
                          axisLine={false} 
                          tickLine={false} 
                          tick={{fill: '#9CA3AF', fontSize: 11}} 
                        />
                        <Tooltip 
                          cursor={{fill: 'transparent'}}
                          contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', fontSize: '12px'}}
                        />
                        <Bar dataKey="count" radius={[4, 4, 0, 0]} barSize={30}>
                           {expertStats?.monthly_stats?.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={index === (expertStats?.monthly_stats?.length - 1) ? '#6366f1' : '#e5e7eb'} />
                            ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                  </div>
                </div>
            )}

            <h3 className="font-bold text-neutral-900 dark:text-neutral-100 text-lg px-2">최근 활동 내역</h3>
            <div className="bg-white dark:bg-neutral-900 rounded-2xl shadow-sm border border-gray-100 dark:border-neutral-800 overflow-hidden">
                <div className="p-8 text-center">
                    <p className="text-neutral-500 dark:text-neutral-400 mb-2">커뮤니티 활동 내역</p>
                    <p className="text-xs text-neutral-400 dark:text-neutral-500">게시글, 댓글 등의 활동이 여기에 표시됩니다.</p>
                </div>
            </div>
        </div>

        <div className="space-y-4">
            <h3 className="font-bold text-neutral-900 dark:text-neutral-100 text-lg px-2">바로가기</h3>
            
            <motion.button 
                whileHover={{ scale: 1.02 }}
                onClick={handleSecurityReportClick}
                className="w-full bg-gradient-to-r from-neutral-800 to-neutral-900 dark:from-neutral-700 dark:to-neutral-800 text-white p-5 rounded-2xl shadow-lg flex items-center justify-between"
            >
                <div className="flex items-center gap-3">
                    <Shield size={24} className="text-emerald-400" />
                    <div className="text-left">
                        <p className="font-bold text-sm">보안 리포트</p>
                        <p className="text-xs text-neutral-400">
                          총 {statistics?.total_scans || 0}회 검사 • {statistics?.threats_blocked || 0}개 차단
                        </p>
                    </div>
                </div>
                <ChevronRight size={18} />
            </motion.button>

            <motion.button 
                whileHover={{ scale: 1.02 }}
                className="w-full bg-white dark:bg-neutral-900 p-5 rounded-2xl shadow-sm border border-gray-200 dark:border-neutral-800 flex items-center justify-between group"
            >
                <div className="flex items-center gap-3">
                    <CreditCard size={24} className="text-blue-500" />
                    <div className="text-left">
                        <p className="font-bold text-sm text-neutral-900 dark:text-white">크레딧</p>
                        <p className="text-xs text-neutral-500 dark:text-neutral-500">
                          {credits?.remaining_credits || 0} / {credits?.total_credits || 100}
                          {credits?.next_billing_date && ` • 갱신일: ${new Date(credits.next_billing_date).toLocaleDateString('ko-KR', { month: 'long', day: 'numeric' })}`}
                        </p>
                    </div>
                </div>
                <ChevronRight size={18} className="text-neutral-300 dark:text-neutral-600 group-hover:text-neutral-600 dark:group-hover:text-neutral-400" />
            </motion.button>
            
             <motion.button 
                whileHover={{ scale: 1.02 }}
                onClick={() => router.push('/settings')}
                className="w-full bg-white dark:bg-neutral-900 p-5 rounded-2xl shadow-sm border border-gray-200 dark:border-neutral-800 flex items-center justify-between group"
            >
                <div className="flex items-center gap-3">
                    <User size={24} className="text-purple-500" />
                    <div className="text-left">
                        <p className="font-bold text-sm text-neutral-900 dark:text-white">계정 정보</p>
                        <p className="text-xs text-neutral-500 dark:text-neutral-500">설정 및 보안 관리</p>
                    </div>
                </div>
                <ChevronRight size={18} className="text-neutral-300 dark:text-neutral-600 group-hover:text-neutral-600 dark:group-hover:text-neutral-400" />
            </motion.button>

            <motion.button 
                whileHover={{ scale: 1.02 }}
                onClick={() => {
                  if (isDemoAccount) {
                    alert('데모 계정은 탈퇴할 수 없습니다.');
                    return;
                  }
                  setShowDeleteModal(true);
                }}
                className="w-full bg-red-50 dark:bg-red-900/20 p-5 rounded-2xl shadow-sm border border-red-200 dark:border-red-900/50 flex items-center justify-between group hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors"
            >
                <div className="flex items-center gap-3">
                    <AlertTriangle size={24} className="text-red-500" />
                    <div className="text-left">
                        <p className="font-bold text-sm text-red-700 dark:text-red-400">회원 탈퇴</p>
                        <p className="text-xs text-red-600 dark:text-red-500">계정을 영구적으로 삭제합니다</p>
                    </div>
                </div>
                <ChevronRight size={18} className="text-red-400 dark:text-red-600" />
            </motion.button>
        </div>
      </div>

      {showDeleteModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white dark:bg-neutral-900 rounded-2xl p-6 max-w-md w-full shadow-2xl"
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                <AlertTriangle size={24} className="text-red-600 dark:text-red-400" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-neutral-900 dark:text-white">회원 탈퇴</h3>
                <p className="text-sm text-neutral-500 dark:text-neutral-400">정말로 탈퇴하시겠습니까?</p>
              </div>
            </div>
            
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-900/50 rounded-xl p-4 mb-6">
              <p className="text-sm text-red-700 dark:text-red-400 mb-2">
                <strong>주의:</strong> 회원 탈퇴 시 다음 정보가 삭제됩니다:
              </p>
              <ul className="text-sm text-red-600 dark:text-red-500 space-y-1 ml-4 list-disc">
                <li>계정 정보 및 프로필</li>
                <li>활동 기록 및 검사 내역</li>
                <li>저장된 모든 데이터</li>
              </ul>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteModal(false)}
                disabled={isDeleting}
                className="flex-1 px-4 py-3 bg-gray-200 dark:bg-neutral-800 text-gray-700 dark:text-gray-300 rounded-xl font-medium hover:bg-gray-300 dark:hover:bg-neutral-700 transition-colors disabled:opacity-50"
              >
                취소
              </button>
              <button
                onClick={handleDeleteAccount}
                disabled={isDeleting}
                className="flex-1 px-4 py-3 bg-red-600 text-white rounded-xl font-medium hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isDeleting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    탈퇴 처리 중...
                  </>
                ) : (
                  '탈퇴하기'
                )}
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {showImageModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white dark:bg-neutral-900 rounded-2xl p-6 max-w-md w-full shadow-2xl"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-neutral-900 dark:text-white">프로필 이미지 변경</h3>
              <button 
                onClick={() => setShowImageModal(false)}
                className="p-2 hover:bg-gray-100 dark:hover:bg-neutral-800 rounded-lg transition-colors"
              >
                <X size={20} className="text-neutral-500" />
              </button>
            </div>

            <div className="flex flex-col items-center gap-4 mb-6">
              <div className="w-32 h-32 rounded-full bg-gray-100 dark:bg-neutral-800 flex items-center justify-center overflow-hidden border-4 border-gray-200 dark:border-neutral-700">
                {profile?.profile_image_url ? (
                  <img src={profile.profile_image_url} alt="Profile" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-5xl font-bold text-gray-400 dark:text-gray-600">
                    {profile?.nickname.charAt(0)}
                  </span>
                )}
              </div>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              className="hidden"
            />

            <div className="space-y-3">
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploadingImage}
                className="w-full px-4 py-3 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isUploadingImage ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    업로드 중...
                  </>
                ) : (
                  <>
                    <Camera size={18} />
                    새 이미지 업로드
                  </>
                )}
              </button>

              {profile?.profile_image_url && (
                <button
                  onClick={handleImageDelete}
                  disabled={isUploadingImage}
                  className="w-full px-4 py-3 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-xl font-medium hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors disabled:opacity-50"
                >
                  이미지 삭제
                </button>
              )}

              <button
                onClick={() => setShowImageModal(false)}
                disabled={isUploadingImage}
                className="w-full px-4 py-3 bg-gray-200 dark:bg-neutral-800 text-gray-700 dark:text-gray-300 rounded-xl font-medium hover:bg-gray-300 dark:hover:bg-neutral-700 transition-colors disabled:opacity-50"
              >
                닫기
              </button>
            </div>

            <p className="text-xs text-neutral-500 dark:text-neutral-400 text-center mt-4">
              최대 5MB, JPG/PNG/GIF 형식
            </p>
          </motion.div>
        </div>
      )}

      {showSecurityReportModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white dark:bg-neutral-900 rounded-2xl p-6 max-w-4xl w-full shadow-2xl my-8"
          >
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-2xl font-bold text-neutral-900 dark:text-white">보안 리포트</h3>
                <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">
                  총 {statistics?.total_scans || 0}회 검사 • {statistics?.threats_blocked || 0}개 위협 차단
                </p>
              </div>
              <button 
                onClick={() => setShowSecurityReportModal(false)}
                className="p-2 hover:bg-gray-100 dark:hover:bg-neutral-800 rounded-lg transition-colors"
              >
                <X size={24} className="text-neutral-500" />
              </button>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-emerald-50 dark:bg-emerald-900/20 p-4 rounded-xl border border-emerald-200 dark:border-emerald-900/50">
                <p className="text-xs text-emerald-600 dark:text-emerald-400 mb-1">안전</p>
                <p className="text-2xl font-bold text-emerald-700 dark:text-emerald-300">
                  {statistics?.safe_scans || 0}
                </p>
              </div>
              <div className="bg-amber-50 dark:bg-amber-900/20 p-4 rounded-xl border border-amber-200 dark:border-amber-900/50">
                <p className="text-xs text-amber-600 dark:text-amber-400 mb-1">경고</p>
                <p className="text-2xl font-bold text-amber-700 dark:text-amber-300">
                  {statistics?.warning_scans || 0}
                </p>
              </div>
              <div className="bg-rose-50 dark:bg-rose-900/20 p-4 rounded-xl border border-rose-200 dark:border-rose-900/50">
                <p className="text-xs text-rose-600 dark:text-rose-400 mb-1">위험</p>
                <p className="text-2xl font-bold text-rose-700 dark:text-rose-300">
                  {statistics?.danger_scans || 0}
                </p>
              </div>
              <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-xl border border-blue-200 dark:border-blue-900/50">
                <p className="text-xs text-blue-600 dark:text-blue-400 mb-1">총 검사</p>
                <p className="text-2xl font-bold text-blue-700 dark:text-blue-300">
                  {statistics?.total_scans || 0}
                </p>
              </div>
            </div>

            <div className="space-y-2 max-h-96 overflow-y-auto">
              <h4 className="font-bold text-neutral-900 dark:text-white mb-3">검사 기록</h4>
              {loadingReport ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                </div>
              ) : reportHistory.length > 0 ? (
                reportHistory.map((scan) => {
                  const isWarning = scan.result === 'warning';
                  const isDanger = scan.result === 'danger';
                  
                  return (
                    <div 
                      key={scan.id}
                      onClick={() => handleScanClick(scan)}
                      className="flex items-center gap-4 p-4 bg-gray-50 dark:bg-neutral-800 rounded-xl hover:bg-gray-100 dark:hover:bg-neutral-700 transition-colors cursor-pointer"
                    >
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                        isDanger ? 'bg-rose-100 text-rose-500 dark:bg-rose-900/30' : 
                        isWarning ? 'bg-amber-100 text-amber-500 dark:bg-amber-900/30' :
                        'bg-emerald-100 text-emerald-500 dark:bg-emerald-900/30'
                      }`}>
                        <Shield size={18} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-neutral-900 dark:text-neutral-200 truncate">
                          {scan.scan_type.toUpperCase()} 검사
                        </p>
                        <p className="text-xs text-neutral-500 dark:text-neutral-400 truncate">
                          {scan.scan_target.substring(0, 50)}...
                        </p>
                        <p className="text-xs text-neutral-400 dark:text-neutral-500 mt-1">
                          {new Date(scan.created_at).toLocaleString('ko-KR')}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`text-xs font-bold px-3 py-1 rounded-full ${
                          isDanger ? 'bg-rose-100 text-rose-600 dark:bg-rose-900/30 dark:text-rose-400' : 
                          isWarning ? 'bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400' :
                          'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400'
                        }`}>
                          {Number(scan.risk_score || 0).toFixed(0)}점
                        </span>
                        <ChevronRight size={16} className="text-neutral-300 dark:text-neutral-600" />
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="p-8 text-center bg-gray-50 dark:bg-neutral-800 rounded-xl">
                  <p className="text-neutral-500 dark:text-neutral-400">검사 기록이 없습니다.</p>
                  <p className="text-xs text-neutral-400 dark:text-neutral-500 mt-1">
                    설정에서 "검사 결과 기록 저장"이 활성화되어 있는지 확인하세요.
                  </p>
                </div>
              )}
            </div>

            <button
              onClick={() => setShowSecurityReportModal(false)}
              className="w-full mt-6 px-4 py-3 bg-gray-200 dark:bg-neutral-800 text-gray-700 dark:text-gray-300 rounded-xl font-medium hover:bg-gray-300 dark:hover:bg-neutral-700 transition-colors"
            >
              닫기
            </button>
          </motion.div>
        </div>
      )}

      {showScanDetailModal && selectedScan && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white dark:bg-neutral-900 rounded-2xl p-6 max-w-2xl w-full shadow-2xl my-8 max-h-[90vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-neutral-900 dark:text-white">검사 상세 내역</h3>
              <button 
                onClick={() => setShowScanDetailModal(false)}
                className="p-2 hover:bg-gray-100 dark:hover:bg-neutral-800 rounded-lg transition-colors"
              >
                <X size={20} className="text-neutral-500" />
              </button>
            </div>

            {loadingScanDetail ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
              </div>
            ) : (
              <div className="space-y-6">
                {(() => {
                  let resultData: any = null;
                   try {
                     const parsedAnalysis = selectedScan.analysis_result 
                       ? JSON.parse(selectedScan.analysis_result) 
                       : {};

                     resultData = {
                       final_status: selectedScan.result.toUpperCase(),
                       status: selectedScan.result.toUpperCase(),
                       score: selectedScan.risk_score || 0,
                       redirect_chain: parsedAnalysis.redirect_chain || [],
                       ai_analysis: parsedAnalysis.ai_analysis,
                       phishing_analysis: parsedAnalysis.phishing_analysis || parsedAnalysis.ai_pred,
                       google_safe_browsing: parsedAnalysis.google_safe_browsing,
                       virustotal: parsedAnalysis.virustotal,
                       content_comparison: parsedAnalysis.content_comparison,
                       scan_type: selectedScan.scan_type?.toLowerCase(),
                       scan_target: selectedScan.scan_target,
                       steps: parsedAnalysis.steps || {},
                       message: parsedAnalysis.message || parsedAnalysis.ai_analysis?.reason,
                       final_trust_score: selectedScan.risk_score ? Number(selectedScan.risk_score) : 0,
                       screenshot_url: parsedAnalysis.screenshot_url,
                       qr_data: parsedAnalysis.qr_data || parsedAnalysis.text,
                       text: parsedAnalysis.text || parsedAnalysis.qr_data,
                       url_analysis: parsedAnalysis.url_analysis
                     };
                   } catch (e) {
                     console.error("Failed to parse analysis result", e);
                     resultData = {
                        final_status: selectedScan.result.toUpperCase(),
                        status: selectedScan.result.toUpperCase(),
                        score: selectedScan.risk_score || 0,
                        scan_target: selectedScan.scan_target
                     };
                   }

                   const normalizedResult = 
                     (selectedScan.result === 'warning' || selectedScan.result === 'suspect') ? 'suspicious' :
                     (selectedScan.result === 'safe') ? 'safe' : 
                     'danger';

                   return (
                     <div className="result-display-wrapper max-h-[80vh] overflow-y-auto">
                        <ResultDisplay 
                            isScanning={false}
                            result={normalizedResult} 
                            resultData={resultData}
                            hasNetworkError={false}
                            setResult={() => {}} 
                            setResultData={() => {}}
                            onReset={() => {}}
                            easyMode={easyMode}
                            setEasyMode={setEasyMode}
                            mode={(selectedScan.scan_type?.toLowerCase() as any) || 'url'}
                        />
                     </div>
                   );
                })()}



                <button
                  onClick={() => setShowScanDetailModal(false)}
                  className="w-full px-4 py-3 bg-gray-200 dark:bg-neutral-800 text-gray-700 dark:text-gray-300 rounded-xl font-medium hover:bg-gray-300 dark:hover:bg-neutral-700 transition-colors"
                >
                  닫기
                </button>
              </div>
            )}
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default MyPage;
