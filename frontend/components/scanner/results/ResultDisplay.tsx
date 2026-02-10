import React, { useEffect, useRef, useState } from 'react';
import { CheckCircle, AlertTriangle, Siren, Scan, Shield, Activity, Server, FileText, Globe, MessageSquare, UserCheck, ShieldCheck, ShieldAlert, ShieldX, Lightbulb, Phone, Ban, Eye as EyeIcon } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import EmailResult from './EmailResult';
import UrlAnalysisDetail from './UrlAnalysisDetail';
import SummarySection from './SummarySection';

interface ResultDisplayProps {
    result: 'safe' | 'suspicious' | 'danger' | null;
    resultData: any;
    isScanning: boolean;
    hasNetworkError: boolean;
    setResult: (result: 'safe' | 'suspicious' | 'danger' | null) => void;
    setResultData: (data: any) => void;
    onReset: () => void;
    easyMode: boolean;
    setEasyMode: (mode: boolean) => void;
    mode: 'url' | 'qr' | 'sms' | 'voice' | 'email';
}

const getActionAdvice = (result: string, mode: string): { icon: React.ReactNode; title: string; items: string[] } => {
    if (result === 'safe') return {
        icon: <ShieldCheck size={22} className="text-emerald-600" />,
        title: '안심하셔도 됩니다',
        items: [
            '검사 결과 특별한 위험 요소가 발견되지 않았습니다.',
            '그래도 개인정보(비밀번호, 주민등록번호 등)를 요구하면 주의하세요.',
            '의심스러운 점이 있다면 언제든 다시 검사해보세요.',
        ]
    };
    if (result === 'suspicious') return {
        icon: <ShieldAlert size={22} className="text-amber-600" />,
        title: '이렇게 대처하세요',
        items: [
            '링크를 바로 클릭하지 마세요.',
            '개인정보나 금융정보를 절대 입력하지 마세요.',
            '발신자가 진짜인지 공식 연락처로 직접 확인하세요.',
            ...(mode === 'voice' ? ['통화를 즉시 종료하고 직접 해당 기관에 전화하세요.'] : []),
        ]
    };
    return {
        icon: <ShieldX size={22} className="text-rose-600" />,
        title: '지금 바로 이렇게 하세요!',
        items: [
            '절대 링크를 클릭하거나 첨부파일을 열지 마세요!',
            '개인정보·금융정보를 입력했다면 즉시 비밀번호를 변경하세요.',
            '금전 피해가 있다면 즉시 해당 은행에 지급정지를 요청하세요.',
            '해당 메시지나 이메일을 삭제하지 말고 증거로 보관하세요.',
            ...(mode === 'voice' ? ['녹음 파일이 있다면 증거로 보관하세요.'] : []),
        ]
    };
};

const getProbabilityLabel = (prob: number): { text: string; color: string; bgColor: string } => {
    if (prob > 0.8) return { text: '매우 위험', color: 'text-rose-700 dark:text-rose-400', bgColor: 'bg-rose-100 dark:bg-rose-900/50' };
    if (prob > 0.5) return { text: '위험', color: 'text-rose-600 dark:text-rose-400', bgColor: 'bg-rose-50 dark:bg-rose-900/30' };
    if (prob > 0.3) return { text: '주의 필요', color: 'text-amber-600 dark:text-amber-400', bgColor: 'bg-amber-50 dark:bg-amber-900/30' };
    return { text: '안전', color: 'text-emerald-600 dark:text-emerald-400', bgColor: 'bg-emerald-50 dark:bg-emerald-900/30' };
};

