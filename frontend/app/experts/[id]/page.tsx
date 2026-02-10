"use client";

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { motion } from 'framer-motion';
import { ArrowLeft, Eye, BadgeCheck, Clock, ShieldAlert, Send, MoreVertical, Edit2, Trash2, X, Check } from 'lucide-react';

interface NewsItem {
  id: number;
  title: string;
  summary: string;
  content: string;
  views: number;
  created_at: string;
  updated_at: string;
  author: string;
  author_email?: string;
  is_expert: boolean;
  profile_image_url?: string;
  tag: string;
  bg_color: string;
  affiliation?: string;
  comments?: Comment[];
  comment_count: number;
}

interface Comment {
  id: number;
  content: string;
  created_at: string;
  author: string;
  author_email?: string;
  is_expert: boolean;
  profile_image_url?: string;
}

const ExpertNewsDetail: React.FC = () => {
  const params = useParams();
  const router = useRouter();
  const { data: session } = useSession();
  const [news, setNews] = useState<NewsItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [viewIncremented, setViewIncremented] = useState(false);
  const [commentContent, setCommentContent] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);
  const [editingCommentId, setEditingCommentId] = useState<number | null>(null);
  const [editingContent, setEditingContent] = useState('');
  const [commentMenuId, setCommentMenuId] = useState<number | null>(null);

  const fetchNews = () => {
    fetch(`/api/news/${params.id}`)
      .then(res => {
        if (!res.ok) throw new Error('뉴스를 찾을 수 없습니다');
        return res.json();
      })
      .then(data => {
        setNews(data);
        setLoading(false);
      })
      .catch(err => {
        console.error('뉴스 로드 실패:', err);
        setLoading(false);
      });
  };

  useEffect(() => {
    if (params.id && !viewIncremented) {
      setViewIncremented(true);
      fetchNews();
    }
  }, [params.id, viewIncremented]);

  const handleCommentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentContent.trim() || !session?.user?.email) return;
    setSubmittingComment(true);
    try {
      const res = await fetch('/api/news/comments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          newsId: params.id,
          content: commentContent,
          userEmail: session.user.email
        })
      });
      if (res.ok) {
        setCommentContent('');
        fetchNews();
      } else {
        alert('댓글 등록 실패');
      }
    } catch (err) {
      console.error('댓글 등록 오류:', err);
    } finally {
      setSubmittingComment(false);
    }
  };

  const handleCommentEdit = async (commentId: number) => {
    if (!editingContent.trim() || !session?.user?.email) return;
    try {
      const res = await fetch(`/api/news/comments/${commentId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: editingContent,
          userEmail: session.user.email
        })
      });
      if (res.ok) {
        setEditingCommentId(null);
        setEditingContent('');
        fetchNews();
      } else {
        const data = await res.json();
        alert(data.error || '댓글 수정 실패');
      }
    } catch (err) {
      console.error('댓글 수정 오류:', err);
      alert('댓글 수정 중 오류가 발생했습니다.');
    }
  };

  const handleCommentDelete = async (commentId: number) => {
    if (!confirm('댓글을 삭제하시겠습니까?')) return;
    try {
      const res = await fetch(`/api/news/comments/${commentId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userEmail: session?.user?.email })
      });
      if (res.ok) {
        fetchNews();
      } else {
        const data = await res.json();
        alert(data.error || '댓글 삭제 실패');
      }
    } catch (err) {
      console.error('댓글 삭제 오류:', err);
      alert('댓글 삭제 중 오류가 발생했습니다.');
    }
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto pb-20 md:pb-20 p-4 md:p-8">
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  if (!news) {
    return (
      <div className="max-w-4xl mx-auto pb-20 md:pb-20 p-4 md:p-8">
        <div className="text-center py-20">
          <p className="text-neutral-500 dark:text-neutral-400 mb-4">뉴스를 찾을 수 없습니다.</p>
          <button
            onClick={() => router.back()}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            돌아가기
          </button>
        </div>
      </div>
    );
  }

  const isAuthor = session?.user?.email === news.author_email;

  return (
    <div className="max-w-4xl mx-auto pb-20 md:pb-20 p-4 md:p-8">
      <div className="flex items-center justify-between mb-6">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100 transition-colors"
        >
          <ArrowLeft size={20} />
          <span>돌아가기</span>
        </button>

        {isAuthor && (
          <button
            onClick={() => router.push(`/expert-news/edit/${news.id}`)}
            className="flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-neutral-600 dark:text-neutral-400 hover:text-blue-600 dark:hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
          >
            <Edit2 size={16} />
            수정
          </button>
        )}
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white dark:bg-neutral-900 rounded-2xl shadow-sm border border-gray-100 dark:border-neutral-800 overflow-hidden"
      >
        <div className={`h-48 ${news.bg_color} relative overflow-hidden p-8`}>
          <div className="absolute top-4 left-4 bg-white/20 backdrop-blur-md px-3 py-1 rounded text-xs font-bold text-white border border-white/10">
            {news.tag}
          </div>
          <ShieldAlert className="absolute bottom-4 right-4 text-white/10" size={120} />
          <div className="relative z-10 h-full flex items-end">
            <h1 className="text-2xl md:text-3xl font-bold text-white leading-tight">
              {news.title}
            </h1>
          </div>
        </div>

        <div className="p-6 md:p-8 border-b border-gray-100 dark:border-neutral-800">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold text-lg">
                {news.author.charAt(0)}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-neutral-900 dark:text-white">
                    {news.author}
                  </span>
                  <BadgeCheck size={18} className="text-blue-500" />
                </div>
                {news.affiliation && (
                  <span className="text-sm text-neutral-500 dark:text-neutral-400">
                    {news.affiliation}
                  </span>
                )}
              </div>
            </div>

            <div className="flex items-center gap-4 text-sm text-neutral-500 dark:text-neutral-400">
              <span className="flex items-center gap-1">
                <Eye size={16} />
                {news.views.toLocaleString()}
              </span>
              <span className="flex items-center gap-1">
                <Clock size={16} />
                {new Date(news.created_at).toLocaleDateString('ko-KR')}
              </span>
            </div>
          </div>
        </div>

        <div className="p-6 md:p-8">
          <div className="prose dark:prose-invert max-w-none">
            <div className="text-neutral-700 dark:text-neutral-300 leading-relaxed whitespace-pre-wrap">
              {news.content}
            </div>
          </div>

          <div className="mt-8 p-6 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-100 dark:border-blue-800">
            <h3 className="font-bold text-neutral-900 dark:text-white mb-2 flex items-center gap-2">
              <ShieldAlert size={20} className="text-blue-600" />
              전문가 분석
            </h3>
            <p className="text-sm text-neutral-600 dark:text-neutral-400">
              이 리포트는 보안 전문가의 검증을 거쳐 작성되었습니다.
            </p>
          </div>
        </div>

        <div className="p-6 md:p-8 pt-0">
          <div className="border-t border-gray-100 dark:border-neutral-800 pt-8">
            <h3 className="font-bold text-lg mb-4 text-neutral-900 dark:text-white">
              댓글 {news.comment_count}개
            </h3>

            {session ? (
              <form onSubmit={handleCommentSubmit} className="mb-8">
                <div className="relative">
                  <textarea
                    value={commentContent}
                    onChange={(e) => setCommentContent(e.target.value)}
                    placeholder="댓글을 작성해주세요..."
                    className="w-full p-4 pr-12 rounded-xl border border-gray-200 dark:border-neutral-800 bg-gray-50 dark:bg-neutral-800/50 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none text-neutral-900 dark:text-white"
                    rows={3}
                    disabled={submittingComment}
                  />
                  <button
                    type="submit"
                    disabled={!commentContent.trim() || submittingComment}
                    className="absolute bottom-3 right-3 p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <Send size={16} />
                  </button>
                </div>
              </form>
            ) : (
              <div className="mb-8 p-4 bg-gray-50 dark:bg-neutral-800 rounded-xl text-center text-sm text-neutral-500">
                댓글을 작성하려면 <button onClick={() => router.push('/auth/signin')} className="text-blue-600 hover:underline">로그인</button>이 필요합니다.
              </div>
            )}

            {news.comments && news.comments.length > 0 ? (
              <div className="space-y-4">
                {news.comments.map((comment) => {
                  const isCommentAuthor = session?.user?.email === comment.author_email;
                  return (
                  <div
                    key={comment.id}
                    className="bg-gray-50 dark:bg-neutral-800 rounded-xl p-4"
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                        {comment.author.charAt(0)}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium text-sm text-neutral-900 dark:text-white">
                            {comment.author}
                          </span>
                          {comment.is_expert && (
                            <BadgeCheck size={14} className="text-blue-500" />
                          )}
                          <span className="text-xs text-neutral-400 dark:text-neutral-500">
                            {new Date(comment.created_at).toLocaleString('ko-KR', {
                              month: 'numeric',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </span>
                          <div className="flex-1" />
                          {isCommentAuthor && (
                            <div className="relative">
                              <button
                                onClick={() => setCommentMenuId(commentMenuId === comment.id ? null : comment.id)}
                                className="p-1 rounded-lg hover:bg-gray-200 dark:hover:bg-neutral-700 transition-colors"
                              >
                                <MoreVertical size={14} className="text-neutral-400" />
                              </button>
                              {commentMenuId === comment.id && (
                                <div className="absolute right-0 top-8 z-10 bg-white dark:bg-neutral-800 border border-gray-200 dark:border-neutral-700 rounded-lg shadow-lg py-1 min-w-[100px]">
                                  <button
                                    onClick={() => {
                                      setEditingCommentId(comment.id);
                                      setEditingContent(comment.content);
                                      setCommentMenuId(null);
                                    }}
                                    className="w-full px-3 py-2 text-left text-sm text-neutral-700 dark:text-neutral-300 hover:bg-gray-100 dark:hover:bg-neutral-700 flex items-center gap-2"
                                  >
                                    <Edit2 size={13} /> 수정
                                  </button>
                                  <button
                                    onClick={() => {
                                      setCommentMenuId(null);
                                      handleCommentDelete(comment.id);
                                    }}
                                    className="w-full px-3 py-2 text-left text-sm text-rose-600 hover:bg-gray-100 dark:hover:bg-neutral-700 flex items-center gap-2"
                                  >
                                    <Trash2 size={13} /> 삭제
                                  </button>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                        {editingCommentId === comment.id ? (
                          <div className="mt-1">
                            <textarea
                              value={editingContent}
                              onChange={(e) => setEditingContent(e.target.value)}
                              className="w-full p-3 rounded-lg border border-gray-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-sm text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                              rows={3}
                            />
                            <div className="flex justify-end gap-2 mt-2">
                              <button
                                onClick={() => { setEditingCommentId(null); setEditingContent(''); }}
                                className="px-3 py-1.5 text-xs font-medium text-neutral-600 dark:text-neutral-400 bg-gray-100 dark:bg-neutral-800 rounded-lg hover:bg-gray-200 dark:hover:bg-neutral-700 flex items-center gap-1"
                              >
                                <X size={12} /> 취소
                              </button>
                              <button
                                onClick={() => handleCommentEdit(comment.id)}
                                disabled={!editingContent.trim()}
                                className="px-3 py-1.5 text-xs font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-1"
                              >
                                <Check size={12} /> 수정
                              </button>
                            </div>
                          </div>
                        ) : (
                          <p className="text-sm text-neutral-600 dark:text-neutral-400">
                            {comment.content}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-8 text-neutral-500 dark:text-neutral-400">
                아직 댓글이 없습니다.
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default ExpertNewsDetail;
