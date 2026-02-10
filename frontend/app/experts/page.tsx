"use client";

import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Star, MessageSquare, Clock, Award, Briefcase, Coins } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface Expert {
  id: number;
  specialty: string;
  experience_years: number;
  certifications: string;
  introduction: string;
  consultation_count: number;
  rating: number;
  is_featured: boolean;
  nickname: string;
  profile_image_url: string | null;
  user_id?: number;
}

const Experts: React.FC = () => {
  const router = useRouter();
  const [featuredExperts, setFeaturedExperts] = useState<Expert[]>([]);
  const [allExperts, setAllExperts] = useState<Expert[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    const fetchExperts = async () => {
      try {
        const [featuredRes, allRes] = await Promise.all([
          fetch('/api/experts?featured=true'),
          fetch('/api/experts')
        ]);

        if (featuredRes.ok) {
          const featured = await featuredRes.json();
          setFeaturedExperts(featured);
        }

        if (allRes.ok) {
          const all = await allRes.json();
          setAllExperts(all);
        }
      } catch (error) {
        console.error('전문가 목록 로드 실패:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchExperts();
  }, []);

  const getCreditCost = (expertId: number) => {
    const seed = expertId * 1234;
    const random = (seed % 2001) + 3000;
    return Math.floor(random / 100) * 100;
  };

  const handleConsultation = async (expert: Expert) => {
    if (expert.nickname !== '보안전문가') {
      setShowModal(true);
      return;
    }

    if (creating) return;
    
    setCreating(true);
    try {
      const res = await fetch('/api/messages/threads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ expertId: 2 })
      });

      if (res.ok) {
        const { threadId } = await res.json();
        router.push(`/messages?thread=${threadId}`);
      } else {
        console.error('채팅방 생성 실패');
        router.push('/messages');
      }
    } catch (error) {
      console.error('채팅방 생성 오류:', error);
      router.push('/messages');
    } finally {
      setCreating(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto pb-20 md:pb-20 p-4 md:p-8">
        <div className="text-center py-20">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto pb-20 md:pb-20 p-4 md:p-8">
      <div className="mb-8 md:mb-12 text-center">
        <h2 className="text-3xl md:text-4xl font-bold text-neutral-900 dark:text-neutral-100 mb-3">전문가 매칭</h2>
        <p className="text-base md:text-lg text-neutral-600 dark:text-neutral-400">
          AI 분석으로 해결되지 않는 복잡한 위협은 검증된 보안 전문가에게 의뢰하세요.
        </p>
      </div>

      {featuredExperts.length > 0 && (
        <div className="mb-12">
          <div className="flex items-center gap-2 mb-6">
            <Award className="text-amber-500" size={24} />
            <h3 className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">추천 전문가</h3>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {featuredExperts.map((expert, index) => (
              <motion.div
                key={expert.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 rounded-2xl shadow-lg border-2 border-blue-200 dark:border-blue-800 p-6 hover:shadow-xl transition-all duration-300 relative group"
              >
                <div className="absolute top-4 right-4">
                  <div className="bg-amber-500 text-white px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1">
                    <Award size={14} />
                    <span>FEATURED</span>
                  </div>
                </div>

                <div className="flex flex-col items-center mb-6 mt-4">
                  <div className="w-28 h-28 rounded-full bg-gradient-to-br from-blue-100 to-indigo-100 dark:from-blue-900 dark:to-indigo-900 mb-4 overflow-hidden border-4 border-white dark:border-neutral-800 shadow-lg">
                    {expert.profile_image_url ? (
                      <img src={expert.profile_image_url} alt={expert.nickname} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-4xl font-bold text-blue-600 dark:text-blue-400">
                        {expert.nickname.charAt(0)}
                      </div>
                    )}
                  </div>
                  <h3 className="text-2xl font-bold text-neutral-900 dark:text-neutral-100 mb-1">{expert.nickname}</h3>
                  <p className="text-sm text-blue-600 dark:text-blue-400 font-medium mb-2">{expert.specialty}</p>
                  <div className="flex items-center gap-2 text-sm text-neutral-600 dark:text-neutral-400">
                    <Briefcase size={14} />
                    <span>{expert.experience_years}년 경력</span>
                  </div>
                </div>

                <div className="bg-white/60 dark:bg-neutral-900/60 rounded-xl p-4 mb-4">
                  <p className="text-sm text-neutral-700 dark:text-neutral-300 leading-relaxed line-clamp-3">
                    {expert.introduction}
                  </p>
                </div>

                <div className="bg-white/60 dark:bg-neutral-900/60 rounded-xl p-3 mb-4">
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-1.5">
                      <Star size={18} className="text-amber-400 fill-amber-400" />
                      <span className="font-bold text-neutral-900 dark:text-neutral-100 text-lg">{expert.rating.toFixed(2)}</span>
                      <span className="text-neutral-500 dark:text-neutral-400">({expert.consultation_count}건)</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-neutral-600 dark:text-neutral-400">
                      <Clock size={16} />
                      <span>평균 10분 내</span>
                    </div>
                  </div>
                </div>

                {expert.nickname !== '보안전문가' && (
                  <div className="bg-gradient-to-r from-amber-100 to-orange-100 dark:from-amber-900/40 dark:to-orange-900/40 rounded-xl p-3 mb-4 border-2 border-amber-200 dark:border-amber-800">
                    <div className="flex items-center justify-center gap-2 text-amber-700 dark:text-amber-300">
                      <Coins size={18} className="flex-shrink-0" />
                      <span className="font-bold text-base">{getCreditCost(expert.id).toLocaleString()} 크레딧 필요</span>
                    </div>
                  </div>
                )}

                <button 
                  onClick={() => handleConsultation(expert)}
                  disabled={creating}
                  className="w-full py-3.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl font-bold flex items-center justify-center gap-2 hover:from-blue-700 hover:to-indigo-700 transition-all shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <MessageSquare size={20} />
                  <span>{creating ? '생성 중...' : expert.nickname === '보안전문가' ? '무료 채팅 상담하기' : '채팅 상담하기'}</span>
                </button>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      <div>
        <h3 className="text-2xl font-bold text-neutral-900 dark:text-neutral-100 mb-6">전체 전문가</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {allExperts.map((expert, index) => (
            <motion.div
              key={expert.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: (featuredExperts.length * 0.1) + (index * 0.1) }}
              className="bg-white dark:bg-neutral-900 rounded-2xl shadow-sm border border-neutral-200 dark:border-neutral-800 p-6 hover:shadow-lg hover:border-blue-200 dark:hover:border-blue-800 transition-all duration-300 relative group"
            >
              {expert.is_featured && (
                <div className="absolute top-4 right-4">
                  <Award className="text-amber-500" size={20} />
                </div>
              )}

              <div className="flex items-start gap-4 mb-4">
                <div className="w-20 h-20 rounded-full bg-neutral-100 dark:bg-neutral-800 overflow-hidden border-2 border-neutral-200 dark:border-neutral-700 flex-shrink-0">
                  {expert.profile_image_url ? (
                    <img src={expert.profile_image_url} alt={expert.nickname} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-2xl font-bold text-blue-600 dark:text-blue-400">
                      {expert.nickname.charAt(0)}
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-lg font-bold text-neutral-900 dark:text-neutral-100 mb-1 truncate">{expert.nickname}</h3>
                  <p className="text-sm text-blue-600 dark:text-blue-400 font-medium mb-2">{expert.specialty}</p>
                  <div className="flex items-center gap-2 text-xs text-neutral-500 dark:text-neutral-400">
                    <Briefcase size={12} />
                    <span>{expert.experience_years}년</span>
                  </div>
                </div>
              </div>

              <div className="bg-neutral-50 dark:bg-neutral-800/50 rounded-xl p-3 mb-4">
                <p className="text-xs text-neutral-600 dark:text-neutral-400 leading-relaxed line-clamp-2">
                  {expert.introduction}
                </p>
              </div>

              <div className="flex items-center justify-between text-sm mb-4 px-1">
                <div className="flex items-center gap-1">
                  <Star size={16} className="text-amber-400 fill-amber-400" />
                  <span className="font-bold text-neutral-900 dark:text-neutral-100">{expert.rating.toFixed(2)}</span>
                  <span className="text-neutral-500 dark:text-neutral-400 text-xs">({expert.consultation_count}건)</span>
                </div>
                <div className="flex items-center gap-1 text-neutral-500 dark:text-neutral-400 text-xs">
                  <Clock size={14} />
                  <span>평균 10분</span>
                </div>
              </div>

              {expert.nickname !== '보안전문가' && (
                <div className="bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/30 dark:to-orange-900/30 rounded-lg p-2.5 mb-4 border border-amber-200 dark:border-amber-800">
                  <div className="flex items-center justify-center gap-1.5 text-amber-700 dark:text-amber-300">
                    <Coins size={14} className="flex-shrink-0" />
                    <span className="font-semibold text-xs">{getCreditCost(expert.id).toLocaleString()} 크레딧</span>
                  </div>
                </div>
              )}

              <button 
                onClick={() => handleConsultation(expert)}
                disabled={creating}
                className="w-full py-2.5 bg-neutral-900 dark:bg-blue-600 text-white rounded-xl font-medium text-sm flex items-center justify-center gap-2 hover:bg-blue-600 dark:hover:bg-blue-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <MessageSquare size={16} />
                <span>{creating ? '생성 중...' : expert.nickname === '보안전문가' ? '무료 상담' : '채팅 상담하기'}</span>
              </button>
            </motion.div>
          ))}
        </div>
      </div>

      {showModal && (
        <div 
          className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={() => setShowModal(false)}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white dark:bg-neutral-900 rounded-2xl shadow-2xl max-w-md w-full p-6 border border-neutral-200 dark:border-neutral-800"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-center">
              <div className="w-16 h-16 bg-amber-100 dark:bg-amber-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                <MessageSquare className="text-amber-600 dark:text-amber-400" size={32} />
              </div>
              <h3 className="text-xl font-bold text-neutral-900 dark:text-neutral-100 mb-2">
                시연용 전문가
              </h3>
              <p className="text-neutral-600 dark:text-neutral-400 mb-6 leading-relaxed">
                해당 전문가는 실존하지 않은 전문가이며, 시연 용도입니다!<br />
                <span className="font-semibold text-blue-600 dark:text-blue-400">보안전문가</span>를 이용해주세요.
              </p>
              <button
                onClick={() => setShowModal(false)}
                className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium transition-colors"
              >
                확인
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default Experts;
