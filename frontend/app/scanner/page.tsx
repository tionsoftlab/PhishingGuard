"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, Server } from 'lucide-react';
import { useSession } from 'next-auth/react';

import ScannerTabs from '@/components/scanner/ScannerTabs';
import UrlInspector from '@/components/scanner/inspectors/UrlInspector';
import SmsInspector from '@/components/scanner/inspectors/SmsInspector';
import VoiceInspector from '@/components/scanner/inspectors/VoiceInspector';
import EmailInspector from '@/components/scanner/inspectors/EmailInspector';
import QrInspector from '@/components/scanner/inspectors/QrInspector';
import ResultDisplay from '@/components/scanner/results/ResultDisplay';
import ConsentModal from '@/components/ConsentModal';
import { APIResult } from '@/types';

const getOrCreateSessionId = (): string => {
    if (typeof window === 'undefined') return '';
    let sessionId = localStorage.getItem('tos_session_id');
    if (!sessionId) {
        sessionId = crypto.randomUUID();
        localStorage.setItem('tos_session_id', sessionId);
    }
    return sessionId;
};

const Scanner: React.FC = () => {
    const { data: session } = useSession();
    const [mode, setMode] = useState<'url' | 'qr' | 'sms' | 'voice' | 'email'>('sms');
    const [url, setUrl] = useState('');
    const [smsText, setSmsText] = useState('');
    const [emailText, setEmailText] = useState('');
    const [voiceFile, setVoiceFile] = useState<File | null>(null);
    const [isScanning, setIsScanning] = useState(false);
    const [loadingProgress, setLoadingProgress] = useState(0);
    const [loadingStep, setLoadingStep] = useState(0);
    const [result, setResult] = useState<'safe' | 'danger' | 'suspicious' | null>(null);
    const [resultData, setResultData] = useState<APIResult | null>(null);
    const [hasNetworkError, setHasNetworkError] = useState(false);
    const [easyMode, setEasyMode] = useState(true);
    
    const [hasConsented, setHasConsented] = useState(false);
    const [showConsentModal, setShowConsentModal] = useState(false);
    const [pendingScan, setPendingScan] = useState<(() => void) | null>(null);

    useEffect(() => {
        const checkConsent = async () => {
            const localConsent = localStorage.getItem('tos_consented');
            if (localConsent === 'true') {
                setHasConsented(true);
                return;
            }

            if (session?.user?.email) {
                try {
                    const res = await fetch(`https://cslab.kku.ac.kr:8088/api/tos/status?user_email=${encodeURIComponent(session.user.email)}`);
                    const data = await res.json();
                    if (data.consented) {
                        setHasConsented(true);
                        localStorage.setItem('tos_consented', 'true');
                        return;
                    }
                } catch (e) {
                    console.error('TOS status check failed:', e);
                }
            }

            const sessionId = getOrCreateSessionId();
            try {
                const res = await fetch(`https://cslab.kku.ac.kr:8088/api/tos/status?session_id=${sessionId}`);
                const data = await res.json();
                if (data.consented) {
                    setHasConsented(true);
                    localStorage.setItem('tos_consented', 'true');
                }
            } catch (e) {
                console.error('TOS status check failed:', e);
            }
        };
        checkConsent();
    }, [session]);

    const recordConsent = useCallback(async () => {
        const sessionId = getOrCreateSessionId();
        try {
            await fetch('https://cslab.kku.ac.kr:8088/api/tos/agree', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    user_email: session?.user?.email || null,
                    session_id: sessionId,
                }),
            });
        } catch (e) {
            console.error('TOS consent recording failed:', e);
        }
        localStorage.setItem('tos_consented', 'true');
        setHasConsented(true);
        setShowConsentModal(false);
    }, [session]);

    const handleConsentAndProceed = useCallback(() => {
        recordConsent().then(() => {
            if (pendingScan) {
                pendingScan();
                setPendingScan(null);
            }
        });
    }, [recordConsent, pendingScan]);

    const requireConsent = (scanFn: () => void): boolean => {
        if (hasConsented) return true;
        setPendingScan(() => scanFn);
        setShowConsentModal(true);
        return false;
    };

    const loadingSteps = mode === 'url' 
        ? ['URL 검증 중...', '리다이렉션 추적 중...', 'AI 위협 분석 중...', 'SSL 인증서 확인 중...', '최종 결과 생성 중...']
        : mode === 'qr'
        ? ['QR 코드 분석 중...', '컨텐츠 확인 중...', 'AI 위협 분석 중...', '최종 결과 생성 중...']
        : mode === 'voice'
        ? ['음성 파일 업로드 중...', '음성 텍스트 변환(STT) 중...', '보이스피싱 패턴 분석 중...', '최종 판정 중...']
        : mode === 'email'
        ? ['이메일 헤더 분석 중...', '발신 경로 추적 중...', '본문 위협 탐지 중...', '최종 판정 중...']
        : ['문자 텍스트 분석 중...', 'URL 패턴 검사 중...', 'AI 스미싱 탐지 중...', '최종 판정 중...'];

    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const tab = params.get('tab');
        if (tab === 'sms' || tab === 'qr' || tab === 'url' || tab === 'voice' || tab === 'email') {
            setMode(tab as any);
        }
    }, []);

    useEffect(() => {
        setResult(null);
        setIsScanning(false);
        setResultData(null);
        setLoadingProgress(0);
        setLoadingStep(0);
        setHasNetworkError(false);
    }, [mode]);

    const startUrlScan = async () => {
        if (!url) return;
        if (!requireConsent(startUrlScan)) return;

        setIsScanning(true);
        setLoadingProgress(10);
        setLoadingStep(0);
        setHasNetworkError(false);

        try {
            const steps = [10, 30, 50, 70, 90];
            let currentStep = 0;
            const interval = setInterval(() => {
                if (currentStep < steps.length) {
                    setLoadingStep(currentStep);
                    setLoadingProgress(steps[currentStep]);
                    currentStep++;
                }
            }, 800);

            const response = await fetch('https://cslab.kku.ac.kr:8088/api/check/url/', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    url, 
                    language: 'ko',
                    user_email: session?.user?.email 
                })
            });

            clearInterval(interval);

            if (!response.ok) {
                setHasNetworkError(true);
                setIsScanning(false);
                setResultData({ message: '서버 연결 오류가 발생했습니다.' });
                return;
            }

            const data: APIResult = await response.json();
            setLoadingStep(4);
            setLoadingProgress(100);
            setResultData(data);
            setIsScanning(false);

            if (data.final_status === 'DANGER') setResult('danger');
            else if (data.final_status === 'SUSPICIOUS' || data.final_status === 'WARNING') setResult('suspicious');
            else setResult('safe');

        } catch (error) {
            console.error('URL scan error:', error);
            setIsScanning(false);
            setHasNetworkError(true);
            setResultData({ message: '서버에 연결할 수 없습니다. 잠시 후 다시 시도해주세요.' });
        }
    };

    const startSmsScan = async () => {
        if (!smsText) return;
        if (!requireConsent(startSmsScan)) return;

        setIsScanning(true);
        setLoadingProgress(10);
        setLoadingStep(0);
        setHasNetworkError(false);

        try {
            const steps = [20, 40, 60, 80];
            let currentStep = 0;
            const interval = setInterval(() => {
                if (currentStep < steps.length) {
                    setLoadingStep(currentStep);
                    setLoadingProgress(steps[currentStep]);
                    currentStep++;
                }
            }, 600);

            const response = await fetch('https://cslab.kku.ac.kr:8088/api/check/sms/', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    text: smsText, 
                    language: 'ko',
                    user_email: session?.user?.email 
                })
            });

            clearInterval(interval);

            if (!response.ok) throw new Error('Network response was not ok');

            const data: APIResult = await response.json();
            setLoadingStep(3);
            setLoadingProgress(100);
            setResultData(data);
            setIsScanning(false);

            if (data.final_trust_score !== undefined) {
                if (data.final_trust_score < 40) setResult('danger');
                else if (data.final_trust_score < 70) setResult('suspicious');
                else setResult('safe');
            } else {
                 if (data.final_status === 'DANGER') setResult('danger');
                 else if (data.final_status === 'SUSPICIOUS') setResult('suspicious');
                 else setResult('safe');
            }

        } catch (error) {
            console.error('SMS scan error:', error);
            setIsScanning(false);
            setHasNetworkError(true);
            setResultData({ message: '서버에 연결할 수 없습니다. 잠시 후 다시 시도해주세요.' });
        }
    };

    const startVoiceScan = async () => {
        if (!voiceFile) return;
        if (!requireConsent(startVoiceScan)) return;

        setIsScanning(true);
        setLoadingProgress(10);
        setLoadingStep(0);
        setHasNetworkError(false);

        const formData = new FormData();
        formData.append('file', voiceFile);
        if (session?.user?.email) {
            formData.append('user_email', session.user.email);
        }

        try {
            setLoadingStep(1);
            setLoadingProgress(30);

            const response = await fetch('https://cslab.kku.ac.kr:8088/api/check/voice/', {
                method: 'POST',
                body: formData
            });

            setLoadingStep(2);
            setLoadingProgress(70);

            const data: APIResult = await response.json();
            
            setLoadingStep(3);
            setLoadingProgress(100);
            setResultData(data);
            setIsScanning(false);

            if (data.status === 'DANGER' || data.final_status === 'DANGER') {
                setResult('danger');
            } else if (data.status === 'WARNING' || data.status === 'SUSPICIOUS' || data.final_status === 'WARNING') {
                setResult('suspicious');
            } else {
                setResult('safe');
            }
            
        } catch (error) {
            console.error('Voice scan error:', error);
            setIsScanning(false);
            setHasNetworkError(true);
            setResultData({ message: '서버에 연결할 수 없습니다. 잠시 후 다시 시도해주세요.' });
        }
    };

    const startEmailScan = async () => {
         if (!emailText) return;
         if (!requireConsent(startEmailScan)) return;

        setIsScanning(true);
        setLoadingProgress(10);
        setLoadingStep(0);
        setHasNetworkError(false);

        try {
            const steps = [20, 40, 60, 80];
            let currentStep = 0;
            const interval = setInterval(() => {
                if (currentStep < steps.length) {
                    setLoadingStep(currentStep);
                    setLoadingProgress(steps[currentStep]);
                    currentStep++;
                }
            }, 600);

            const response = await fetch('https://cslab.kku.ac.kr:8088/api/check/email/', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ text: emailText, user_email: session?.user?.email })
            });

             clearInterval(interval);

            const data: APIResult = await response.json();
            setLoadingStep(3);
            setLoadingProgress(100);
            setResultData(data);
            setIsScanning(false);

            if (data.final_status === 'DANGER' || data.status === 'DANGER') setResult('danger');
            else if (data.final_status === 'SUSPICIOUS' || data.status === 'SUSPICIOUS') setResult('suspicious');
            else setResult('safe');

        } catch (error) {
             console.error('Email scan error:', error);
            setIsScanning(false);
            setHasNetworkError(true);
            setResultData({ message: '서버에 연결할 수 없습니다. 잠시 후 다시 시도해주세요.' });
        }
    };

    const startQRAnalysis = async (qrData: string, qrCapturedImage: string, expectedText: string, skipComparison: boolean, typeNumber: number) => {
        const doScan = () => startQRAnalysis(qrData, qrCapturedImage, expectedText, skipComparison, typeNumber);
        if (!requireConsent(doScan)) return;
        setIsScanning(true);
        setLoadingProgress(10);
        setLoadingStep(0);
        setHasNetworkError(false);

        try {
            setLoadingStep(1);
            setLoadingProgress(30);

            const response = await fetch('https://cslab.kku.ac.kr:8088/api/check/qr/', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    image: qrCapturedImage,
                    qr_data: qrData,
                    type_number: typeNumber,
                    text: skipComparison ? '' : expectedText,
                    skip_comparison: skipComparison,
                    user_email: session?.user?.email
                })
            });

            if (!response.ok) throw new Error('Network response was not ok');

            const data: APIResult = await response.json();
            
            setLoadingStep(3);
            setLoadingProgress(100);
            setResultData(data);
            setIsScanning(false);

            const status = data.final_status || data.status;
            if (status === 'DANGER') setResult('danger');
            else if (status === 'SUSPICIOUS' || status === 'WARNING') setResult('suspicious');
            else setResult('safe');

        } catch (error) {
            console.error('QR scan error:', error);
            setIsScanning(false);
            setHasNetworkError(true);
            setResultData({ message: '서버에 연결할 수 없습니다. 잠시 후 다시 시도해주세요.' });
        }
    };

    const loadDemoData = async () => {
        if (mode === 'url') {
            setUrl('https://discord.tionlab.software/?gift=PZ76qKbfX8G8hjTKUKYjZntk&num=1');
        } else if (mode === 'sms') {
            setSmsText('선착순 10명 한정! 디스코드 니트로 무료나눔 합니다!!! 늦지말고 빨리 받아가세요! https://discord.tionlab.software/?gift=PZ76qKbfX8G8hjTKUKYjZntk&num=10');
        } else if (mode === 'email') {
            setEmailText(`Delivered-To: victim@example.com
Received: by 2002:a05:7000:1a01:b0:43c:6d3e:7f89 with SMTP id ...
Return-Path: <security-alert@google-support-team.com>
Subject: [긴급] 귀하의 Google 계정이 위험합니다.

안녕하세요,
귀하의 계정에서 비정상적인 로그인 시도가 감지되었습니다.
즉시 아래 링크를 클릭하여 본인 인증을 완료해주세요.

http://a.to/23bAmWY

감사합니다.
Google 보안 팀`);
        } else if (mode === 'qr') {
            if ((window as any).__qrLoadTestData) {
                (window as any).__qrLoadTestData();
            } else {
                alert('QR 테스트 기능을 불러올 수 없습니다. 페이지를 새로고침해주세요.');
            }
        } else if (mode === 'voice') {
            try {
                const response = await fetch('/test/voice.mp3');
                if (!response.ok) throw new Error('테스트 파일을 찾을 수 없습니다.');
                const blob = await response.blob();
                const file = new File([blob], "voice.mp3", { type: "audio/mpeg" });
                setVoiceFile(file);
            } catch (e) {
                console.error(e);
                alert('테스트 파일을 불러오는데 실패했습니다.');
            }
        }
    };

    return (
        <div className="max-w-6xl mx-auto h-full flex flex-col pb-20 md:pb-20 p-4 md:p-8">
            <div className="mb-6 md:mb-8 text-center">
                <h2 className="text-2xl md:text-3xl font-bold text-neutral-900 dark:text-neutral-100 mb-2">통합 보안 검사</h2>
                <p className="text-sm md:text-base text-neutral-500 dark:text-neutral-400">URL, QR 코드, 문자 메시지의 위협 요소를 AI로 정밀 분석합니다.</p>
            </div>

            {!result && !hasNetworkError && (
                <motion.div
                    initial={{ opacity: 1 }}
                    exit={{ opacity: 0, height: 0 }}
                    className="bg-white dark:bg-neutral-900 rounded-2xl shadow-xl border border-neutral-100 dark:border-neutral-800 overflow-visible mb-8"
                >
                    <ScannerTabs mode={mode} setMode={setMode} />

                    <div className="p-4 md:p-8 pt-24 md:pt-4 md:min-h-[240px] flex flex-col items-center justify-center max-h-[calc(100vh-300px)] md:max-h-none overflow-y-auto md:overflow-visible">
                        {!isScanning && (
                            <>
                                <AnimatePresence mode="wait">
                                    {mode === 'url' && <UrlInspector key="url" url={url} setUrl={setUrl} isScanning={isScanning} onScan={startUrlScan} />}
                                    {mode === 'sms' && <SmsInspector key="sms" smsText={smsText} setSmsText={setSmsText} isScanning={isScanning} onScan={startSmsScan} />}
                                    {mode === 'voice' && <VoiceInspector key="voice" voiceFile={voiceFile} setVoiceFile={setVoiceFile} isScanning={isScanning} onScan={startVoiceScan} />}
                                    {mode === 'email' && <EmailInspector key="email" emailText={emailText} setEmailText={setEmailText} isScanning={isScanning} onScan={startEmailScan} />}
                                    {mode === 'qr' && <QrInspector key="qr" isScanning={isScanning} onScan={startQRAnalysis} />}
                                </AnimatePresence>

                                <div className="mt-8 pt-6 border-t border-neutral-100 dark:border-neutral-800 w-full">
                                    <div className="flex flex-col items-center text-center">
                                        <p className="text-xs text-neutral-400 dark:text-neutral-500 mb-1">
                                            아래 버튼은 시연용입니다
                                        </p>
                                        <button
                                            onClick={loadDemoData}
                                            className="text-xs font-bold text-neutral-500 hover:text-neutral-800 dark:text-neutral-400 dark:hover:text-neutral-200 underline underline-offset-4 decoration-neutral-300 dark:decoration-neutral-600 transition-colors"
                                        >
                                            테스트 데이터로 진행하기
                                        </button>
                                        <p className="text-[10px] text-neutral-400 dark:text-neutral-600 mt-2 max-w-sm leading-relaxed">
                                            * 새로 검사하는게 아닌 DB에 저장된 이전 검사 데이터가 사용됩니다. 검사 과정 테스트가 필요한 경우, 별도의 테스트 데이터로 테스트 바랍니다.
                                        </p>
                                    </div>
                                </div>
                            </>
                        )}

                        {isScanning && (
                            <div className="py-12 flex flex-col items-center">
                                <Loader2 className="animate-spin text-indigo-600 mb-4" size={48} />
                                <h3 className="text-xl font-bold mb-2 text-neutral-900 dark:text-neutral-100">{loadingSteps[loadingStep]}</h3>
                                <div className="w-64 h-2 bg-neutral-200 dark:bg-neutral-700 rounded-full overflow-hidden">
                                    <motion.div
                                        className="h-full bg-indigo-600"
                                        initial={{ width: 0 }}
                                        animate={{ width: `${loadingProgress}%` }}
                                    />
                                </div>
                            </div>
                        )}
                    </div>
                </motion.div>
            )}

            {hasNetworkError && (
                 <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
                    <div className="bg-white dark:bg-neutral-900 rounded-2xl shadow-lg border border-neutral-100 dark:border-neutral-800 p-6 md:p-8">
                        <div className="flex flex-col md:flex-row gap-6 items-center">
                            <div className="w-16 h-16 rounded-full bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center text-neutral-500">
                                <Server size={32} />
                            </div>
                            <div className="flex-1 text-center md:text-left">
                                <h3 className="text-xl font-bold text-neutral-900 dark:text-neutral-100 mb-2">
                                    서버 연결 오류
                                </h3>
                                <p className="text-sm text-neutral-600 dark:text-neutral-300 mb-4">
                                    {resultData?.message || '서버에 연결할 수 없습니다. 잠시 후 다시 시도해주세요.'}
                                </p>
                                <div className="flex flex-wrap gap-3 justify-center md:justify-start mt-6">
                                    <button 
                                        onClick={() => {
                                            setHasNetworkError(false);
                                            setResultData(null);
                                        }}
                                        className="px-4 py-2 bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 hover:bg-neutral-800 dark:hover:bg-neutral-200 rounded-lg text-sm font-medium transition-colors"
                                    >
                                        다시 시도
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </motion.div>
            )}

            <ResultDisplay 
                result={result} 
                resultData={resultData} 
                isScanning={isScanning} 
                hasNetworkError={hasNetworkError}
                setResult={setResult}
                setResultData={setResultData}
                onReset={() => {
                    setResult(null);
                    setResultData(null);
                    setUrl('');
                    setSmsText('');
                    setEmailText('');
                    setVoiceFile(null);
                }}
                easyMode={easyMode}
                setEasyMode={setEasyMode}
                mode={mode}
            />

            <ConsentModal
                isOpen={showConsentModal}
                onConsent={handleConsentAndProceed}
                onClose={() => {
                    setShowConsentModal(false);
                    setPendingScan(null);
                }}
            />
        </div>
    );
};

export default Scanner;
