import React, { useState } from 'react';
import { Mail, HelpCircle, Loader2, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface EmailInspectorProps {
    emailText: string;
    setEmailText: (text: string) => void;
    isScanning: boolean;
    onScan: () => void;
}

const EmailInspector: React.FC<EmailInspectorProps> = ({ emailText, setEmailText, isScanning, onScan }) => {
    const [showHelpModal, setShowHelpModal] = useState(false);

    return (
        <motion.div
            key="email"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="w-full relative"
        >
            <div className="flex justify-between items-center mb-2">
                <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
                    이메일 원문 (Raw Data)
                </label>
                <button
                    onClick={() => setShowHelpModal(true)}
                    className="text-xs flex items-center gap-1 text-indigo-600 dark:text-indigo-400 hover:underline"
                >
                    <HelpCircle size={12} />
                    이메일 원문이 무엇인가요?
                </button>
            </div>
            
            <textarea
                value={emailText}
                onChange={(e) => setEmailText(e.target.value)}
                placeholder={`Delivered-To: user@example.com\nReceived: by 2002:a05:...\nFrom: "Google" <no-reply@notifications.google.com>\nSubject: Security Alert\n\n(이메일의 '원본 보기'를 통해 전체 헤더와 내용을 복사해서 붙여넣어주세요)`}
                className="w-full h-48 px-6 py-4 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-neutral-900 dark:focus:ring-white transition-shadow resize-none font-mono text-sm mb-4"
                disabled={isScanning}
            />
            
            <button
                onClick={onScan}
                disabled={!emailText || isScanning}
                className={`w-full py-3 rounded-xl font-bold text-white transition-all flex items-center justify-center gap-2 shadow-md
            ${isScanning || !emailText ? 'bg-neutral-300 dark:bg-neutral-700 cursor-not-allowed text-neutral-500' : 'bg-neutral-900 dark:bg-white dark:text-neutral-900 hover:bg-neutral-800 dark:hover:bg-neutral-200'}`}
            >
                {isScanning ? <Loader2 className="animate-spin" size={18} /> : <Mail size={18} />}
                <span>{isScanning ? 'AI 이메일 분석 중...' : '이메일 피싱 검사하기'}</span>
            </button>

             {/* Help Modal */}
             <AnimatePresence>
                {showHelpModal && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
                        onClick={() => setShowHelpModal(false)}
                    >
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            onClick={(e) => e.stopPropagation()}
                            className="bg-white dark:bg-neutral-900 rounded-2xl shadow-2xl p-6 max-w-lg w-full relative"
                        >
                            <button
                                onClick={() => setShowHelpModal(false)}
                                className="absolute top-4 right-4 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200"
                            >
                                <X size={20} />
                            </button>
                            
                            <h3 className="text-xl font-bold mb-4 text-neutral-900 dark:text-white">
                                이메일 원문(Raw Email) 가져오기
                            </h3>
                            
                            <div className="space-y-4 overflow-y-auto max-h-[60vh]">
                                <div>
                                    <h4 className="font-bold text-indigo-600 dark:text-indigo-400 mb-2">Gmail (PC)</h4>
                                    <ol className="list-decimal list-inside text-sm text-neutral-700 dark:text-neutral-300 space-y-1 bg-neutral-50 dark:bg-neutral-800 p-3 rounded-lg">
                                        <li>이메일을 엽니다.</li>
                                        <li>우측 상단의 점 3개 아이콘(<span className="font-mono">⋮</span>)을 클릭합니다.</li>
                                        <li><strong>"원본 보기" (Show original)</strong>를 클릭합니다.</li>
                                        <li>새 탭이 열리면 <strong>"클립보드에 복사"</strong> 버튼을 누르거나 내용을 전체 선택하여 복사합니다.</li>
                                    </ol>
                                </div>
                                
                                <div>
                                    <h4 className="font-bold text-green-600 dark:text-green-400 mb-2">네이버 메일 (PC)</h4>
                                    <ol className="list-decimal list-inside text-sm text-neutral-700 dark:text-neutral-300 space-y-1 bg-neutral-50 dark:bg-neutral-800 p-3 rounded-lg">
                                        <li>이메일을 엽니다.</li>
                                        <li>상단 메뉴 중 <strong>"추가 기능"</strong> (또는 점 3개) 버튼을 클릭합니다.</li>
                                        <li><strong>"PC 저장"</strong>을 눌러 <code className="bg-neutral-200 dark:bg-neutral-700 px-1 rounded">.eml</code> 파일을 다운로드하거나, <strong>"메일 원문 보기"</strong>가 있다면 선택합니다.</li>
                                        <li>원문 창이 뜨면 내용을 전체 복사합니다.</li>
                                    </ol>
                                </div>
                                
                                <p className="text-xs text-neutral-500 mt-2">
                                    * 모바일 앱에서는 원본 보기가 지원되지 않는 경우가 많습니다. PC 웹에서 확인해주세요.
                                </p>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
};

export default EmailInspector;
