import React from 'react';
import { Sparkles, Brain, BookOpen, Code2 } from 'lucide-react';

interface SummarySectionProps {
    easySummary?: string;
    expertSummary?: string;
    easyMode: boolean;
}

const SummarySection: React.FC<SummarySectionProps> = ({ easySummary, expertSummary, easyMode }) => {
    if (!easySummary && !expertSummary) return null;

    const summary = easyMode ? (easySummary || expertSummary) : (expertSummary || easySummary);

    return easyMode ? (
        <div className="bg-gradient-to-br from-sky-50 via-indigo-50 to-purple-50 dark:from-sky-950/30 dark:via-indigo-950/30 dark:to-purple-950/30 rounded-2xl border border-sky-100 dark:border-sky-900 p-6 md:p-8 mb-6 overflow-hidden">
            <div className="flex items-start gap-4 min-w-0">
                <div className="flex-shrink-0">
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-sky-400 to-indigo-500 flex items-center justify-center shadow-lg">
                        <Sparkles className="text-white" size={26} />
                    </div>
                </div>
                <div className="flex-1 min-w-0 overflow-hidden">
                    <h3 className="text-lg font-bold text-neutral-900 dark:text-neutral-100 mb-1 flex items-center gap-2">
                        😊 한눈에 보는 요약
                    </h3>
                    <p className="text-xs text-neutral-500 dark:text-neutral-400 mb-3">누구나 쉽게 이해할 수 있도록 정리했어요</p>
                    <p className="text-sm md:text-base text-neutral-700 dark:text-neutral-300 leading-relaxed break-all whitespace-pre-wrap overflow-wrap-anywhere">
                        {summary}
                    </p>
                </div>
            </div>
        </div>
    ) : (
        <div className="bg-neutral-50 dark:bg-neutral-900/50 rounded-2xl border border-neutral-200 dark:border-neutral-700 p-6 md:p-8 mb-6 overflow-hidden">
            <div className="flex items-start gap-4 min-w-0">
                <div className="flex-shrink-0">
                    <div className="w-12 h-12 rounded-lg bg-neutral-200 dark:bg-neutral-800 flex items-center justify-center border border-neutral-300 dark:border-neutral-600">
                        <Code2 className="text-neutral-600 dark:text-neutral-400" size={22} />
                    </div>
                </div>
                <div className="flex-1 min-w-0 overflow-hidden">
                    <h3 className="text-lg font-bold text-neutral-900 dark:text-neutral-100 mb-1 flex items-center gap-2">
                        🔬 기술 분석 요약 (Expert Summary)
                    </h3>
                    <p className="text-xs text-neutral-500 dark:text-neutral-400 mb-3 font-mono">Analysis pipeline result summary</p>
                    <p className="text-sm md:text-base text-neutral-700 dark:text-neutral-300 leading-relaxed break-all whitespace-pre-wrap overflow-wrap-anywhere font-mono">
                        {summary}
                    </p>
                </div>
            </div>
        </div>
    );
};

export default SummarySection;
