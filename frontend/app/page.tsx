"use client";

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageCircle, Eye, Shield, Search, ArrowRight, Flame, List, Filter, Bot, HelpCircle, X, BookOpen, Check } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { HELP_CONTENTS } from '@/lib/helpContents';

interface Post {
  id: number;
  title: string;
  category: string;
  content: string;
  views: number;
  comment_count: number;
  created_at: string;
  author: string;
  is_expert: boolean;
}

const Community: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'recent' | 'popular'>('recent');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [showHelpModal, setShowHelpModal] = useState(false);
  const [helpStep, setHelpStep] = useState(0);
  const router = useRouter();

  useEffect(() => {
    fetchPosts();
  }, [activeTab, selectedCategory]);

  const fetchPosts = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        tab: activeTab,
        ...(selectedCategory !== 'all' && { category: selectedCategory })
      });
      const response = await fetch(`/api/community/posts?${params}`);
      const data = await response.json();
      setPosts(data);
    } catch (error) {
      console.error('게시글 로드 실패:', error);
    } finally {
      setLoading(false);
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case '정보': return 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400';
      case '질문': return 'bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400';
      case '일반': return 'bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400';
      default: return 'bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400';
    }
  };

  return (
    <div className="max-w-5xl mx-auto pb-20 md:pb-20 p-4 md:p-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-6 md:mb-8 gap-4">
        <div>
            <h2 className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">위협 정보 커뮤니티</h2>
            <p className="text-neutral-500 dark:text-neutral-400 mt-1 text-sm md:text-base">사용자와 AI, 전문가가 함께 만드는 실시간 보안 인텔리전스</p>
        </div>
        <button 
            onClick={() => router.push('/community/write')}
            className="w-full md:w-auto bg-neutral-900 dark:bg-white dark:text-neutral-900 text-white px-5 py-2.5 rounded-xl font-medium hover:bg-neutral-800 dark:hover:bg-neutral-200 transition-colors shadow-lg shadow-neutral-200 dark:shadow-none text-sm md:text-base"
        >
            글쓰기 / 제보하기
        </button>
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-r from-blue-600 to-indigo-700 rounded-2xl p-6 mb-8 text-white shadow-lg relative overflow-hidden"
      >
        <div className="relative z-10">
            <h3 className="font-bold text-lg mb-2">의심스러운 메세지를 받으셨나요?</h3>
            <p className="text-blue-100 text-sm mb-4">커뮤니티 데이터와 AI 엔진으로 즉시 분석하고 결과를 공유해보세요.</p>
            <div 
              onClick={() => router.push('/scanner?tab=sms')}
              className="flex gap-2 bg-white/10 backdrop-blur-sm p-1.5 rounded-xl border border-white/20 cursor-pointer hover:bg-white/15 transition-colors"
            >
                <div className="flex-1 flex items-center px-3 gap-2">
                    <Search className="text-blue-200" size={18} />
                    <div className="bg-transparent border-none text-blue-200 text-sm w-full">
                        메세지 내용 입력...
                    </div>
                </div>
                <button 
                    className="bg-white text-blue-700 px-4 py-2 rounded-lg font-bold text-sm hover:bg-blue-50 transition-colors flex items-center gap-1"
                >
                    검사 <ArrowRight size={14} />
                </button>
            </div>
        </div>
        <div className="absolute top-0 right-0 p-8 opacity-10">
            <Shield size={120} />
        </div>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
            
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-4 border-b border-neutral-200 dark:border-neutral-800 pb-2">
                <button 
                    onClick={() => setActiveTab('recent')}
                    className={`flex items-center gap-2 pb-2 text-sm font-bold transition-colors relative
                        ${activeTab === 'recent' ? 'text-neutral-900 dark:text-neutral-100' : 'text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300'}`}
                >
                    <List size={18} />
                    전체글
                    {activeTab === 'recent' && <motion.div layoutId="communityTab" className="absolute bottom-[-9px] left-0 right-0 h-0.5 bg-neutral-900 dark:bg-neutral-100" />}
                </button>
                <button 
                    onClick={() => setActiveTab('popular')}
                    className={`flex items-center gap-2 pb-2 text-sm font-bold transition-colors relative
                        ${activeTab === 'popular' ? 'text-rose-600' : 'text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300'}`}
                >
                    <Flame size={18} className={activeTab === 'popular' ? 'fill-rose-600' : ''} />
                    실시간 인기글
                    {activeTab === 'popular' && <motion.div layoutId="communityTab" className="absolute bottom-[-9px] left-0 right-0 h-0.5 bg-rose-600" />}
                </button>
              </div>
              
              <div className="flex items-center gap-2">
                <Filter size={16} className="text-neutral-400" />
                <select 
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="text-sm border-none bg-transparent text-neutral-600 dark:text-neutral-400 focus:outline-none cursor-pointer"
                >
                  <option value="all">전체</option>
                  <option value="정보">정보</option>
                  <option value="질문">질문</option>
                  <option value="일반">일반</option>
                </select>
              </div>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-20">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
              </div>
            ) : (
              <AnimatePresence mode="wait">
                <motion.div
                    key={activeTab + selectedCategory}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.2 }}
                    className="space-y-4"
                >
                    {posts.map((post) => (
                        <div
                            key={post.id}
                            onClick={() => router.push(`/community/${post.id}`)}
                            className="bg-white dark:bg-neutral-900 rounded-2xl shadow-sm border border-neutral-100 dark:border-neutral-800 overflow-hidden hover:shadow-md transition-all cursor-pointer"
                        >
                            <div className="p-5">
                                <div className="flex items-start justify-between mb-3">
                                    <div className="flex-1">
                                      <div className="flex items-center gap-2 mb-2">
                                        <span className={`px-2 py-0.5 rounded text-xs font-bold ${getCategoryColor(post.category)}`}>
                                          {post.category}
                                        </span>
                                        {post.is_expert && (
                                          <span className="px-2 py-0.5 rounded text-xs font-bold bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400">
                                            전문가
                                          </span>
                                        )}
                                      </div>
                                      <h3 className="font-bold text-neutral-900 dark:text-white mb-2 line-clamp-2 group-hover:text-blue-600 transition-colors">
                                        {post.title}
                                      </h3>
                                      <p className="text-sm text-neutral-600 dark:text-neutral-400 line-clamp-3 mb-3">
                                        {post.content}
                                      </p>
                                      <div className="flex items-center gap-3 text-xs text-neutral-500 dark:text-neutral-400">
                                        <span>{post.author}</span>
                                        <span>·</span>
                                        <span>{new Date(post.created_at).toLocaleDateString('ko-KR', { 
                                          month: 'numeric', 
                                          day: 'numeric',
                                          hour: '2-digit',
                                          minute: '2-digit'
                                        })}</span>
                                      </div>
                                    </div>
                                </div>

                                <div className="flex items-center gap-4 pt-3 border-t border-neutral-100 dark:border-neutral-800">
                                    <span className="flex items-center gap-1.5 text-xs text-neutral-500 dark:text-neutral-400">
                                        <Eye size={14} />
                                        {post.views}
                                    </span>
                                    <span className="flex items-center gap-1.5 text-xs text-neutral-500 dark:text-neutral-400">
                                        <MessageCircle size={14} />
                                        {post.comment_count}
                                    </span>
                                    {post.comment_count > 0 && (
                                      <span className="flex items-center gap-1.5 text-xs text-blue-500 dark:text-blue-400">
                                        <Bot size={14} />
                                        AI 분석
                                      </span>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                </motion.div>
              </AnimatePresence>
            )}
        </div>

        <div className="space-y-6 hidden lg:block">
            <div className="bg-white dark:bg-neutral-900 p-6 rounded-2xl shadow-sm border border-neutral-100 dark:border-neutral-800">
                <h3 className="font-bold text-neutral-900 dark:text-neutral-100 mb-4 flex items-center gap-2">
                    <Flame size={18} className="text-rose-500" />
                    카테고리별 게시글
                </h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-neutral-600 dark:text-neutral-400">💡 정보</span>
                    <span className="font-bold text-blue-600">{posts.filter(p => p.category === '정보').length}개</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-neutral-600 dark:text-neutral-400">❓ 질문</span>
                    <span className="font-bold text-amber-600">{posts.filter(p => p.category === '질문').length}개</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-neutral-600 dark:text-neutral-400">💬 일반</span>
                    <span className="font-bold text-neutral-600">{posts.filter(p => p.category === '일반').length}개</span>
                  </div>
                </div>
            </div>

            <div className="bg-gradient-to-br from-blue-600 to-purple-600 p-6 rounded-2xl shadow-lg text-white mb-6">
                 <div className="flex items-center gap-2 mb-3">
                   <Bot size={24} />
                   <h3 className="font-bold">SecureAI 봇</h3>
                 </div>
                 <p className="text-sm text-blue-100 mb-4">
                   모든 게시글에 AI가 자동으로 보안 분석을 제공합니다.
                 </p>
                 <div className="bg-white/20 backdrop-blur-sm rounded-lg p-3 text-xs">
                   <p className="font-bold mb-1">오늘의 분석</p>
                   <p className="text-blue-100">위험 게시글 {posts.length}건 분석 완료</p>
                 </div>
            </div>

            <button
              onClick={() => { setHelpStep(0); setShowHelpModal(true); }}
              className="w-full bg-white dark:bg-neutral-900 border-2 border-blue-600 text-blue-600 dark:text-blue-400 p-4 rounded-2xl font-semibold hover:bg-blue-50 dark:hover:bg-neutral-800 transition-colors flex items-center justify-center gap-2"
            >
              <HelpCircle size={20} />
              도움말 보기
            </button>
        </div>
      </div>

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

export default Community;
