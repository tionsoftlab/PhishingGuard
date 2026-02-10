"use client";

import React, { useState, useEffect, useRef } from 'react';
import { Search, Send, ArrowLeft, MessageSquare, Sparkles, Shield, Star, Paperclip, X, FileText, Download, Image as ImageIcon } from 'lucide-react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';

interface Message {
  id: number;
  message_text: string;
  sender_type: 'me' | 'other';
  time_formatted: string;
  created_at: string;
  file_url?: string | null;
  file_name?: string | null;
  file_type?: string | null;
  file_size?: number | null;
}

interface Thread {
  id: number;
  expert_name?: string;
  expert_avatar?: string | null;
  last_message: string;
  time_ago?: string;
  unread_count?: number;
  specialty?: string | null;
  scan_type?: string;
  scan_context?: any;
  is_ai_chat?: boolean;
}

const Messages: React.FC = () => {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [threads, setThreads] = useState<Thread[]>([]);
  const [aiThreads, setAiThreads] = useState<Thread[]>([]);
  const [selectedThreadId, setSelectedThreadId] = useState<number | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [hasReviewed, setHasReviewed] = useState(false);
  const [submittingReview, setSubmittingReview] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isExpert, setIsExpert] = useState(false);

  useEffect(() => {
    const checkExpertStatus = async () => {
        try {
            const res = await fetch('/api/user/profile');
            if (res.ok) {
                const data = await res.json();
                setIsExpert(data.is_expert);
            }
        } catch (error) {
            console.error('Failed to check expert status:', error);
        }
    };
    if (status === 'authenticated') {
        checkExpertStatus();
    }
  }, [status]);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin');
    }
  }, [status, router]);

  useEffect(() => {
    if (status === 'authenticated') {
      fetchThreads();
      fetchAIThreads();
      
      const params = new URLSearchParams(window.location.search);
      const aiThreadParam = params.get('ai_thread');
      const threadParam = params.get('thread');
      
      if (aiThreadParam) {
        router.push(`/messages?thread=${aiThreadParam}`);
      } else if (threadParam) {
        setSelectedThreadId(Number(threadParam));
      }
    }
  }, [status]);

  useEffect(() => {
    if (selectedThreadId) {
      fetchMessages(selectedThreadId);
      checkReviewStatus(selectedThreadId);
      const interval = setInterval(() => {
        fetchMessages(selectedThreadId);
      }, 3000);
      return () => clearInterval(interval);
    }
  }, [selectedThreadId]);

  const lastMessageIdRef = useRef<number | null>(null);

  useEffect(() => {
    if (messages.length > 0) {
      const lastMsg = messages[messages.length - 1];
      if (lastMsg.id !== lastMessageIdRef.current) {
        scrollToBottom();
        lastMessageIdRef.current = lastMsg.id;
      }
    }
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const fetchThreads = async () => {
    try {
      const res = await fetch('/api/messages/threads');
      if (res.ok) {
        const data = await res.json();
        setThreads(data);
      }
    } catch (error) {
      console.error('스레드 로드 실패:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchAIThreads = async () => {
    try {
      const res = await fetch(`https://cslab.kku.ac.kr:8088/api/chat/threads?user_email=${session?.user?.email}`);
      if (res.ok) {
        const data = await res.json();
        const threadsWithMessages = [];
        for (const thread of data) {
          const msgRes = await fetch(`https://cslab.kku.ac.kr:8088/api/chat/thread/${thread.id}/messages`);
          if (msgRes.ok) {
            const messages = await msgRes.json();
            if (messages.length > 1) {
              threadsWithMessages.push({
                ...thread,
                is_ai_chat: true,
                expert_name: `${thread.scan_type?.toUpperCase() || '검사'} AI 채팅`,
                time_ago: formatTimeAgo(thread.updated_at || thread.created_at),
                last_message: messages[messages.length - 1]?.content?.substring(0, 50) || '대화를 시작하세요'
              });
            }
          }
        }
        setAiThreads(threadsWithMessages);
      }
    } catch (error) {
      console.error('Failed to fetch AI threads:', error);
    }
  };

  const formatTimeAgo = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);
    
    if (diffMins < 60) return `${diffMins}분 전`;
    if (diffHours < 24) return `${diffHours}시간 전`;
    return `${diffDays}일 전`;
  };

  const fetchMessages = async (threadId: number) => {
    try {
      const res = await fetch(`/api/messages/${threadId}`);
      if (res.ok) {
        const data = await res.json();
        setMessages(data);
      }
    } catch (error) {
      console.error('메시지 로드 실패:', error);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.size > 10 * 1024 * 1024) {
        alert('파일 크기는 10MB를 초과할 수 없습니다.');
        return;
      }
      setSelectedFile(file);
      
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (e) => {
          setFilePreview(e.target?.result as string);
        };
        reader.readAsDataURL(file);
      } else {
        setFilePreview(null);
      }
    }
  };

  const handleRemoveFile = () => {
    setSelectedFile(null);
    setFilePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSendMessage = async () => {
    if ((!inputText.trim() && !selectedFile) || !selectedThreadId || sending || uploading) return;

    setSending(true);
    try {
      let fileData = null;

      if (selectedFile) {
        setUploading(true);
        const formData = new FormData();
        formData.append('file', selectedFile);

        const uploadRes = await fetch('/api/messages/upload', {
          method: 'POST',
          body: formData
        });

        if (!uploadRes.ok) {
          throw new Error('파일 업로드 실패');
        }

        fileData = await uploadRes.json();
        setUploading(false);
      }

      const res = await fetch(`/api/messages/${selectedThreadId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          message: inputText.trim(),
          ...fileData
        })
      });

      if (res.ok) {
        const newMessage = await res.json();
        setMessages(prev => [...prev, newMessage]);
        setInputText('');
        handleRemoveFile();
        fetchThreads();
      }
    } catch (error) {
      console.error('메시지 전송 실패:', error);
      alert('메시지 전송에 실패했습니다.');
      setUploading(false);
    } finally {
      setSending(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const checkReviewStatus = async (threadId: number) => {
    try {
      const res = await fetch(`https://cslab.kku.ac.kr:8088/api/reviews/check/${threadId}?user_email=${session?.user?.email}`);
      if (res.ok) {
        const data = await res.json();
        setHasReviewed(data.has_review);
      }
    } catch (error) {
      console.error('Failed to check review status:', error);
    }
  };

  const submitReview = async () => {
    if (!selectedThreadId || !rating || submittingReview) return;

    const activeThread = threads.find(t => t.id === selectedThreadId);
    if (!activeThread) return;

    setSubmittingReview(true);
    try {
      const res = await fetch('https://cslab.kku.ac.kr:8088/api/reviews/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          thread_id: selectedThreadId,
          user_email: session?.user?.email,
          expert_email: activeThread.expert_name,
          rating,
          comment: comment.trim() || null
        })
      });

      if (res.ok) {
        setShowReviewModal(false);
        setHasReviewed(true);
        setRating(0);
        setComment('');
        alert('후기가 성공적으로 등록되었습니다!');
      } else {
        const error = await res.json();
        alert(error.detail || '후기 등록에 실패했습니다.');
      }
    } catch (error) {
      console.error('Failed to submit review:', error);
      alert('네트워크 오류가 발생했습니다.');
    } finally {
      setSubmittingReview(false);
    }
  };

  if (status === 'loading' || loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const activeThread = threads.find(t => t.id === selectedThreadId);

  return (
    <div className="h-full w-full max-w-full flex overflow-hidden relative">
      
      <div className={`w-full md:w-80 border-r border-gray-200 dark:border-neutral-800 flex flex-col bg-gray-50/50 dark:bg-neutral-900 ${selectedThreadId ? 'hidden md:flex' : 'flex'}`}>
        <div className="p-4 border-b border-gray-200 dark:border-neutral-800">
            <div className="relative">
                <input 
                    type="text" 
                    placeholder="대화 검색..." 
                    className="w-full bg-white dark:bg-neutral-800 border border-gray-200 dark:border-neutral-700 rounded-xl py-2 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-neutral-900 dark:text-neutral-100 placeholder:text-neutral-400"
                />
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-neutral-500" />
            </div>
        </div>
        
        <div className="flex-1 overflow-y-auto">
            {[...aiThreads, ...threads].map((thread) => (
                <div 
                    key={thread.is_ai_chat ? `ai-${thread.id}` : `expert-${thread.id}`} 
                    onClick={() => {
                      if (thread.is_ai_chat && thread.scan_context) {
                        sessionStorage.setItem('ai_chat_context', JSON.stringify(thread.scan_context));
                        sessionStorage.setItem('ai_thread_id', thread.id.toString());
                        router.push('/ai-chat');
                      } else {
                        setSelectedThreadId(thread.id);
                      }
                    }}
                    className={`p-4 flex gap-3 cursor-pointer transition-colors border-b border-gray-100 dark:border-neutral-800 hover:bg-white dark:hover:bg-neutral-800/50
                        ${selectedThreadId === thread.id ? 'bg-white dark:bg-neutral-800 border-l-4 border-l-blue-500 shadow-sm' : 'border-l-4 border-l-transparent'}`}
                >
                    <div className="relative">
                        {thread.is_ai_chat ? (
                          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
                            <Sparkles size={20} className="text-white" />
                          </div>
                        ) : thread.expert_avatar ? (
                          <img src={thread.expert_avatar} alt={thread.expert_name} className="w-12 h-12 rounded-full object-cover bg-gray-200 dark:bg-neutral-700" />
                        ) : (
                          <div className="w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center text-blue-600 dark:text-blue-400 font-bold">
                            {thread.expert_name?.charAt(0) || 'E'}
                          </div>
                        )}
                        {!thread.is_ai_chat && <div className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 rounded-full border-2 border-white dark:border-neutral-900"></div>}
                    </div>
                    <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-baseline mb-1">
                            <h3 className="font-bold text-neutral-900 dark:text-neutral-100 text-sm truncate flex items-center gap-2">
                              {thread.is_ai_chat ? (
                                <>
                                  {thread.scan_type?.toUpperCase() || '검사'} AI 채팅
                                  {thread.scan_context && (
                                    <Shield size={14} className={
                                      thread.scan_context.final_status === 'SAFE' ? 'text-emerald-600' :
                                      thread.scan_context.final_status === 'WARNING' || thread.scan_context.final_status === 'SUSPICIOUS' ? 'text-amber-600' :
                                      'text-rose-600'
                                    } />
                                  )}
                                </>
                              ) : (
                                thread.expert_name
                              )}
                            </h3>
                            <span className="text-xs text-gray-400 dark:text-neutral-500">{thread.time_ago}</span>
                        </div>
                        {!thread.is_ai_chat && thread.specialty && (
                          <p className="text-xs text-blue-600 dark:text-blue-400 mb-1">{thread.specialty}</p>
                        )}
                        <p className={`text-sm truncate ${(thread.unread_count || 0) > 0 ? 'text-neutral-800 dark:text-neutral-200 font-semibold' : 'text-gray-500 dark:text-neutral-500'}`}>
                            {thread.last_message || '대화를 시작하세요'}
                        </p>
                    </div>
                    {(thread.unread_count || 0) > 0 && (
                        <div className="flex flex-col justify-center">
                             <span className="w-5 h-5 bg-blue-600 rounded-full flex items-center justify-center text-[10px] font-bold text-white">
                                {thread.unread_count}
                             </span>
                        </div>
                    )}
                </div>
            ))}
        </div>
      </div>

      <div className={`flex-1 flex flex-col bg-white dark:bg-neutral-950 
        ${!selectedThreadId ? 'hidden md:flex' : 'flex'} 
        w-full max-w-full`}>
        {selectedThreadId ? (
            <>
                <div className="h-14 md:h-16 border-b border-gray-100 dark:border-neutral-800 flex items-center justify-between px-4 bg-white/90 dark:bg-neutral-950/90 backdrop-blur-sm sticky top-0 z-10">
                    <div className="flex items-center gap-3">
                        <button onClick={() => setSelectedThreadId(null)} className="md:hidden p-2 -ml-2 text-gray-500 dark:text-neutral-400">
                            <ArrowLeft size={20} />
                        </button>
                        {activeThread?.expert_avatar ? (
                          <img src={activeThread.expert_avatar} alt="" className="w-10 h-10 rounded-full object-cover" />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center text-blue-600 dark:text-blue-400 font-bold">
                            {activeThread?.expert_name.charAt(0)}
                          </div>
                        )}
                        <div>
                            <h3 className="font-bold text-neutral-900 dark:text-neutral-100 text-sm">{activeThread?.expert_name}</h3>
                            <p className="text-xs text-gray-500 dark:text-neutral-500 flex items-center gap-1">
                                <span className="w-2 h-2 bg-emerald-500 rounded-full inline-block"></span>
                                온라인
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        {!isExpert && (
                            <button 
                                onClick={() => setShowReviewModal(true)}
                                disabled={messages.length < 2 || hasReviewed}
                                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
                                    messages.length < 2 || hasReviewed 
                                        ? 'bg-gray-300 dark:bg-gray-700 text-gray-500 dark:text-gray-400 cursor-not-allowed' 
                                        : 'bg-indigo-600 hover:bg-indigo-700 text-white'
                                }`}
                                title={hasReviewed ? '이미 후기를 작성하셨습니다' : messages.length < 2 ? '대화를 나눈 후 후기를 작성할 수 있습니다' : ''}
                            >
                                <Star size={16} />
                                {hasReviewed ? '후기 작성 완료' : '후기 작성하기'}
                            </button>
                        )}
                    </div>
                </div>

                <div className="flex-1 overflow-x-hidden overflow-y-auto p-4 md:p-6 space-y-4 bg-[#F8FAFC] dark:bg-neutral-950 scrollbar-hide pb-20 md:pb-20">
                    {messages.map((msg) => (
                        <div key={msg.id} className={`flex ${msg.sender_type === 'me' ? 'justify-end' : 'justify-start'}`}>
                            <div className={`relative max-w-[85%] md:max-w-[70%] rounded-2xl p-4 text-sm leading-relaxed shadow-sm min-w-0
                                ${msg.sender_type === 'me' 
                                    ? 'bg-blue-600 text-white rounded-tr-none shadow-blue-100 dark:shadow-none' 
                                    : 'bg-white dark:bg-neutral-900 text-neutral-800 dark:text-neutral-200 border border-gray-100 dark:border-neutral-800 rounded-tl-none'}`}>
                                    {msg.file_url && (
                                      <div className="mb-2 -mx-1 mt-1">
                                        {msg.file_type?.startsWith('image/') ? (
                                          <div className="relative group cursor-pointer overflow-hidden rounded-lg w-full" onClick={() => window.open(msg.file_url!, '_blank')}>
                                            <img 
                                              src={msg.file_url!} 
                                              alt={msg.file_name || '첨부 이미지'} 
                                              className="w-full h-auto max-h-60 object-cover"
                                            />
                                          </div>
                                        ) : (
                                          <a 
                                            href={msg.file_url!} 
                                            target="_blank" 
                                            rel="noreferrer"
                                            className={`flex items-center gap-3 p-3 rounded-xl ${
                                              msg.sender_type === 'me' 
                                                ? 'bg-blue-700/50 hover:bg-blue-700' 
                                                : 'bg-gray-100 dark:bg-neutral-800 hover:bg-gray-200 dark:hover:bg-neutral-700'
                                            } transition-colors`}
                                          >
                                            <div className="p-2 bg-white/20 rounded-lg">
                                              <FileText size={20} />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                              <p className="text-sm font-medium truncate">{msg.file_name}</p>
                                              <p className="text-xs opacity-70">
                                                {(msg.file_size ? (msg.file_size / 1024 / 1024).toFixed(2) : '0')} MB
                                              </p>
                                            </div>
                                            <Download size={16} />
                                          </a>
                                        )}
                                      </div>
                                    )}
                                    {msg.message_text && <p className="whitespace-pre-wrap">{msg.message_text}</p>}
                                    <p className={`text-[10px] mt-1 text-right ${msg.sender_type === 'me' ? 'text-blue-200' : 'text-gray-400 dark:text-neutral-500'}`}>
                                        {msg.time_formatted}
                                    </p>
                            </div>
                        </div>
                    ))}
                    <div ref={messagesEndRef} />
                </div>

                <div className="p-4 md:p-6 bg-white dark:bg-neutral-950 border-t border-gray-100 dark:border-neutral-800 pb-24 md:pb-6">
                    {selectedFile && (
                      <div className="mb-3 p-3 bg-gray-50 dark:bg-neutral-900 rounded-xl flex items-center justify-between animate-in slide-in-from-bottom-2">
                        <div className="flex items-center gap-3 overflow-hidden">
                          {filePreview ? (
                            <img src={filePreview} alt="Preview" className="w-10 h-10 rounded-lg object-cover bg-gray-200" />
                          ) : (
                            <div className="w-10 h-10 rounded-lg bg-gray-200 dark:bg-neutral-800 flex items-center justify-center text-gray-500">
                              <FileText size={20} />
                            </div>
                          )}
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100 truncate max-w-[200px]">
                              {selectedFile.name}
                            </p>
                            <p className="text-xs text-neutral-500">
                              {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                            </p>
                          </div>
                        </div>
                        <button 
                          onClick={handleRemoveFile}
                          className="p-1.5 text-gray-500 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                        >
                          <X size={18} />
                        </button>
                      </div>
                    )}
                    
                    <div className="flex gap-2 items-end">
                        <input
                          type="file"
                          ref={fileInputRef}
                          onChange={handleFileSelect}
                          className="hidden"
                          accept="image/*,.pdf,.doc,.docx,.txt"
                        />
                        <button
                          onClick={() => fileInputRef.current?.click()}
                          className="p-3 text-gray-500 hover:text-blue-600 hover:bg-blue-50 dark:text-neutral-400 dark:hover:text-blue-400 dark:hover:bg-white/5 rounded-xl transition-colors"
                          title="파일 첨부"
                        >
                          <Paperclip size={20} />
                        </button>
                        <textarea 
                            value={inputText}
                            onChange={(e) => setInputText(e.target.value)}
                            onKeyPress={handleKeyPress}
                            placeholder="메시지를 입력하세요..." 
                            rows={1}
                            className="flex-1 bg-gray-50 dark:bg-neutral-900 border border-gray-200 dark:border-neutral-800 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all text-neutral-900 dark:text-neutral-100 placeholder:text-neutral-400 min-h-[46px] max-h-32 resize-none"
                            disabled={sending || uploading}
                        />
                        <button 
                          onClick={handleSendMessage}
                          disabled={sending || uploading || (!inputText.trim() && !selectedFile)}
                          className="p-3 bg-neutral-900 dark:bg-blue-600 text-white rounded-xl hover:bg-blue-600 dark:hover:bg-blue-500 transition-colors shadow-lg shadow-gray-200 dark:shadow-none disabled:opacity-50 disabled:cursor-not-allowed mb-[1px]"
                        >
                            {uploading ? (
                              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            ) : (
                              <Send size={20} />
                            )}
                        </button>
                    </div>
                </div>
            </>
        ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-gray-400 dark:text-neutral-600 bg-gray-50 dark:bg-neutral-950 pb-20 md:pb-20">
                <div className="w-16 h-16 bg-gray-100 dark:bg-neutral-900 rounded-full flex items-center justify-center mb-4">
                    <MessageSquare size={32} className="text-gray-300 dark:text-neutral-700" />
                </div>
                <p>대화 상대를 선택하여 메시지를 시작하세요.</p>
            </div>
        )}
      </div>
      
      {showReviewModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100]" onClick={() => setShowReviewModal(false)}>
          <div className="bg-white dark:bg-neutral-900 rounded-2xl p-6 max-w-md w-full mx-4" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-xl font-bold text-neutral-900 dark:text-neutral-100 mb-4">전문가 후기 작성</h3>
            
            <div className="mb-6">
              <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                만족도를 평가해주세요
              </label>
              <div className="flex gap-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    onClick={() => setRating(star)}
                    className="transition-all hover:scale-110"
                  >
                    <Star 
                      size={32} 
                      className={star <= rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300 dark:text-gray-600'}
                    />
                  </button>
                ))}
              </div>
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                후기 (선택사항)
              </label>
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                className="w-full px-4 py-3 bg-gray-50 dark:bg-neutral-800 border border-gray-200 dark:border-neutral-700 rounded-lg text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                rows={4}
                placeholder="전문가와의 상담 경험을 공유해주세요..."
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowReviewModal(false);
                  setRating(0);
                  setComment('');
                }}
                className="flex-1 px-4 py-2.5 bg-gray-200 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 rounded-lg font-medium hover:bg-gray-300 dark:hover:bg-neutral-700 transition-colors"
              >
                취소
              </button>
              <button
                onClick={submitReview}
                disabled={!rating || submittingReview}
                className="flex-1 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submittingReview ? '제출 중...' : '제출하기'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Messages;
