"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Send, Shield, Search, Smartphone, MessageSquare, Mic, Mail, X } from 'lucide-react';

interface ScanHistory {
  id: number;
  scan_type: string;
  scan_target: string;
  result: string;
  risk_score: number;
  created_at: string;
  easy_summary?: string;
  expert_summary?: string;
}

const CommunityWrite: React.FC = () => {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('일반');
  const [content, setContent] = useState('');
  const [submitting, setSubmitting] = useState(false);
  
  const [showScanModal, setShowScanModal] = useState(false);
  const [scans, setScans] = useState<ScanHistory[]>([]);
  const [loadingScans, setLoadingScans] = useState(false);
  const [selectedScan, setSelectedScan] = useState<ScanHistory | null>(null);

  useEffect(() => {
    if (showScanModal && session?.user?.email) {
      fetchScans();
    }
  }, [showScanModal, session]);

  const fetchScans = async () => {
    setLoadingScans(true);
    try {
      const res = await fetch(`/api/user/scans?email=${session?.user?.email}`);
      if (res.ok) {
        const data = await res.json();
        setScans(data);
      }
    } catch (error) {
      console.error('Failed to load scans:', error);
    } finally {
      setLoadingScans(false);
    }
  };

  if (status === 'loading') {
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!title.trim() || !content.trim()) {
      alert('제목과 내용을 입력해주세요.');
      return;
    }

    setSubmitting(true);

    try {
      const response = await fetch('/api/community/posts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title,
          category,
          content,
          userEmail: session?.user?.email,
          scanResultId: selectedScan?.id
        }),
      });

      if (response.ok) {
        const data = await response.json();
        router.push(`/community/${data.postId}`);
      } else {
        alert('게시글 작성에 실패했습니다.');
      }
    } catch (error) {
      console.error('게시글 작성 오류:', error);
      alert('게시글 작성 중 오류가 발생했습니다.');
    } finally {
      setSubmitting(false);
    }
  };

  const getIconForType = (type: string) => {
    switch (type) {
      case 'url': return <Search size={16} />;
      case 'qr': return <Smartphone size={16} />;
      case 'sms': return <MessageSquare size={16} />;
      case 'voice': return <Mic size={16} />;
      case 'email': return <Mail size={16} />;
      default: return <Shield size={16} />;
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
        <h1 className="text-2xl font-bold text-neutral-900 dark:text-white mb-6">
          글쓰기
        </h1>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
              카테고리
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full px-4 py-2 border border-neutral-200 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="정보">정보</option>
              <option value="질문">질문</option>
              <option value="일반">일반</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
              제목
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="제목을 입력하세요"
              maxLength={100}
              className="w-full px-4 py-2 border border-neutral-200 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
              {title.length}/100
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
              검사 결과 첨부 (선택)
            </label>
            
            {selectedScan ? (
              <div className="relative p-4 border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20 rounded-xl flex items-start gap-4">
                <div className={`p-2 rounded-lg ${
                  selectedScan.result === 'safe' ? 'bg-emerald-100 text-emerald-600' :
                  selectedScan.result === 'danger' ? 'bg-rose-100 text-rose-600' :
                  'bg-amber-100 text-amber-600'
                }`}>
                  {getIconForType(selectedScan.scan_type)}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-bold text-sm text-neutral-900 dark:text-white uppercase">{selectedScan.scan_type} Scan</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      selectedScan.result === 'safe' ? 'bg-emerald-100 text-emerald-600' :
                      selectedScan.result === 'danger' ? 'bg-rose-100 text-rose-600' :
                      'bg-amber-100 text-amber-600'
                    }`}>
                      {selectedScan.result.toUpperCase()}
                    </span>
                  </div>
                  <p className="text-sm text-neutral-600 dark:text-neutral-300 line-clamp-1 mb-1">{selectedScan.scan_target}</p>
                  <p className="text-xs text-neutral-500">{new Date(selectedScan.created_at).toLocaleString()}</p>
                </div>
                <button 
                  type="button"
                  onClick={() => setSelectedScan(null)}
                  className="p-1 text-neutral-400 hover:text-rose-500 transition-colors"
                >
                  <X size={18} />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setShowScanModal(true)}
                className="w-full py-3 border-2 border-dashed border-gray-200 dark:border-neutral-700 rounded-xl text-neutral-500 dark:text-neutral-400 hover:border-blue-500 hover:text-blue-500 dark:hover:border-blue-500 transition-colors flex items-center justify-center gap-2"
              >
                <Shield size={18} />
                <span>검사 기록 불러오기</span>
              </button>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
              내용
            </label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="의심되는 URL, 문자 내용, 경험담 등을 자유롭게 공유해주세요."
              rows={15}
              className="w-full px-4 py-3 border border-neutral-200 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
            <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
              {content.length}자
            </p>
          </div>

          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
            <p className="text-sm text-blue-900 dark:text-blue-100">
              💡 게시글 작성 10분 후 AI 전문가가 자동으로 정밀 분석 댓글을 달아드립니다.
            </p>
          </div>

          <div className="flex gap-3">
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
                  <span>작성 중...</span>
                </>
              ) : (
                <>
                  <Send size={18} />
                  <span>작성하기</span>
                </>
              )}
            </button>
          </div>
        </form>
      </motion.div>

      <AnimatePresence>
        {showScanModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-neutral-900 rounded-2xl w-full max-w-lg max-h-[80vh] overflow-hidden flex flex-col shadow-xl"
            >
              <div className="p-4 border-b border-gray-100 dark:border-neutral-800 flex items-center justify-between">
                <h3 className="font-bold text-lg text-neutral-900 dark:text-white">검사 기록 선택</h3>
                <button onClick={() => setShowScanModal(false)} className="p-2 hover:bg-gray-100 dark:hover:bg-neutral-800 rounded-lg">
                  <X size={20} className="text-neutral-500" />
                </button>
              </div>
              
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {loadingScans ? (
                  <div className="flex justify-center py-10">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                  </div>
                ) : scans.length > 0 ? (
                  scans.map((scan) => (
                    <button
                      key={scan.id}
                      onClick={() => {
                        setSelectedScan(scan);
                        setShowScanModal(false);
                      }}
                      className="w-full text-left p-4 rounded-xl border border-gray-200 dark:border-neutral-800 hover:border-blue-500 dark:hover:border-blue-500 bg-gray-50 dark:bg-neutral-800/50 transition-all group"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <div className={`p-1.5 rounded-lg ${
                            scan.result === 'safe' ? 'bg-emerald-100 text-emerald-600' :
                            scan.result === 'danger' ? 'bg-rose-100 text-rose-600' :
                            'bg-amber-100 text-amber-600'
                          }`}>
                            {getIconForType(scan.scan_type)}
                          </div>
                          <span className="font-bold text-sm text-neutral-900 dark:text-white uppercase">{scan.scan_type}</span>
                        </div>
                        <span className="text-xs text-neutral-500">{new Date(scan.created_at).toLocaleDateString()}</span>
                      </div>
                      <p className="text-sm text-neutral-600 dark:text-neutral-300 line-clamp-1 mb-1 font-medium">{scan.scan_target}</p>
                      <p className="text-xs text-neutral-500 line-clamp-2">{scan.easy_summary || scan.expert_summary || '분석 결과 없음'}</p>
                    </button>
                  ))
                ) : (
                  <div className="text-center py-10 text-neutral-500">
                    <Shield size={48} className="mx-auto mb-4 opacity-20" />
                    <p>최근 검사 기록이 없습니다.</p>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default CommunityWrite;
