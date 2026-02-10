import React, { useRef, useState } from 'react';
import { Search, Loader2, ImagePlus, X } from "lucide-react";
import { motion } from "framer-motion";

interface UrlInspectorProps {
    url: string;
    setUrl: (url: string) => void;
    isScanning: boolean;
    onScan: () => void;
}

const UrlInspector: React.FC<UrlInspectorProps> = ({ url, setUrl, isScanning, onScan }) => {
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
            formData.append('mode', 'url');

            const response = await fetch('https://cslab.kku.ac.kr:8088/api/ocr/extract', {
                method: 'POST',
                body: formData,
            });

            if (!response.ok) throw new Error('OCR 요청 실패');

            const data = await response.json();
            if (data.status === 'success' && data.text && data.text.trim().length > 0) {
                const text = data.text.trim();
                const urlPattern = /(?:https?:\/\/|www\.)[^\s,\])"'<>]+|(?:[a-zA-Z0-9-]+\.)+(?:com|net|org|kr|io|co|me|xyz|info|biz|app|dev|site|online|shop|store|tech|cloud|link|page|top|icu|cc|to|ly|gl|bit|goo)(?:\/[^\s,\])"'<>]*)*/gi;
                const urls = text.match(urlPattern);
                if (urls && urls.length > 0) {
                    let extractedUrl = urls[0];
                    if (extractedUrl.match(/^www\./i)) {
                        extractedUrl = 'https://' + extractedUrl;
                    }
                    if (!extractedUrl.match(/^https?:\/\//i)) {
                        extractedUrl = 'https://' + extractedUrl;
                    }
                    setUrl(extractedUrl);
                } else {
                    const singleLine = text.split('\n')[0].trim();
                    if (singleLine.includes('.') && !singleLine.includes(' ')) {
                        const finalUrl = singleLine.match(/^https?:\/\//i) ? singleLine : 'https://' + singleLine;
                        setUrl(finalUrl);
                    } else {
                        setOcrFailMessage('이미지에서 URL을 찾지 못했습니다. URL이 포함된 스크린샷을 다시 업로드해주세요.');
                        setPreviewUrl(null);
                    }
                }
            } else {
                setOcrFailMessage('이미지에서 텍스트를 인식하지 못했습니다. 텍스트가 선명하게 보이는 스크린샷을 다시 업로드해주세요.');
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
            key="url"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="w-full"
        >
            <div className="relative mb-2">
                <input
                    type="text"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && onScan()}
                    placeholder="검사할 URL을 입력하세요 (예: https://example.com)"
                    className="w-full px-6 py-4 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-neutral-900 dark:focus:ring-white transition-shadow"
                    disabled={isScanning || isExtracting}
                />
                <button
                    onClick={onScan}
                    disabled={!url || isScanning || isExtracting}
                    className="absolute right-2 top-2 bottom-2 px-6 bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 rounded-lg font-bold hover:scale-105 active:scale-95 transition-all disabled:opacity-50 disabled:hover:scale-100 flex items-center gap-2"
                >
                    {isScanning ? <Loader2 className="animate-spin" size={20} /> : <Search size={20} />}
                    <span className="hidden md:inline">{isScanning ? '분석 중...' : '검사'}</span>
                </button>
            </div>

            {/* 이미지 업로드 */}
            <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/jpg,image/webp,image/gif"
                onChange={handleImageUpload}
                className="hidden"
            />

            {previewUrl && (
                <div className="relative mb-2 inline-block">
                    <img src={previewUrl} alt="업로드된 스크린샷" className="h-16 rounded-lg border border-neutral-200 dark:border-neutral-700 object-cover" />
                    <button onClick={clearPreview} className="absolute -top-2 -right-2 bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 rounded-full p-0.5 hover:scale-110 transition-transform">
                        <X size={14} />
                    </button>
                </div>
            )}

            {/* OCR 실패 모달 */}
            {ocrFailMessage && (
                <div className="mb-2 p-4 rounded-xl border border-amber-200 dark:border-amber-700 bg-amber-50 dark:bg-amber-900/30">
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

            <button
                onClick={() => fileInputRef.current?.click()}
                disabled={isScanning || isExtracting}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl border text-sm font-medium transition-all
                    ${isExtracting
                        ? 'border-neutral-300 dark:border-neutral-600 bg-neutral-100 dark:bg-neutral-800 text-neutral-400 cursor-not-allowed'
                        : 'border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-750 hover:border-neutral-300 dark:hover:border-neutral-600'
                    }`}
            >
                {isExtracting ? (
                    <>
                        <Loader2 className="animate-spin" size={16} />
                        <span>URL 추출 중...</span>
                    </>
                ) : (
                    <>
                        <ImagePlus size={16} />
                        <span>스크린샷에서 URL 추출</span>
                    </>
                )}
            </button>
        </motion.div>
    );
};

export default UrlInspector;
