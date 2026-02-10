import React, { useRef, useState } from 'react';
import { MessageSquareWarning, Loader2, ImagePlus, X } from "lucide-react";
import { motion } from "framer-motion";

interface SmsInspectorProps {
    smsText: string;
    setSmsText: (text: string) => void;
    isScanning: boolean;
    onScan: () => void;
}

const SmsInspector: React.FC<SmsInspectorProps> = ({ smsText, setSmsText, isScanning, onScan }) => {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [isExtracting, setIsExtracting] = useState(false);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [ocrFailMessage, setOcrFailMessage] = useState<string | null>(null);

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const preview = URL.createObjectURL(file);
        setPreviewUrl(preview);
        setIsExtracting(true);
        setOcrFailMessage(null);

        try {
            const formData = new FormData();
            formData.append('file', file);

            const response = await fetch('https://cslab.kku.ac.kr:8088/api/ocr/extract', {
                method: 'POST',
                body: formData,
            });

            if (!response.ok) throw new Error('OCR 요청 실패');

            const data = await response.json();
            if (data.status === 'success' && data.text && data.text.trim().length > 0) {
                setSmsText(data.text);
            } else {
                setOcrFailMessage('이미지에서 문자 내용을 인식하지 못했습니다. 텍스트가 선명하게 보이는 스크린샷을 다시 업로드해주세요.');
                setPreviewUrl(null);
            }
        } catch (error) {
            console.error('OCR error:', error);
            setOcrFailMessage('이미지 처리 중 오류가 발생했습니다. 다른 이미지로 다시 시도해주세요.');
            setPreviewUrl(null);
        } finally {
            setIsExtracting(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const clearPreview = () => {
        setPreviewUrl(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    return (
        <motion.div
            key="sms"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 1, x: 20 }}
            className="w-full"
        >
            <div className="relative">
                <textarea
                    value={smsText}
                    onChange={(e) => setSmsText(e.target.value)}
                    placeholder="의심스러운 문자 메시지 내용을 여기에 붙여넣으세요..."
                    className="w-full h-32 px-6 py-4 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-neutral-900 dark:focus:ring-white transition-shadow resize-none mb-2"
                    disabled={isScanning || isExtracting}
                />
            </div>

            <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/jpg,image/webp,image/gif"
                onChange={handleImageUpload}
                className="hidden"
            />

            {previewUrl && (
                <div className="relative mb-3 inline-block">
                    <img src={previewUrl} alt="업로드된 스크린샷" className="h-20 rounded-lg border border-neutral-200 dark:border-neutral-700 object-cover" />
                    <button onClick={clearPreview} className="absolute -top-2 -right-2 bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 rounded-full p-0.5 hover:scale-110 transition-transform">
                        <X size={14} />
                    </button>
                </div>
            )}

            {ocrFailMessage && (
                <div className="mb-3 p-4 rounded-xl border border-amber-200 dark:border-amber-700 bg-amber-50 dark:bg-amber-900/30">
                    <p className="text-sm text-amber-800 dark:text-amber-200 mb-3">{ocrFailMessage}</p>
                    <div className="flex gap-2">
                        <button
                            onClick={() => {
                                setOcrFailMessage(null);
                                fileInputRef.current?.click();
                            }}
                            className="px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-xs font-medium transition-colors"
                        >
                            다시 업로드
                        </button>
                        <button
                            onClick={() => setOcrFailMessage(null)}
                            className="px-3 py-1.5 rounded-lg border border-amber-300 dark:border-amber-600 text-amber-700 dark:text-amber-300 text-xs font-medium hover:bg-amber-100 dark:hover:bg-amber-900/50 transition-colors"
                        >
                            닫기
                        </button>
                    </div>
                </div>
            )}

            <div className="flex gap-2 mb-4">
                <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isScanning || isExtracting}
                    className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-medium transition-all
                        ${isExtracting
                            ? 'border-neutral-300 dark:border-neutral-600 bg-neutral-100 dark:bg-neutral-800 text-neutral-400 cursor-not-allowed'
                            : 'border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-750 hover:border-neutral-300 dark:hover:border-neutral-600'
                        }`}
                >
                    {isExtracting ? (
                        <>
                            <Loader2 className="animate-spin" size={16} />
                            <span>텍스트 추출 중...</span>
                        </>
                    ) : (
                        <>
                            <ImagePlus size={16} />
                            <span>스크린샷으로 입력</span>
                        </>
                    )}
                </button>
            </div>

            <button
                onClick={onScan}
                disabled={!smsText || isScanning || isExtracting}
                className={`w-full py-3 rounded-xl font-bold text-white transition-all flex items-center justify-center gap-2 shadow-md
            ${isScanning || !smsText || isExtracting ? 'bg-neutral-300 dark:bg-neutral-700 cursor-not-allowed text-neutral-500' : 'bg-neutral-900 dark:bg-white dark:text-neutral-900 hover:bg-neutral-800 dark:hover:bg-neutral-200'}`}
            >
                {isScanning ? <Loader2 className="animate-spin" size={18} /> : <MessageSquareWarning size={18} />}
                <span>{isScanning ? 'AI 문자 분석 중...' : '문자 피싱 검사하기'}</span>
            </button>
        </motion.div>
    );
};

export default SmsInspector;
