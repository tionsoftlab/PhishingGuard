import React from 'react';
import { Mic, Upload, X, Loader2, FileAudio } from "lucide-react";
import { motion } from "framer-motion";

interface VoiceInspectorProps {
    voiceFile: File | null;
    setVoiceFile: (file: File | null) => void;
    isScanning: boolean;
    onScan: () => void;
}

const VoiceInspector: React.FC<VoiceInspectorProps> = ({ voiceFile, setVoiceFile, isScanning, onScan }) => {
    return (
        <motion.div
            key="voice"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="w-full"
        >
            <div className={`w-full p-8 border-2 border-dashed rounded-xl flex flex-col items-center justify-center transition-all cursor-pointer bg-neutral-50 dark:bg-neutral-800 ${voiceFile ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20' : 'border-neutral-300 dark:border-neutral-700 hover:border-neutral-400 dark:hover:border-neutral-600'}`}>
                <input
                    id="voice-upload"
                    type="file"
                    accept="audio/*"
                    className="hidden"
                    onChange={(e) => {
                        if (e.target.files?.[0]) {
                            setVoiceFile(e.target.files[0]);
                        }
                    }}
                    disabled={isScanning}
                />
                
                {voiceFile ? (
                    <div className="text-center relative w-full">
                        <button 
                            onClick={(e) => {
                                e.stopPropagation();
                                setVoiceFile(null);
                            }}
                            className="absolute -top-4 -right-4 p-1 bg-neutral-200 dark:bg-neutral-700 rounded-full hover:bg-neutral-300 dark:hover:bg-neutral-600 transition-colors"
                            disabled={isScanning}
                        >
                            <X size={16} />
                        </button>
                        <FileAudio size={48} className="mx-auto text-indigo-600 dark:text-indigo-400 mb-3" />
                        <p className="font-medium text-neutral-900 dark:text-neutral-100">{voiceFile.name}</p>
                        <p className="text-sm text-neutral-500">{(voiceFile.size / 1024 / 1024).toFixed(2)} MB</p>
                    </div>
                ) : (
                    <label htmlFor="voice-upload" className="w-full h-full flex flex-col items-center justify-center cursor-pointer">
                        <Upload size={48} className="text-neutral-400 mb-3" />
                        <p className="font-bold text-neutral-700 dark:text-neutral-300 mb-1">
                            보이스피싱 의심 파일 업로드
                        </p>
                        <p className="text-sm text-neutral-500 mb-4">
                            또는 파일을 여기로 드래그하세요
                        </p>
                        <span className="px-4 py-2 bg-white dark:bg-neutral-700 border border-neutral-200 dark:border-neutral-600 rounded-lg text-sm font-medium hover:bg-neutral-50 dark:hover:bg-neutral-600 transition-colors">
                            파일 선택
                        </span>
                        <p className="text-xs text-neutral-400 mt-4">
                            지원 형식: mp3, wav, m4a, aac
                        </p>
                    </label>
                )}
            </div>

            <button
                onClick={onScan}
                disabled={!voiceFile || isScanning}
                className={`w-full mt-4 py-3 rounded-xl font-bold text-white transition-all flex items-center justify-center gap-2 shadow-md
            ${isScanning || !voiceFile ? 'bg-neutral-300 dark:bg-neutral-700 cursor-not-allowed text-neutral-500' : 'bg-neutral-900 dark:bg-white dark:text-neutral-900 hover:bg-neutral-800 dark:hover:bg-neutral-200'}`}
            >
                {isScanning ? <Loader2 className="animate-spin" size={18} /> : <Mic size={18} />}
                <span>{isScanning ? '음성 분석 중...' : '보이스피싱 검사하기'}</span>
            </button>
        </motion.div>
    );
};

export default VoiceInspector;
