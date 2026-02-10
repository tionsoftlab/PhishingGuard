import React from 'react';
import { LinkIcon, Mail, MessageSquareWarning, Mic, QrCode } from "lucide-react";
import { motion } from "framer-motion";

interface ScannerTabsProps {
    mode: 'url' | 'qr' | 'sms' | 'voice' | 'email';
    setMode: (mode: 'url' | 'qr' | 'sms' | 'voice' | 'email') => void;
}

const ScannerTabs: React.FC<ScannerTabsProps> = ({ mode, setMode }) => {
    return (
        <div className="sticky top-0 z-10 flex border-b border-neutral-100 dark:border-neutral-800 bg-white dark:bg-neutral-900">
            {[
                { id: 'sms', label: '문자 분석', shortLabel: '문자', icon: MessageSquareWarning },
                { id: 'qr', label: 'QR 스캔', shortLabel: 'QR', icon: QrCode },
                { id: 'url', label: 'URL 검사', shortLabel: 'URL', icon: LinkIcon },
                { id: 'voice', label: '보이스피싱 검사', shortLabel: '보이스', icon: Mic },
                { id: 'email', label: '이메일 검사', shortLabel: '이메일', icon: Mail }
            ].map((tab) => (
                <button
                    key={tab.id}
                    onClick={() => setMode(tab.id as any)}
                    className={`flex-1 py-4 font-medium text-xs md:text-base flex items-center justify-center gap-1 md:gap-2 transition-colors relative
            ${mode === tab.id ? 'text-neutral-900 dark:text-white bg-neutral-50/50 dark:bg-neutral-800/50' : 'text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-800'}`}
                >
                    <tab.icon size={18} className="flex-shrink-0" />
                    <span className="hidden md:inline">{tab.label}</span>
                    <span className="md:hidden">{tab.shortLabel}</span>
                    {mode === tab.id && <motion.div layoutId="tabIndicator" className="absolute bottom-0 left-0 right-0 h-0.5 bg-neutral-900 dark:bg-white" />}
                </button>
            ))}
        </div>
    );
};

export default ScannerTabs;
