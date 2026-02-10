"use client";

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { motion } from 'framer-motion';
import { ArrowLeft, Send, ShieldAlert } from 'lucide-react';

const bgColorOptions = [
  { label: '블루', value: 'bg-gradient-to-br from-blue-900 to-indigo-900' },
  { label: '퍼플', value: 'bg-gradient-to-br from-purple-900 to-indigo-900' },
  { label: '레드', value: 'bg-gradient-to-br from-rose-900 to-red-900' },
  { label: '그린', value: 'bg-gradient-to-br from-emerald-900 to-teal-900' },
  { label: '오렌지', value: 'bg-gradient-to-br from-orange-900 to-amber-900' },
  { label: '다크', value: 'bg-gradient-to-br from-gray-900 to-neutral-900' },
];

const ExpertNewsEdit: React.FC = () => {
  const params = useParams();
  const router = useRouter();
  const { data: session, status } = useSession();
  const [title, setTitle] = useState('');
  const [summary, setSummary] = useState('');
  const [content, setContent] = useState('');
  const [tag, setTag] = useState('보안 뉴스');
  const [bgColor, setBgColor] = useState(bgColorOptions[0].value);
  const [affiliation, setAffiliation] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (params.id) {
      fetch(`/api/news/${params.id}`)
        .then(res => {
          if (!res.ok) throw new Error('뉴스를 찾을 수 없습니다');
          return res.json();
        })
        .then(data => {
          setTitle(data.title || '');
          setSummary(data.summary || '');
          setContent(data.content || '');
          setTag(data.tag || '보안 뉴스');
          setBgColor(data.bg_color || bgColorOptions[0].value);
          setAffiliation(data.affiliation || '');
          setLoading(false);
        })
        .catch(() => {
          setNotFound(true);
          setLoading(false);
        });
    }
  }, [params.id]);

  if (status === 'loading' || loading) {
    return (
      <div className="max-w-4xl mx-auto pb-20 md:pb-20 p-4 md:p-8">
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  if (status === 'unauthenticated') {
    router.push('/auth/signin');
    return null;
  }

  if (!session?.user?.is_expert) {
    return (
      <div className="max-w-4xl mx-auto pb-20 md:pb-20 p-4 md:p-8">
        <div className="text-center py-20">
          <ShieldAlert size={48} className="mx-auto mb-4 text-neutral-300 dark:text-neutral-600" />
          <p className="text-neutral-500 dark:text-neutral-400 mb-2 font-medium">전문가만 뉴스를 수정할 수 있습니다.</p>
          <button onClick={() => router.back()} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">돌아가기</button>
        </div>
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="max-w-4xl mx-auto pb-20 md:pb-20 p-4 md:p-8">
        <div className="text-center py-20">
          <p className="text-neutral-500 dark:text-neutral-400 mb-4">뉴스를 찾을 수 없습니다.</p>
          <button onClick={() => router.back()} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">돌아가기</button>
        </div>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim() || !summary.trim() || !content.trim()) {
      alert('제목, 요약, 내용을 모두 입력해주세요.');
      return;
    }

    setSubmitting(true);

    try {
      const response = await fetch(`/api/news/${params.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          summary,
          content,
          tag,
          bg_color: bgColor,
          affiliation: affiliation || null,
          userEmail: session.user.email,
        }),
      });

      if (response.ok) {
        router.push(`/experts/${params.id}`);
      } else {
        const err = await response.json();
        alert(err.error || '뉴스 수정에 실패했습니다.');
      }
    } catch (error) {
      console.error('뉴스 수정 오류:', error);
      alert('뉴스 수정 중 오류가 발생했습니다.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto pb-20 md:pb-20 p-4 md:p-8">
      <button
        onClick={() => router.back()}
        className="flex items-center gap-2 text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100 mb-6 transition-colors"
      >
        <ArrowLeft size={20} />
        <span>돌아가기</span>
      </button>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white dark:bg-neutral-900 rounded-2xl p-6 md:p-8 shadow-sm border border-gray-100 dark:border-neutral-800"
      >
        <h1 className="text-2xl font-bold text-neutral-900 dark:text-white mb-6 flex items-center gap-2">
          <ShieldAlert className="text-blue-600" size={24} />
          전문가 뉴스 수정
        </h1>

        <div className={`h-32 rounded-2xl p-5 relative overflow-hidden mb-6 ${bgColor}`}>
          <div className="absolute top-3 left-3 bg-white/20 backdrop-blur-md px-2 py-0.5 rounded text-[10px] font-bold text-white border border-white/10">
            {tag}
          </div>
          <ShieldAlert className="absolute bottom-3 right-3 text-white/10" size={64} />
          <div className="relative z-10 h-full flex items-end">
            <h2 className="text-lg font-bold text-white leading-snug line-clamp-2">
              {title || '제목 미리보기'}
            </h2>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">태그</label>
              <select
                value={tag}
                onChange={(e) => setTag(e.target.value)}
                className="w-full px-4 py-2 border border-neutral-200 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="긴급 리포트">긴급 리포트</option>
                <option value="보안 뉴스">보안 뉴스</option>
                <option value="업데이트">업데이트</option>
                <option value="분석">분석</option>
                <option value="가이드">가이드</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">소속 (선택)</label>
              <input
                type="text"
                value={affiliation}
                onChange={(e) => setAffiliation(e.target.value)}
                placeholder="예: 한국인터넷진흥원"
                className="w-full px-4 py-2 border border-neutral-200 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">배경 색상</label>
            <div className="flex gap-2 flex-wrap">
              {bgColorOptions.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setBgColor(option.value)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    bgColor === option.value
                      ? 'ring-2 ring-blue-500 ring-offset-2 dark:ring-offset-neutral-900'
                      : ''
                  }`}
                >
                  <div className={`w-16 h-6 rounded ${option.value}`} />
                  <span className="text-neutral-600 dark:text-neutral-400 mt-1 block">{option.label}</span>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">제목</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="뉴스 제목을 입력하세요"
              maxLength={200}
              className="w-full px-4 py-2 border border-neutral-200 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">{title.length}/200</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">요약</label>
            <textarea
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              placeholder="뉴스 목록에 표시될 간략한 요약을 작성하세요."
              rows={3}
              maxLength={500}
              className="w-full px-4 py-3 border border-neutral-200 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
            <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">{summary.length}/500</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">내용</label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="보안 뉴스 본문을 작성하세요."
              rows={18}
              className="w-full px-4 py-3 border border-neutral-200 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
            <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">{content.length}자</p>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={() => router.back()}
              className="flex-1 px-6 py-3 border border-neutral-200 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300 rounded-lg hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors"
            >
              취소
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {submitting ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  <span>수정 중...</span>
                </>
              ) : (
                <>
                  <Send size={18} />
                  <span>수정하기</span>
                </>
              )}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
};

export default ExpertNewsEdit;