const ResultDisplay: React.FC<ResultDisplayProps> = ({ 
    result, resultData, isScanning, hasNetworkError, 
    setResult, setResultData, onReset, 
    easyMode, setEasyMode, mode 
}) => {
    const router = useRouter();
    const { data: session } = useSession();
    const hasPlayedRef = useRef(false);
    const [soundEnabled, setSoundEnabled] = useState<boolean | null>(null);

    useEffect(() => {
        if (!session?.user?.email) {
            setSoundEnabled(true);
            return;
        }
        fetch('/api/user/settings')
            .then(res => res.ok ? res.json() : null)
            .then(data => {
                setSoundEnabled(data?.sound_effects ?? true);
            })
            .catch(() => setSoundEnabled(true));
    }, [session]);

    useEffect(() => {
        if (!isScanning && !hasNetworkError && result && resultData && !hasPlayedRef.current && soundEnabled) {
            hasPlayedRef.current = true;
            try {
                const audio = new Audio('/done.mp3');
                audio.play().catch(() => {});
            } catch (e) {}
        }
        if (isScanning) {
            hasPlayedRef.current = false;
        }
    }, [isScanning, hasNetworkError, result, resultData, soundEnabled]);

    const handleAIChat = () => {
        const contextData = {
            ...resultData,
            scan_type: mode,
            result_type: result
        };
        sessionStorage.setItem('ai_chat_context', JSON.stringify(contextData));
        router.push('/ai-chat');
    };

    if (isScanning || hasNetworkError || !result || !resultData) return null;

    const advice = getActionAdvice(result, mode);

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
        >
            <div className="bg-white dark:bg-neutral-900 rounded-2xl shadow-lg border border-neutral-100 dark:border-neutral-800 p-6 md:p-8 relative overflow-hidden">
                <div className={`absolute top-0 left-0 w-full h-2 ${result === 'safe' ? 'bg-emerald-500' : result === 'suspicious' ? 'bg-amber-500' : 'bg-rose-500'}`}></div>
                
                <div className="flex flex-col md:flex-row gap-6 md:gap-8 items-center">
                    {(resultData.final_trust_score !== undefined) ? (
                        <div className="relative flex-shrink-0">
                             <svg className="w-28 h-28 md:w-32 md:h-32" viewBox="0 0 160 160">
                                <circle cx="80" cy="80" r="70" stroke="currentColor" strokeWidth="10" fill="none" className="text-neutral-100 dark:text-neutral-800" transform="rotate(-90 80 80)" />
                                <motion.circle
                                    cx="80" cy="80" r="70" stroke="currentColor" strokeWidth="10" fill="none"
                                    strokeDasharray={`${2 * Math.PI * 70}`}
                                    strokeDashoffset={`${2 * Math.PI * 70 * (1 - resultData.final_trust_score / 100)}`}
                                    className={result === 'safe' ? 'text-emerald-500' : result === 'suspicious' ? 'text-amber-500' : 'text-rose-500'}
                                    initial={{ strokeDashoffset: 2 * Math.PI * 70 }}
                                    animate={{ strokeDashoffset: 2 * Math.PI * 70 * (1 - resultData.final_trust_score / 100) }}
                                    transition={{ duration: 1.5, ease: "easeOut" }}
                                    strokeLinecap="round"
                                    transform="rotate(-90 80 80)"
                                />
                            </svg>
                            <div className="absolute inset-0 flex items-center justify-center flex-col">
                                {easyMode ? (
                                    <>
                                        <span className={`text-2xl md:text-3xl font-bold ${
                                            result === 'safe' ? 'text-emerald-600' : result === 'suspicious' ? 'text-amber-600' : 'text-rose-600'
                                        }`}>
                                            {resultData.final_trust_score >= 70 ? '안전' : resultData.final_trust_score >= 40 ? '주의' : '위험'}
                                        </span>
                                        <span className="text-xs text-neutral-500">{resultData.final_trust_score}점</span>
                                    </>
                                ) : (
                                    <>
                                        <span className="text-3xl md:text-4xl font-bold text-neutral-900 dark:text-white">
                                            {resultData.final_trust_score}
                                        </span>
                                        <span className="text-xs text-neutral-500">신뢰도</span>
                                    </>
                                )}
                            </div>
                        </div>
                    ) : (
                         <div className={`w-24 h-24 md:w-28 md:h-28 rounded-full flex items-center justify-center border-4 
                            ${result === 'safe' ? 'border-emerald-100 bg-emerald-50 text-emerald-600 dark:border-emerald-900 dark:bg-emerald-950' : result === 'suspicious' ? 'border-amber-100 bg-amber-50 text-amber-600 dark:border-amber-900 dark:bg-amber-950' : 'border-rose-100 bg-rose-50 text-rose-600 dark:border-rose-900 dark:bg-rose-950'}`}>
                                {result === 'safe'
                                    ? <CheckCircle size={40} />
                                    : (result === 'suspicious' ? <AlertTriangle size={40} /> : <Siren size={40} className="animate-pulse" />)
                                }
                        </div>
                    )}

                    <div className="flex-1 text-center md:text-left">
                        <h3 className="text-xl md:text-3xl font-bold text-neutral-900 dark:text-neutral-100 mb-3">
                            {result === 'safe' ? '✅ 안전한 것으로 판단됨' : result === 'suspicious' ? '⚠️ 주의가 필요합니다' : '🚨 위험 요소가 발견됨!'}
                        </h3>
                        <p className="text-sm md:text-base text-neutral-600 dark:text-neutral-300 mb-6 leading-relaxed">
                            {resultData.message || (resultData.ai_analysis?.reason) || '분석이 완료되었습니다.'}
                        </p>

                        <div className="flex flex-wrap gap-3 justify-center md:justify-start">
                            <button 
                                onClick={onReset}
                                className="px-5 py-2.5 bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-200 rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
                            >
                                <Scan size={16} />
                                새로 검사하기
                            </button>
                            <button 
                                onClick={handleAIChat}
                                className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
                            >
                                <MessageSquare size={16} />
                                AI와 채팅하기
                            </button>
                            {(result === 'suspicious' || result === 'danger') && (
                                <button 
                                    onClick={() => router.push('/experts')} 
                                    className="px-5 py-2.5 bg-neutral-900 hover:bg-neutral-800 text-white dark:bg-neutral-100 dark:hover:bg-neutral-200 dark:text-neutral-900 rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
                                >
                                    <UserCheck size={16} />
                                    전문가와 상담하기
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            <SummarySection 
                easySummary={resultData.easy_summary}
                expertSummary={resultData.expert_summary}
                easyMode={easyMode}
            />

            <div className="flex justify-center mb-6">
                <div className="bg-neutral-100 dark:bg-neutral-800 rounded-xl p-1 flex gap-1">
                    <button
                        onClick={() => setEasyMode(true)}
                        className={`px-5 py-2.5 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${
                            easyMode 
                                ? 'bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white shadow-sm' 
                                : 'text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300'
                        }`}
                    >
                        😊 쉽게 보기
                    </button>
                    <button
                        onClick={() => setEasyMode(false)}
                        className={`px-5 py-2.5 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${
                            !easyMode 
                                ? 'bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white shadow-sm' 
                                : 'text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300'
                        }`}
                    >
                        🔬 전문가 보기
                    </button>
                </div>
            </div>

            <AnimatePresence mode="wait">
            <motion.div key={easyMode ? 'easy' : 'expert'} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.25 }}>
            
            {easyMode && (
                <div className={`rounded-2xl border-2 p-6 mb-6 ${
                    result === 'safe' 
                        ? 'border-emerald-200 bg-emerald-50/50 dark:border-emerald-800 dark:bg-emerald-950/20' 
                        : result === 'suspicious' 
                        ? 'border-amber-200 bg-amber-50/50 dark:border-amber-800 dark:bg-amber-950/20' 
                        : 'border-rose-200 bg-rose-50/50 dark:border-rose-800 dark:bg-rose-950/20'
                }`}>
                    <div className="flex items-center gap-3 mb-4">
                        {advice.icon}
                        <h3 className="text-lg font-bold text-neutral-900 dark:text-neutral-100">{advice.title}</h3>
                    </div>
                    <ul className="space-y-3">
                        {advice.items.map((item, idx) => (
                            <li key={idx} className="flex items-start gap-3 text-sm text-neutral-700 dark:text-neutral-300">
                                <span className={`mt-0.5 flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold text-white ${
                                    result === 'safe' ? 'bg-emerald-500' : result === 'suspicious' ? 'bg-amber-500' : 'bg-rose-500'
                                }`}>{idx + 1}</span>
                                <span className="leading-relaxed">{item}</span>
                            </li>
                        ))}
                    </ul>
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

                {(resultData.text || (mode === 'sms' && resultData.text) || (mode === 'qr' && resultData.qr_data)) && (
                    <div className="bg-white dark:bg-neutral-900 rounded-xl shadow-md border border-neutral-100 dark:border-neutral-800 p-5 md:col-span-2">
                        <div className="flex items-center gap-2 mb-4">
                            <FileText size={20} className="text-neutral-600" />
                            <h4 className="font-bold text-neutral-900 dark:text-neutral-100">
                                {easyMode 
                                    ? (mode === 'voice' ? '🎤 변환된 음성 내용' : mode === 'sms' ? '💬 검사한 문자 내용' : mode === 'qr' ? '📱 QR 코드 내용' : '📄 검사한 내용')
                                    : (mode === 'voice' ? '음성 변환 텍스트 (STT)' : mode === 'sms' ? 'SMS 원문 텍스트' : mode === 'qr' ? 'QR 코드 디코딩 데이터' : '분석 대상 원문')
                                }
                            </h4>
                        </div>
                        <div className={`p-4 bg-neutral-50 dark:bg-neutral-800 rounded-lg overflow-y-auto ${easyMode ? 'max-h-32' : 'max-h-60'}`}>
                            <p className="text-sm text-neutral-700 dark:text-neutral-300 whitespace-pre-wrap break-all">
                                {resultData.text || resultData.qr_data}
                            </p>
                        </div>
                        {mode === 'qr' && resultData.content_comparison && (
                            <div className={`mt-4 p-4 rounded-lg border ${resultData.content_comparison.matches ? 'bg-emerald-50 border-emerald-100 dark:bg-emerald-950/30 dark:border-emerald-900' : 'bg-rose-50 border-rose-100 dark:bg-rose-950/30 dark:border-rose-900'}`}>
                                <h5 className={`font-bold text-sm mb-2 flex items-center gap-2 ${resultData.content_comparison.matches ? 'text-emerald-700 dark:text-emerald-400' : 'text-rose-700 dark:text-rose-400'}`}>
                                    {resultData.content_comparison.matches ? <CheckCircle size={16} /> : <AlertTriangle size={16} />}
                                    {easyMode 
                                        ? (resultData.content_comparison.matches ? '✅ 예상했던 내용과 같아요' : '⚠️ 예상했던 내용과 달라요!')
                                        : (resultData.content_comparison.matches ? '예상 목적과 일치' : '예상 목적과 불일치')
                                    }
                                </h5>
                                <p className="text-sm text-neutral-600 dark:text-neutral-300">
                                    {resultData.content_comparison.reason || resultData.content_comparison.message}
                                </p>
                                {resultData.expected_text && (
                                    <div className="mt-2 text-xs text-neutral-500">
                                        <span className="font-semibold">입력한 목적:</span> {resultData.expected_text}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                )}

                {mode === 'sms' && resultData.steps?.step1 && (
                    <div className="bg-white dark:bg-neutral-900 rounded-xl shadow-md border border-neutral-100 dark:border-neutral-800 p-5">
                        <div className="flex items-center gap-2 mb-4">
                            <Activity size={20} className="text-purple-600" />
                            <h4 className="font-bold text-neutral-900 dark:text-neutral-100">
                                {easyMode ? '🤖 AI가 문자를 분석했어요' : 'SMS 머신러닝(ML) 분석'}
                            </h4>
                        </div>

                        {easyMode ? (
                            <div className="space-y-4">
                                {(() => {
                                    const prob = resultData.steps.step1.phishing_probability || 0;
                                    const label = getProbabilityLabel(prob);
                                    return (
                                        <div className={`p-4 rounded-xl ${label.bgColor}`}>
                                            <div className="flex items-center justify-between mb-2">
                                                <span className="text-sm font-medium text-neutral-600 dark:text-neutral-400">AI 판단 결과</span>
                                                <span className={`text-lg font-bold ${label.color}`}>{label.text}</span>
                                            </div>
                                            <div className="w-full h-3 bg-white/60 dark:bg-neutral-700 rounded-full overflow-hidden">
                                                <motion.div 
                                                    className={`h-full rounded-full ${
                                                        prob > 0.7 ? 'bg-rose-500' : prob > 0.4 ? 'bg-amber-500' : 'bg-emerald-500'
                                                    }`}
                                                    initial={{ width: 0 }}
                                                    animate={{ width: `${prob * 100}%` }}
                                                    transition={{ duration: 1, ease: "easeOut" }}
                                                />
                                            </div>
                                            <p className="mt-2 text-xs text-neutral-500 dark:text-neutral-400">
                                                {prob > 0.7 ? '이 문자는 피싱일 가능성이 매우 높습니다.' 
                                                    : prob > 0.4 ? '이 문자에 피싱 의심 패턴이 일부 감지되었습니다.' 
                                                    : '이 문자에서 피싱 패턴이 감지되지 않았습니다.'}
                                            </p>
                                        </div>
                                    );
                                })()}
                                {resultData.steps?.step2 && resultData.steps.step2.ai_confidence !== undefined && (
                                    <div className="flex items-center gap-3 p-3 rounded-lg bg-indigo-50 dark:bg-indigo-950/30">
                                        <Shield size={18} className="text-indigo-600 flex-shrink-0" />
                                        <p className="text-sm text-neutral-700 dark:text-neutral-300">
                                            AI 검증 결과: <span className={`font-bold ${resultData.steps.step2.is_phishing ? 'text-rose-600' : 'text-emerald-600'}`}>
                                                {resultData.steps.step2.is_phishing ? '피싱으로 판단됨' : '정상으로 판단됨'}
                                            </span>
                                        </p>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="space-y-3 text-sm">
                                <div>
                                    <div className="flex justify-between mb-1">
                                        <span className="text-neutral-500">피싱 확률 (Phishing Probability)</span>
                                        <span className={`font-bold font-mono ${
                                            (resultData.steps.step1.phishing_probability || 0) > 0.5 ? 'text-rose-600' : 'text-emerald-600'
                                        }`}>
                                            {((resultData.steps.step1.phishing_probability || 0) * 100).toFixed(4)}%
                                        </span>
                                    </div>
                                    <div className="w-full h-2 bg-neutral-100 dark:bg-neutral-700 rounded-full overflow-hidden">
                                        <div 
                                            className={`h-full rounded-full transition-all duration-500 ${
                                                (resultData.steps.step1.phishing_probability || 0) > 0.7 ? 'bg-rose-500' :
                                                (resultData.steps.step1.phishing_probability || 0) > 0.4 ? 'bg-amber-500' : 'bg-emerald-500'
                                            }`}
                                            style={{ width: `${(resultData.steps.step1.phishing_probability || 0) * 100}%` }}
                                        />
                                    </div>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-neutral-500">사용 모델 (Model)</span>
                                    <span className="font-mono text-xs text-neutral-600 dark:text-neutral-400">
                                        {resultData.steps.step1.model === 'ko_model' ? 'KoBERT (한국어)' : 'RoBERTa (영어)'}
                                    </span>
                                </div>
                                {resultData.steps.step1.penalty > 0 && (
                                    <div className="flex justify-between">
                                        <span className="text-neutral-500">신뢰도 감점 (Penalty)</span>
                                        <span className="text-rose-600 font-bold font-mono">-{resultData.steps.step1.penalty}점</span>
                                    </div>
                                )}
                                {resultData.steps?.step2 && resultData.steps.step2.ai_confidence !== undefined && (
                                    <div className="mt-4 pt-4 border-t border-neutral-100 dark:border-neutral-700">
                                        <div className="flex items-center gap-2 mb-3">
                                            <Shield size={16} className="text-indigo-600" />
                                            <span className="font-bold text-sm text-neutral-900 dark:text-neutral-100">AI 교차 검증 (Cross-validation)</span>
                                        </div>
                                        <div className="space-y-2 text-sm">
                                            <div className="flex justify-between">
                                                <span className="text-neutral-500">검증 신뢰도 (Confidence)</span>
                                                <span className="font-bold font-mono text-neutral-800 dark:text-neutral-200">
                                                    {(resultData.steps.step2.ai_confidence * 100).toFixed(2)}%
                                                </span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-neutral-500">판정 (Verdict)</span>
                                                <span className={resultData.steps.step2.is_phishing ? 'text-rose-600 font-bold' : 'text-emerald-600 font-bold'}>
                                                    {resultData.steps.step2.is_phishing ? 'PHISHING' : 'LEGITIMATE'}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                )}

                {(resultData.threat_types?.length > 0 || resultData.risk_factors?.length > 0) && (
                    <div className="bg-white dark:bg-neutral-900 rounded-xl shadow-md border border-neutral-100 dark:border-neutral-800 p-5">
                        <div className="flex items-center gap-2 mb-4">
                            <AlertTriangle size={20} className="text-amber-600" />
                            <h4 className="font-bold text-neutral-900 dark:text-neutral-100">
                                {easyMode ? '⚠️ 이런 위험이 발견되었어요' : '탐지된 위협 유형 및 위험 요소'}
                            </h4>
                        </div>
                        {easyMode ? (
                            <div className="space-y-3">
                                {resultData.threat_types?.map((threat: string, idx: number) => (
                                    <div key={`threat-${idx}`} className="flex items-start gap-3 p-3 bg-rose-50 dark:bg-rose-950/40 rounded-xl border border-rose-100 dark:border-rose-900">
                                        <Siren size={18} className="text-rose-500 mt-0.5 flex-shrink-0" />
                                        <span className="text-sm text-rose-800 dark:text-rose-300 font-medium">{threat}</span>
                                    </div>
                                ))}
                                {resultData.risk_factors?.map((factor: string, idx: number) => (
                                    <div key={`risk-${idx}`} className="flex items-start gap-3 p-3 bg-amber-50 dark:bg-amber-950/40 rounded-xl border border-amber-100 dark:border-amber-900">
                                        <AlertTriangle size={18} className="text-amber-500 mt-0.5 flex-shrink-0" />
                                        <span className="text-sm text-amber-800 dark:text-amber-300">{factor}</span>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="space-y-2">
                                {resultData.threat_types?.map((threat: string, idx: number) => (
                                    <div key={`threat-${idx}`} className="flex items-center gap-2 p-2 bg-rose-50 dark:bg-rose-950 rounded text-rose-700 dark:text-rose-400 text-sm font-bold font-mono">
                                        <Siren size={14} />
                                        THREAT: {threat}
                                    </div>
                                ))}
                                {resultData.risk_factors?.map((factor: string, idx: number) => (
                                    <div key={`risk-${idx}`} className="flex items-center gap-2 p-2 bg-amber-50 dark:bg-amber-950 rounded text-amber-700 dark:text-amber-400 text-sm font-mono">
                                        <AlertTriangle size={14} />
                                        RISK: {factor}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}
                
                {mode !== 'url' && (resultData.steps?.step2?.ai_analysis || resultData.ai_analysis || (resultData.steps?.ai_analysis)) && (
                    <div className="bg-white dark:bg-neutral-900 rounded-xl shadow-md border border-neutral-100 dark:border-neutral-800 p-5 md:col-span-2">
                       <div className="flex items-center gap-2 mb-4">
                           <Server size={20} className="text-indigo-600" />
                           <h4 className="font-bold text-neutral-900 dark:text-neutral-100">
                               {easyMode ? '🧠 AI가 내린 결론' : 'AI 심층 분석 (LLM Analysis)'}
                           </h4>
                       </div>
                       
                       {(() => {
                           const analysis = resultData.ai_analysis || resultData.steps?.step2?.ai_analysis || resultData.steps?.ai_analysis || resultData.phishing_analysis;
                           if (!analysis) return null;

                           return easyMode ? (
                               <div className="space-y-3">
                                   <div className={`p-5 rounded-xl ${
                                       (analysis.risk_level === 'high' || analysis.status === 'DANGER') ? 'bg-rose-50 dark:bg-rose-950/30 border border-rose-100 dark:border-rose-900' :
                                       (analysis.risk_level === 'medium' || analysis.status === 'WARNING') ? 'bg-amber-50 dark:bg-amber-950/30 border border-amber-100 dark:border-amber-900' :
                                       'bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-100 dark:border-emerald-900'
                                   }`}>
                                       <p className="text-sm text-neutral-800 dark:text-neutral-200 leading-relaxed">
                                           {analysis.reason || analysis.message}
                                       </p>
                                   </div>
                               </div>
                           ) : (
                               <div className="space-y-4">
                                   <div className="p-4 bg-indigo-50 dark:bg-indigo-950/30 rounded-lg border border-indigo-100 dark:border-indigo-900">
                                       <p className="text-sm text-neutral-800 dark:text-neutral-200 leading-relaxed font-mono">
                                           &quot;{analysis.reason || analysis.message}&quot;
                                       </p>
                                   </div>
                                   <div className="flex flex-wrap gap-4 text-sm">
                                       {analysis.risk_level && (
                                           <div className="flex items-center gap-2">
                                               <span className="text-neutral-500">Risk Level:</span>
                                               <span className={`px-2 py-0.5 rounded font-bold uppercase font-mono ${
                                                   (analysis.risk_level === 'high' || analysis.status === 'DANGER') ? 'bg-rose-100 text-rose-700 dark:bg-rose-900 dark:text-rose-300' :
                                                   (analysis.risk_level === 'medium' || analysis.status === 'WARNING') ? 'bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300' :
                                                   'bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300'
                                               }`}>
                                                   {analysis.risk_level || analysis.status}
                                               </span>
                                           </div>
                                       )}
                                       {analysis.confidence !== undefined && (
                                           <div className="flex items-center gap-2">
                                               <span className="text-neutral-500">Confidence:</span>
                                               <span className="font-mono font-bold text-neutral-700 dark:text-neutral-300">
                                                   {analysis.confidence > 1 ? analysis.confidence : (analysis.confidence * 100).toFixed(2)}%
                                               </span>
                                           </div>
                                       )}
                                       {analysis.status && (
                                           <div className="flex items-center gap-2">
                                               <span className="text-neutral-500">Status:</span>
                                               <span className="font-mono font-bold text-neutral-700 dark:text-neutral-300">{analysis.status}</span>
                                           </div>
                                       )}
                                   </div>
                               </div>
                           );
                       })()}
                   </div>
               )}
            </div>

            
            <div className="flex flex-col gap-6 w-full">
                {(() => {
                    let urlResults: any[] = [];
                    let sectionTitle = easyMode ? '🔗 발견된 링크 정밀 분석' : '포함된 URL 정밀 분석 (Multi-step Pipeline)';

                    if (mode === 'url') {
                        urlResults = [resultData]; 
                        sectionTitle = '';
                    } else if (mode === 'sms') {
                        urlResults = resultData.steps?.step3?.url_analysis_results || [];
                    } else if (mode === 'email') {
                        urlResults = resultData.url_analysis ? resultData.url_analysis.map((item: any) => item.result || item) : [];
                    } else if (mode === 'qr') {
                        if (resultData.url_analysis) {
                            urlResults = [resultData.url_analysis];
                        }
                    }

                    if (urlResults.length === 0) return null;

                    return (
                        <div className={mode === 'url' ? "w-full" : "mt-8 space-y-6"}>
                            {sectionTitle && (
                                <div className="flex items-center gap-2 pb-2 border-b border-neutral-200 dark:border-neutral-700">
                                    <Globe size={24} className="text-blue-600" />
                                    <h3 className="text-xl font-bold text-neutral-900 dark:text-neutral-100">
                                        {sectionTitle}
                                    </h3>
                                </div>
                            )}

                            {urlResults.map((urlRes: any, idx: number) => (
                                <div key={idx} className={mode === 'url' ? "" : "p-4 md:p-6 bg-neutral-50 dark:bg-neutral-800/50 rounded-2xl border border-neutral-200 dark:border-neutral-700"}>
                                    <UrlAnalysisDetail 
                                        resultData={urlRes} 
                                        easyMode={easyMode} 
                                        index={mode === 'url' ? undefined : idx} 
                                    />
                                </div>
                            ))}
                        </div>
                    );
                })()}
            </div>
            
            {mode === 'email' && (
                <div className="hidden">
                     <EmailResult resultData={resultData} easyMode={easyMode} />
                </div>
            )}

            </motion.div>
            </AnimatePresence>
            
        </motion.div>
    );
};

export default ResultDisplay;
