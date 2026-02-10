"use client";

import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Send, ArrowLeft, Sparkles, Shield } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';

interface Message {
    role: 'user' | 'assistant';
    content: string;
}

const AIChatPage: React.FC = () => {
    const router = useRouter();
    const { data: session } = useSession();
    const [scanContext, setScanContext] = useState<any>(null);
    const [threadId, setThreadId] = useState<number | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [inputText, setInputText] = useState('');
    const [sending, setSending] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const contextStr = sessionStorage.getItem('ai_chat_context');
        const existingThreadId = sessionStorage.getItem('ai_thread_id');
        
        if (contextStr) {
            const context = JSON.parse(contextStr);
            setScanContext(context);
            
            if (existingThreadId) {
                setThreadId(Number(existingThreadId));
                loadThreadMessages(Number(existingThreadId));
                sessionStorage.removeItem('ai_thread_id');
            } else {
                setMessages([{
                    role: 'assistant',
                    content: '안녕하세요! 방금 수행한 검사 결과에 대해 궁금한 점을 물어보세요. 제가 자세히 설명해드리겠습니다. 😊'
                }]);
            }
        } else {
            router.push('/scanner');
        }
    }, [router]);

    const loadThreadMessages = async (threadId: number) => {
        try {
            const res = await fetch(`https://cslab.kku.ac.kr:8088/api/chat/thread/${threadId}/messages`);
            if (res.ok) {
                const data = await res.json();
                setMessages(data.map((msg: any) => ({
                    role: msg.role,
                    content: msg.content
                })));
            }
        } catch (error) {
            console.error('Failed to load messages:', error);
            setMessages([{
                role: 'assistant',
                content: '안녕하세요! 방금 수행한 검사 결과에 대해 궁금한 점을 물어보세요. 제가 자세히 설명해드리겠습니다. 😊'
            }]);
        }
    };

    const createThread = async (context: any) => {
        try {
            const res = await fetch('https://cslab.kku.ac.kr:8088/api/chat/thread/create', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    user_email: session?.user?.email || 'guest@example.com',
                    scan_type: context.scan_type,
                    scan_context: context
                })
            });
            
            if (res.ok) {
                const data = await res.json();
                setThreadId(data.thread_id);
            }
        } catch (error) {
            console.error('Failed to create thread:', error);
        }
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    const handleSendMessage = async () => {
        if (!inputText.trim() || sending || !scanContext) return;

        const userMessage = inputText.trim();
        setInputText('');
        setSending(true);

        const newMessages = [...messages, { role: 'user' as const, content: userMessage }];
        setMessages(newMessages);

        try {
            let currentThreadId = threadId;
            if (!currentThreadId) {
                const res = await fetch('https://cslab.kku.ac.kr:8088/api/chat/thread/create', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        user_email: session?.user?.email || 'guest@example.com',
                        scan_type: scanContext.scan_type,
                        scan_context: scanContext
                    })
                });
                
                if (res.ok) {
                    const data = await res.json();
                    currentThreadId = data.thread_id;
                    setThreadId(currentThreadId);
                }
            }

            const conversationHistory = newMessages.map(msg => ({
                role: msg.role,
                content: msg.content
            })).slice(1);

            const res = await fetch('https://cslab.kku.ac.kr:8088/api/chat/ai', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    thread_id: currentThreadId,
                    scan_context: scanContext,
                    message: userMessage,
                    conversation_history: conversationHistory.slice(0, -1)
                })
            });

            if (res.ok) {
                const data = await res.json();
                setMessages(prev => [...prev, { role: 'assistant', content: data.response }]);
            } else {
                setMessages(prev => [...prev, { 
                    role: 'assistant', 
                    content: '죄송합니다. 응답을 생성하는 중 오류가 발생했습니다. 다시 시도해주세요.'
                }]);
            }
        } catch (error) {
            console.error('AI chat error:', error);
            setMessages(prev => [...prev, { 
                role: 'assistant', 
                content: '네트워크 오류가 발생했습니다. 인터넷 연결을 확인해주세요.'
            }]);
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

    if (!scanContext) {
        return (
            <div className="h-[calc(100vh-8rem)] flex items-center justify-center">
                <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
            </div>
        );
    }

    const status = scanContext.final_status || scanContext.result_type || 'UNKNOWN';
    const trustScore = scanContext.final_trust_score || 0;

    return (
        <div className="h-[calc(100vh-8rem)] flex flex-col bg-gray-50 dark:bg-neutral-950">
            <div className="bg-white dark:bg-neutral-900 border-b border-gray-200 dark:border-neutral-800 px-4 py-3 flex items-center gap-3">
                <button 
                    onClick={() => router.back()} 
                    className="p-2 -ml-2 text-gray-600 dark:text-neutral-400 hover:bg-gray-100 dark:hover:bg-neutral-800 rounded-lg"
                >
                    <ArrowLeft size={20} />
                </button>
                <div className="flex items-center gap-2 flex-1">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
                        <Sparkles className="text-white" size={20} />
                    </div>
                    <div>
                        <h1 className="font-bold text-neutral-900 dark:text-neutral-100">보안 AI 어시스턴트</h1>
                        <p className="text-xs text-gray-500 dark:text-neutral-500">검사 결과 분석 중</p>
                    </div>
                </div>
            </div>

            <div className="px-4 py-3 bg-white dark:bg-neutral-900 border-b border-gray-200 dark:border-neutral-800">
                <div className={`rounded-xl p-3 flex items-center gap-3 ${
                    status === 'SAFE' || status === 'safe' ? 'bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900' :
                    status === 'WARNING' || status === 'suspicious' ? 'bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900' :
                    'bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900'
                }`}>
                    <Shield size={20} className={
                        status === 'SAFE' || status === 'safe' ? 'text-emerald-600' :
                        status === 'WARNING' || status === 'suspicious' ? 'text-amber-600' :
                        'text-rose-600'
                    } />
                    <div className="flex-1 min-w-0">
                        <p className="text-xs text-gray-600 dark:text-neutral-400">검사 결과</p>
                        <p className="font-bold text-sm text-neutral-900 dark:text-neutral-100">
                            {status === 'SAFE' || status === 'safe' ? '안전' :
                             status === 'WARNING' || status === 'suspicious' ? '주의' : '위험'} · 
                            신뢰도 {trustScore}점
                        </p>
                    </div>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50 dark:bg-neutral-950 pb-20 md:pb-20">
                {messages.map((msg, idx) => (
                    <motion.div 
                        key={idx}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                        <div className={`max-w-[85%] md:max-w-[70%] rounded-2xl p-3 text-sm leading-relaxed break-all whitespace-pre-wrap ${
                            msg.role === 'user' 
                                ? 'bg-indigo-600 text-white rounded-tr-none' 
                                : 'bg-white dark:bg-neutral-900 text-neutral-800 dark:text-neutral-200 border border-gray-200 dark:border-neutral-800 rounded-tl-none'
                        }`}>
                            {msg.content}
                        </div>
                    </motion.div>
                ))}
                {sending && (
                    <div className="flex justify-start">
                        <div className="bg-white dark:bg-neutral-900 border border-gray-200 dark:border-neutral-800 rounded-2xl rounded-tl-none p-3">
                            <div className="flex gap-1">
                                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                            </div>
                        </div>
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>

            <div className="p-4 bg-white dark:bg-neutral-900 border-t border-gray-200 dark:border-neutral-800 safe-bottom">
                <div className="flex gap-2">
                    <input 
                        type="text" 
                        value={inputText}
                        onChange={(e) => setInputText(e.target.value)}
                        onKeyPress={handleKeyPress}
                        placeholder="질문을 입력하세요..." 
                        className="flex-1 bg-gray-50 dark:bg-neutral-800 border border-gray-200 dark:border-neutral-700 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all text-neutral-900 dark:text-neutral-100 placeholder:text-neutral-400"
                        disabled={sending}
                    />
                    <button 
                        onClick={handleSendMessage}
                        disabled={sending || !inputText.trim()}
                        className="p-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <Send size={20} />
                    </button>
                </div>
            </div>
        </div>
    );
};

export default AIChatPage;
