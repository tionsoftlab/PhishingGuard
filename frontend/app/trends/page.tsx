"use client";

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Flame, Newspaper, ArrowUpRight, ShieldAlert, BadgeCheck, TrendingUp, MessageCircle, Eye, HelpCircle, X, BookOpen, Check, ArrowRight } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { HELP_CONTENTS } from '@/lib/helpContents';

interface ExpertNews {
  id: number;
  title: string;
  summary: string;
  author: string;
  affiliation: string;
  date: string;
  tag: string;
  image: string;
  views: number;
}

interface PopularPost {
  id: number;
  title: string;
  views: number;
  comments: number;
  author: string;
  rank: number;
}

const Trends: React.FC = () => {
  const router = useRouter();
  const [expertNews, setExpertNews] = useState<ExpertNews[]>([]);
  const [popularPosts, setPopularPosts] = useState<PopularPost[]>([]);
  const [loadingNews, setLoadingNews] = useState(true);
  const [loadingPosts, setLoadingPosts] = useState(true);
  const [showHelpModal, setShowHelpModal] = useState(false);
  const [helpStep, setHelpStep] = useState(0);

  useEffect(() => {
    fetch('/api/news')
      .then(res => res.json())
      .then(data => {
        setExpertNews(data);
        setLoadingNews(false);
      })
      .catch(err => {
        console.error('전문가 뉴스 로드 실패:', err);
        setLoadingNews(false);
      });

    fetch('/api/posts/popular')
      .then(res => res.json())
      .then(data => {
        setPopularPosts(data);
        setLoadingPosts(false);
      })
      .catch(err => {
        console.error('인기 게시글 로드 실패:', err);
        setLoadingPosts(false);
      });
  }, []);
  return (
    <div className="max-w-4xl mx-auto pb-20 md:pb-20 p-4 md:p-8">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-neutral-900 dark:text-neutral-100 flex items-center gap-2">
            <TrendingUp className="text-rose-500" />
            보안 트렌드 & 뉴스
        </h2>
        <p className="text-neutral-500 dark:text-neutral-400 text-sm mt-1">전문가 분석 리포트와 실시간 인기 이슈를 확인하세요.</p>
      </div>

      <div className="mb-10">
        <div className="flex items-center justify-between mb-4 px-1">
            <h3 className="font-bold text-neutral-900 dark:text-neutral-100 text-lg flex items-center gap-2">
                <Newspaper size={20} className="text-blue-600 dark:text-blue-400" />
                전문가 보안 뉴스
            </h3>
            <button onClick={() => router.push('/expert-news')} className="text-xs text-neutral-500 dark:text-neutral-400 hover:text-blue-600 dark:hover:text-blue-400 font-medium">전체보기</button>
        </div>
        
        {loadingNews ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        ) : expertNews.length === 0 ? (
          <div className="text-center py-10 text-neutral-500 dark:text-neutral-400">
            등록된 전문가 뉴스가 없습니다.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {expertNews.map((news, idx) => (
                  <motion.div
                      key={news.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.1 }}
                      onClick={() => router.push(`/experts/${news.id}`)}
                      className="group cursor-pointer"
                  >
                      <div className={`h-40 rounded-t-2xl p-6 relative overflow-hidden ${news.image}`}>
                          <div className="absolute top-4 left-4 bg-white/20 backdrop-blur-md px-2 py-1 rounded text-[10px] font-bold text-white border border-white/10">
                              {news.tag}
                          </div>
                          <ShieldAlert className="absolute bottom-4 right-4 text-white/10 group-hover:scale-110 transition-transform duration-500" size={80} />
                      </div>
                      <div className="bg-white dark:bg-neutral-900 border border-gray-100 dark:border-neutral-800 border-t-0 rounded-b-2xl p-5 shadow-sm group-hover:shadow-md transition-all">
                          <h4 className="font-bold text-neutral-900 dark:text-neutral-100 text-lg leading-snug mb-2 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                              {news.title}
                          </h4>
                          <p className="text-sm text-neutral-500 dark:text-neutral-400 line-clamp-2 mb-4 leading-relaxed">
                              {news.summary}
                          </p>
                          <div className="flex items-center justify-between border-t border-gray-50 dark:border-neutral-800 pt-4">
                              <div className="flex items-center gap-2">
                                  <BadgeCheck size={16} className="text-blue-500" />
                                  <span className="text-xs font-bold text-neutral-700 dark:text-neutral-300">{news.author}</span>
                                  {news.affiliation && (
                                    <span className="text-xs text-neutral-400 dark:text-neutral-500">| {news.affiliation}</span>
                                  )}
                              </div>
                              <span className="text-xs text-neutral-400 dark:text-neutral-500">{news.date}</span>
                          </div>
                      </div>
                  </motion.div>
              ))}
          </div>
        )}
      </div>

      <div>
        <div className="flex items-center justify-between mb-4 px-1">
            <h3 className="font-bold text-neutral-900 dark:text-neutral-100 text-lg flex items-center gap-2">
                <Flame size={20} className="text-rose-500" />
                실시간 인기글
            </h3>
            <span className="text-xs text-rose-500 font-bold bg-rose-50 dark:bg-rose-900/30 px-2 py-1 rounded-full animate-pulse">
                LIVE
            </span>
        </div>

        {loadingPosts ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-rose-600"></div>
          </div>
        ) : popularPosts.length === 0 ? (
          <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-gray-100 dark:border-neutral-800 shadow-sm p-10 text-center text-neutral-500 dark:text-neutral-400">
            등록된 게시글이 없습니다.
          </div>
        ) : (
          <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-gray-100 dark:border-neutral-800 shadow-sm overflow-hidden">
              {popularPosts.map((post, idx) => (
                  <motion.div 
                      key={post.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      onClick={() => router.push(`/community/${post.id}`)}
                      transition={{ delay: 0.2 + (idx * 0.1) }}
                      className="flex items-center gap-4 p-4 border-b border-gray-50 dark:border-neutral-800 hover:bg-gray-50 dark:hover:bg-neutral-800 transition-colors cursor-pointer group"
                  >
                      <div className={`w-8 text-center font-bold text-lg italic ${idx < 3 ? 'text-rose-500' : 'text-neutral-400 dark:text-neutral-600'}`}>
                          {post.rank}
                      </div>
                      <div className="flex-1 min-w-0">
                          <p className="font-medium text-neutral-900 dark:text-neutral-100 truncate group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                              {post.title}
                          </p>
                          <div className="flex items-center gap-3 mt-1">
                              <span className="text-xs text-neutral-500 dark:text-neutral-400">{post.author}</span>
                              <span className="flex items-center gap-1 text-xs text-neutral-400 dark:text-neutral-500">
                                  <Eye size={12} /> {post.views.toLocaleString()}
                              </span>
                          </div>
                      </div>
                      <div className="flex items-center gap-1 text-neutral-400 dark:text-neutral-500 bg-gray-100 dark:bg-neutral-800 px-2 py-1 rounded-lg">
                          <MessageCircle size={14} />
                          <span className="text-xs font-bold">{post.comments}</span>
                      </div>
                  </motion.div>
              ))}
              <div className="p-3 text-center border-t border-gray-50 dark:border-neutral-800">
                  <button 
                      onClick={() => router.push('/')}
                      className="text-sm font-medium text-neutral-500 dark:text-neutral-400 hover:text-neutral-800 dark:hover:text-neutral-200 flex items-center justify-center gap-1 w-full"
                  >
                      더보기 <ArrowUpRight size={14} />
                  </button>
              </div>
          </div>
        )}
      </div>

      <button
        onClick={() => { setHelpStep(0); setShowHelpModal(true); }}
        className="w-full bg-white dark:bg-neutral-900 border-2 border-blue-600 text-blue-600 dark:text-blue-400 p-4 rounded-2xl font-semibold hover:bg-blue-50 dark:hover:bg-neutral-800 transition-colors flex items-center justify-center gap-2 mt-6"
      >
        <HelpCircle size={20} />
        도움말 보기
      </button>

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

export default Trends;
