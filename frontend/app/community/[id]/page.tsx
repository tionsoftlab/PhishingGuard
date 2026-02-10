"use client";

"use client";

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { motion } from 'framer-motion';
import { ArrowLeft, Eye, MessageCircle, BadgeCheck, Clock, Shield, Search, Smartphone, MessageSquare, Mic, Mail, Edit2, Trash2, Send, MoreVertical, X, Check } from 'lucide-react';

interface Post {
  id: number;
  title: string;
  content: string;
  views: number;
  comment_count: number;
  created_at: string;
  updated_at: string;
  author: string;
  author_email?: string;
  author_id?: number;
  is_expert: boolean;
  profile_image_url?: string;
  comments?: Comment[];
  scan_id?: number;
  scan_type?: string;
  scan_result?: string;
  scan_risk_score?: number;
  easy_summary?: string;
  scan_date?: string;
}

interface Comment {
  id: number;
  content: string;
  created_at: string;
  author: string;
  author_email?: string;
  is_expert: boolean;
  is_bot: boolean;
  profile_image_url?: string;
}

const CommunityPostDetail: React.FC = () => {
  const params = useParams();
  const router = useRouter();
  const { data: session } = useSession();
  
  const [post, setPost] = useState<Post | null>(null);
  const [loading, setLoading] = useState(true);
  const [viewIncremented, setViewIncremented] = useState(false);
  
  const [commentContent, setCommentContent] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);
  const [editingCommentId, setEditingCommentId] = useState<number | null>(null);
  const [editingContent, setEditingContent] = useState('');
  const [commentMenuId, setCommentMenuId] = useState<number | null>(null);

  const fetchPost = () => {
    fetch(`/api/community/posts/${params.id}`)
      .then(res => {
        if (!res.ok) throw new Error('게시글을 찾을 수 없습니다');
        return res.json();
      })
      .then(data => {
        setPost(data);
        setLoading(false);
      })
      .catch(err => {
        console.error('게시글 로드 실패:', err);
        setLoading(false);
      });
  };

  useEffect(() => {
    if (params.id) {
      if (!viewIncremented) {
        setViewIncremented(true);
      }
      fetchPost();
    }
  }, [params.id, viewIncremented]);

  const handleDelete = async () => {
    if (!confirm('정말로 이 게시글을 삭제하시겠습니까?')) return;

    try {
      const res = await fetch(`/api/community/posts/${params.id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userEmail: session?.user?.email })
      });

      if (res.ok) {
        alert('게시글이 삭제되었습니다.');
        router.push('/community');
      } else {
        const data = await res.json();
        alert(data.error || '삭제 실패');
      }
    } catch (err) {
      console.error('삭제 오류:', err);
      alert('삭제 중 오류가 발생했습니다.');
    }
  };

  const handleCommentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentContent.trim() || !session?.user?.email) return;

    setSubmittingComment(true);
    try {
      const res = await fetch('/api/community/comments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          postId: params.id,
          content: commentContent,
          userEmail: session.user.email
        })
      });

      if (res.ok) {
         setCommentContent('');
         fetchPost();
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
      const res = await fetch(`/api/community/comments/${commentId}`, {
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
        fetchPost();
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
      const res = await fetch(`/api/community/comments/${commentId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userEmail: session?.user?.email,
          postId: params.id
        })
      });
      if (res.ok) {
        fetchPost();
      } else {
        const data = await res.json();
        alert(data.error || '댓글 삭제 실패');
      }
    } catch (err) {
      console.error('댓글 삭제 오류:', err);
      alert('댓글 삭제 중 오류가 발생했습니다.');
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

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto pb-20 md:pb-20 p-4 md:p-8">
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  if (!post) {
    return (
      <div className="max-w-4xl mx-auto pb-20 md:pb-20 p-4 md:p-8">
        <div className="text-center py-20">
          <p className="text-neutral-500 dark:text-neutral-400 mb-4">게시글을 찾을 수 없습니다.</p>
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

  const isAuthor = session?.user?.name === post.author;
  const DEMO_ACCOUNTS = ['user@example.com', 'expert@example.com'];
  const isDemoPost = DEMO_ACCOUNTS.includes(post.author_email || '');

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
          <div className="flex items-center gap-2">
            <button
              onClick={() => router.push(`/community/edit/${post.id}`)}
              className="flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-neutral-600 dark:text-neutral-400 hover:text-blue-600 dark:hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
            >
              <Edit2 size={16} />
              수정
            </button>
            {!isDemoPost && (
              <button
                onClick={handleDelete}
                className="flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-neutral-600 dark:text-neutral-400 hover:text-rose-600 dark:hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-lg transition-colors"
              >
                <Trash2 size={16} />
                삭제
              </button>
            )}
          </div>
        )}
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white dark:bg-neutral-900 rounded-2xl p-6 md:p-8 shadow-sm border border-gray-100 dark:border-neutral-800"
      >
        <h1 className="text-2xl md:text-3xl font-bold text-neutral-900 dark:text-white mb-4">
          {post.title}
        </h1>

        <div className="flex items-center justify-between mb-6 pb-6 border-b border-gray-100 dark:border-neutral-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold">
              {post.author.charAt(0)}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-medium text-neutral-900 dark:text-white">
                  {post.author}
                </span>
                {post.is_expert && (
                  <BadgeCheck size={16} className="text-blue-500" />
                )}
              </div>
              <div className="flex items-center gap-3 text-xs text-neutral-500 dark:text-neutral-400">
                <span className="flex items-center gap-1">
                  <Clock size={12} />
                  {new Date(post.created_at).toLocaleString('ko-KR')}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4 text-sm text-neutral-500 dark:text-neutral-400">
            <span className="flex items-center gap-1">
              <Eye size={16} />
              {post.views.toLocaleString()}
            </span>
            <span className="flex items-center gap-1">
              <MessageCircle size={16} />
              {post.comment_count}
            </span>
          </div>
        </div>

        {post.scan_id && (
          <div className="mb-8 p-4 border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20 rounded-xl">
              <div className="flex items-start gap-4">
                <div className={`p-2 rounded-lg ${
                  post.scan_result === 'safe' ? 'bg-emerald-100 text-emerald-600' :
                  post.scan_result === 'danger' ? 'bg-rose-100 text-rose-600' :
                  'bg-amber-100 text-amber-600'
                }`}>
                  {getIconForType(post.scan_type || 'url')}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="font-bold text-neutral-900 dark:text-white uppercase">{post.scan_type} Scan</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${
                      post.scan_result === 'safe' ? 'bg-emerald-100 text-emerald-600' :
                      post.scan_result === 'danger' ? 'bg-rose-100 text-rose-600' :
                      'bg-amber-100 text-amber-600'
                    }`}>
                      {post.scan_result?.toUpperCase()}
                    </span>
                    {post.scan_risk_score !== undefined && (
                        <span className="text-xs text-neutral-500">신뢰도: {post.scan_risk_score}점</span>
                    )}
                  </div>
                  <p className="text-sm text-neutral-700 dark:text-neutral-300 mb-2 font-medium">
                    {post.easy_summary || '분석 요약 정보가 없습니다.'}
                  </p>
                  <p className="text-xs text-neutral-500">
                    검사일: {post.scan_date ? new Date(post.scan_date).toLocaleString() : '-'}
                  </p>
                </div>
              </div>
          </div>
        )}

        <div className="prose dark:prose-invert max-w-none mb-8">
          <p className="text-neutral-700 dark:text-neutral-300 whitespace-pre-wrap leading-relaxed">
            {post.content}
          </p>
        </div>

        <div className="mt-8 pt-8 border-t border-gray-100 dark:border-neutral-800">
          <h3 className="font-bold text-lg mb-4 text-neutral-900 dark:text-white">
            댓글 {post.comment_count}개
          </h3>

          {session ? (
            <form onSubmit={handleCommentSubmit} className="mb-8">
              <div className="relative">
                <textarea
                  value={commentContent}
                  onChange={(e) => setCommentContent(e.target.value)}
                  placeholder="댓글을 작성해주세요..."
                  className="w-full p-4 pr-12 rounded-xl border border-gray-200 dark:border-neutral-800 bg-gray-50 dark:bg-neutral-800/50 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
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

          {post.comments && post.comments.length > 0 ? (
            <div className="space-y-4">
              {post.comments.map((comment) => {
                const isCommentAuthor = session?.user?.email === comment.author_email;
                return (
                <div
                  key={comment.id}
                  className={`rounded-xl p-4 ${
                    comment.is_bot 
                      ? 'bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 border-2 border-blue-200 dark:border-blue-800' 
                      : 'bg-gray-50 dark:bg-neutral-800'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 ${
                      comment.is_bot 
                        ? 'bg-gradient-to-br from-blue-500 to-purple-600 text-white' 
                        : 'bg-gradient-to-br from-purple-500 to-pink-600 text-white'
                    }`}>
                      {comment.is_bot ? '🤖' : comment.author.charAt(0)}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`font-medium text-sm ${
                          comment.is_bot 
                            ? 'text-blue-900 dark:text-blue-100 font-bold' 
                            : 'text-neutral-900 dark:text-white'
                        }`}>
                          {comment.author}
                        </span>
                        {comment.is_bot && (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-500 text-white">
                            AI
                          </span>
                        )}
                        {comment.is_expert && !comment.is_bot && (
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
                        {isCommentAuthor && !comment.is_bot && (
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
                        <p className={`text-sm leading-relaxed whitespace-pre-wrap ${
                          comment.is_bot 
                            ? 'text-blue-900 dark:text-blue-100 font-medium' 
                            : 'text-neutral-600 dark:text-neutral-400'
                        }`}>
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
      </motion.div>
    </div>
  );
};

export default CommunityPostDetail;
