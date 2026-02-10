"use client";

import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Newspaper, ArrowLeft, ShieldAlert, BadgeCheck, Eye, PenSquare, Search } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';

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

const tagColors: Record<string, string> = {
  '긴급 리포트': 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400',
  '보안 뉴스': 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  '업데이트': 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  '분석': 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  '가이드': 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
};

const ExpertNewsList: React.FC = () => {
  const router = useRouter();
  const { data: session } = useSession();
  const [news, setNews] = useState<ExpertNews[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTag, setSelectedTag] = useState<string>('전체');
  const [searchQuery, setSearchQuery] = useState('');

  const tags = ['전체', '긴급 리포트', '보안 뉴스', '업데이트', '분석', '가이드'];

  useEffect(() => {
    fetch('/api/news?limit=100')
      .then(res => res.json())
      .then(data => {
        setNews(data);
        setLoading(false);
      })
      .catch(err => {
        console.error('전문가 뉴스 로드 실패:', err);
        setLoading(false);
      });
  }, []);

  const filteredNews = news.filter(item => {
    const tagMatch = selectedTag === '전체' || item.tag === selectedTag;
    const searchMatch = searchQuery === '' || 
      item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.summary.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.author.toLowerCase().includes(searchQuery.toLowerCase());
    return tagMatch && searchMatch;
  });

  return (
    <div className="max-w-4xl mx-auto pb-20 md:pb-20 p-4 md:p-8">
      <button
        onClick={() => router.back()}
        className="flex items-center gap-2 text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100 mb-6 transition-colors"
      >
        <ArrowLeft size={20} />
        <span>돌아가기</span>
      </button>

      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-neutral-900 dark:text-neutral-100 flex items-center gap-2">
            <Newspaper className="text-blue-600 dark:text-blue-400" />
            전문가 보안 뉴스
          </h2>
          <p className="text-neutral-500 dark:text-neutral-400 text-sm mt-1">
            보안 전문가들이 작성한 최신 보안 리포트와 분석을 확인하세요.
          </p>
        </div>
        {session?.user?.is_expert && (
          <button
            onClick={() => router.push('/expert-news/write')}
            className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors font-medium text-sm"
          >
            <PenSquare size={16} />
            새 글 작성
          </button>
        )}
      </div>

      <div className="relative mb-4">
        <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="제목, 내용, 작성자로 검색..."
          className="w-full pl-11 pr-4 py-3 bg-white dark:bg-neutral-900 border border-gray-200 dark:border-neutral-800 rounded-xl text-neutral-900 dark:text-white placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
        />
      </div>

      <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
        {tags.map(tag => (
          <button
            key={tag}
            onClick={() => setSelectedTag(tag)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
              selectedTag === tag
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 hover:bg-gray-200 dark:hover:bg-neutral-700'
            }`}
          >
            {tag}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      ) : filteredNews.length === 0 ? (
        <div className="text-center py-16 bg-white dark:bg-neutral-900 rounded-2xl border border-gray-100 dark:border-neutral-800">
          <Newspaper size={48} className="mx-auto mb-4 text-neutral-300 dark:text-neutral-600" />
          <p className="text-neutral-500 dark:text-neutral-400">
            {searchQuery || selectedTag !== '전체' ? '검색 결과가 없습니다.' : '등록된 전문가 뉴스가 없습니다.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredNews.map((item, idx) => (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05 }}
              onClick={() => router.push(`/experts/${item.id}`)}
              className="group cursor-pointer"
            >
              <div className={`h-36 rounded-t-2xl p-5 relative overflow-hidden ${item.image}`}>
                <div className={`absolute top-3 left-3 px-2 py-0.5 rounded text-[10px] font-bold border border-white/10 ${
                  tagColors[item.tag] || 'bg-white/20 backdrop-blur-md text-white'
                }`}>
                  {item.tag}
                </div>
                <ShieldAlert className="absolute bottom-3 right-3 text-white/10 group-hover:scale-110 transition-transform duration-500" size={64} />
              </div>
              <div className="bg-white dark:bg-neutral-900 border border-gray-100 dark:border-neutral-800 border-t-0 rounded-b-2xl p-4 shadow-sm group-hover:shadow-md transition-all">
                <h4 className="font-bold text-neutral-900 dark:text-neutral-100 text-base leading-snug mb-2 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors line-clamp-2">
                  {item.title}
                </h4>
                <p className="text-sm text-neutral-500 dark:text-neutral-400 line-clamp-2 mb-3 leading-relaxed">
                  {item.summary}
                </p>
                <div className="flex items-center justify-between border-t border-gray-50 dark:border-neutral-800 pt-3">
                  <div className="flex items-center gap-2">
                    <BadgeCheck size={14} className="text-blue-500" />
                    <span className="text-xs font-bold text-neutral-700 dark:text-neutral-300">{item.author}</span>
                    {item.affiliation && (
                      <span className="text-xs text-neutral-400 dark:text-neutral-500">| {item.affiliation}</span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 text-xs text-neutral-400 dark:text-neutral-500">
                    <span className="flex items-center gap-1">
                      <Eye size={12} /> {item.views}
                    </span>
                    <span>{item.date}</span>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ExpertNewsList;
