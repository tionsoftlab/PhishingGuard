import React from 'react';
import { Eye, ExternalLink, Activity, Server, Lock, CheckCircle, AlertTriangle, Siren, Shield, Info } from "lucide-react";
import { motion } from "framer-motion";

interface UrlAnalysisDetailProps {
    resultData: any;
    easyMode: boolean;
    index?: number;
}

const UrlAnalysisDetail: React.FC<UrlAnalysisDetailProps> = ({ resultData, easyMode, index }) => {
    const titlePrefix = index !== undefined ? `[URL ${index + 1}] ` : '';

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full">
            {resultData.screenshot_url && (
                <div className="bg-white dark:bg-neutral-900 rounded-xl shadow-md border border-neutral-100 dark:border-neutral-800 p-5 md:col-span-2">
                    <div className="flex items-center gap-2 mb-4">
                        <Eye size={20} className="text-purple-600" />
                        <h4 className="font-bold text-neutral-900 dark:text-neutral-100">
                            {titlePrefix}{easyMode ? '📸 이 사이트는 이렇게 생겼어요' : '사이트 스크린샷 (Screenshot Capture)'}
                        </h4>
                    </div>
                    <img 
                        src={resultData.screenshot_url.replace(/^http:\/\//i, 'https://')} 
                        alt="Site Screenshot" 
                        className="w-full h-auto max-h-96 object-contain rounded-lg border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800" 
                    />
                    {easyMode && (
                        <p className="mt-3 text-xs text-neutral-500 dark:text-neutral-400 flex items-center gap-1.5">
                            <Info size={12} />
                            이 사이트에 접속하면 위와 같은 화면이 나타납니다. 낯설거나 이상한 사이트라면 주의하세요.
                        </p>
                    )}
                </div>
            )}

            {resultData.steps?.step0 && (
                <div className="bg-white dark:bg-neutral-900 rounded-xl shadow-md border border-neutral-100 dark:border-neutral-800 p-5">
                   <div className="flex items-center gap-2 mb-4">
                        <ExternalLink size={20} className="text-blue-600" />
                        <h4 className="font-bold text-neutral-900 dark:text-neutral-100">
                            {titlePrefix}{easyMode ? '🔀 주소가 어디로 이동하나요?' : '리다이렉션 경로 추적 (Redirect Chain)'}
                        </h4>
                    </div>

                    {easyMode ? (
                        <div className="space-y-3">
                            <div className={`p-4 rounded-xl ${
                                (resultData.steps.step0.redirect_count || 0) > 3 
                                    ? 'bg-amber-50 dark:bg-amber-950/30 border border-amber-100 dark:border-amber-900' 
                                    : 'bg-neutral-50 dark:bg-neutral-800 border border-neutral-100 dark:border-neutral-700'
                            }`}>
                                <p className="text-sm text-neutral-700 dark:text-neutral-300 leading-relaxed">
                                    {resultData.steps.step0.redirect_count === 0 
                                        ? '이 주소는 다른 곳으로 이동하지 않고 바로 연결됩니다.'
                                        : resultData.steps.step0.redirect_count === 1
                                        ? '이 주소는 1번 다른 곳으로 이동한 뒤 최종 페이지에 도착합니다.'
                                        : `이 주소는 ${resultData.steps.step0.redirect_count}번 다른 곳으로 이동합니다.`}
                                    {(resultData.steps.step0.redirect_count || 0) > 3 && (
                                        <span className="block mt-2 text-amber-700 dark:text-amber-400 font-medium">
                                            ⚠️ 이동 횟수가 많은 것은 사용자를 속이려는 수법일 수 있습니다.
                                        </span>
                                    )}
                                </p>
                            </div>
                            {resultData.steps.step0.redirect_chain?.length > 0 && (
                                <div className="text-xs text-neutral-500 dark:text-neutral-400">
                                    <span className="font-semibold">최종 도착 주소:</span>{' '}
                                    <span className="break-all text-indigo-600 dark:text-indigo-400 font-medium">
                                        {resultData.steps.step0.redirect_chain[resultData.steps.step0.redirect_chain.length - 1]}
                                    </span>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="space-y-2">
                            <div className="flex justify-between items-center text-sm">
                                <span className="text-neutral-500">Redirect Count</span>
                                <span className="font-mono font-bold">{resultData.steps.step0.redirect_count}회</span>
                            </div>
                            <div className="p-3 bg-neutral-50 dark:bg-neutral-800 rounded-lg text-xs font-mono space-y-1 overflow-x-auto">
                                {resultData.steps.step0.redirect_chain?.map((url: string, idx: number) => (
                                    <div key={idx} className="flex gap-2">
                                        <span className="text-neutral-400 flex-shrink-0">{idx + 1}.</span>
                                        <span className={`break-all whitespace-normal ${idx === resultData.steps.step0.redirect_chain.length - 1 ? "text-indigo-600 dark:text-indigo-400 font-bold" : "text-neutral-600 dark:text-neutral-400"}`}>
                                            {url}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}

            {resultData.steps?.['step1.5'] && (
                 <div className="bg-white dark:bg-neutral-900 rounded-xl shadow-md border border-neutral-100 dark:border-neutral-800 p-5">
                     <div className="flex items-center gap-2 mb-4">
                        <Activity size={20} className="text-purple-600" />
                        <h4 className="font-bold text-neutral-900 dark:text-neutral-100">
                            {titlePrefix}{easyMode ? '🤖 AI가 이 링크를 검사했어요' : 'URL 머신러닝 분석 (ML Ensemble)'}
                        </h4>
                    </div>

                    {easyMode ? (
                        <div className="space-y-3">
                            {(() => {
                                const prob = resultData.steps['step1.5'].ensemble_probability || 0;
                                const isDanger = resultData.steps['step1.5'].ensemble_prediction === 1;
                                return (
                                    <div className={`p-4 rounded-xl ${isDanger ? 'bg-rose-50 dark:bg-rose-950/30 border border-rose-100 dark:border-rose-900' : 'bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-100 dark:border-emerald-900'}`}>
                                        <div className="flex items-center gap-3 mb-3">
                                            {isDanger ? (
                                                <Siren size={24} className="text-rose-500" />
                                            ) : (
                                                <CheckCircle size={24} className="text-emerald-500" />
                                            )}
                                            <span className={`text-lg font-bold ${isDanger ? 'text-rose-700 dark:text-rose-400' : 'text-emerald-700 dark:text-emerald-400'}`}>
                                                {isDanger ? '위험한 링크로 판단됨' : '안전한 링크로 판단됨'}
                                            </span>
                                        </div>
                                        <div className="w-full h-3 bg-white/60 dark:bg-neutral-700 rounded-full overflow-hidden">
                                            <motion.div 
                                                className={`h-full rounded-full ${prob > 0.7 ? 'bg-rose-500' : prob > 0.4 ? 'bg-amber-500' : 'bg-emerald-500'}`}
                                                initial={{ width: 0 }}
                                                animate={{ width: `${prob * 100}%` }}
                                                transition={{ duration: 1, ease: "easeOut" }}
                                            />
                                        </div>
                                        <p className="mt-2 text-xs text-neutral-500 dark:text-neutral-400">
                                            {isDanger 
                                                ? 'AI 모델이 이 링크에서 위험한 패턴을 감지했습니다. 클릭하지 마세요.' 
                                                : 'AI 모델이 이 링크에서 특별한 위험 패턴을 발견하지 못했습니다.'}
                                        </p>
                                    </div>
                                );
                            })()}
                        </div>
                    ) : (
                        <div className="space-y-3 text-sm">
                            <div className="flex justify-between">
                                <span className="text-neutral-500">Ensemble Phishing Probability</span>
                                <span className={`font-bold font-mono ${
                                    (resultData.steps['step1.5'].ensemble_probability || 0) > 0.5 ? 'text-rose-600' : 'text-emerald-600'
                                }`}>
                                    {((resultData.steps['step1.5'].ensemble_probability || 0) * 100).toFixed(4)}%
                                </span>
                            </div>
                            <div className="w-full h-2 bg-neutral-100 dark:bg-neutral-700 rounded-full overflow-hidden">
                                <div 
                                    className={`h-full rounded-full transition-all duration-500 ${
                                        (resultData.steps['step1.5'].ensemble_probability || 0) > 0.7 ? 'bg-rose-500' :
                                        (resultData.steps['step1.5'].ensemble_probability || 0) > 0.4 ? 'bg-amber-500' : 'bg-emerald-500'
                                    }`}
                                    style={{ width: `${(resultData.steps['step1.5'].ensemble_probability || 0) * 100}%` }}
                                />
                            </div>
                            <div className="flex justify-between">
                                <span className="text-neutral-500">Ensemble Prediction</span>
                                <span className={`font-mono font-bold ${resultData.steps['step1.5'].ensemble_prediction === 1 ? 'text-rose-600' : 'text-emerald-600'}`}>
                                    {resultData.steps['step1.5'].ensemble_prediction === 1 ? 'DANGER (1)' : 'SAFE (0)'}
                                </span>
                            </div>
                            {resultData.steps['step1.5'].penalty > 0 && (
                                <div className="flex justify-between">
                                    <span className="text-neutral-500">Trust Score Penalty</span>
                                    <span className="text-rose-600 font-bold font-mono">-{resultData.steps['step1.5'].penalty}점</span>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}

            {(resultData.steps?.step2?.ai_analysis || resultData.ai_analysis) && (
                 <div className="bg-white dark:bg-neutral-900 rounded-xl shadow-md border border-neutral-100 dark:border-neutral-800 p-5 md:col-span-2">
                    <div className="flex items-center gap-2 mb-4">
                        <Server size={20} className="text-indigo-600" />
                        <h4 className="font-bold text-neutral-900 dark:text-neutral-100">
                            {titlePrefix}{easyMode ? '🧠 AI가 내린 결론' : 'AI 분석 결과 (LLM Analysis)'}
                        </h4>
                    </div>
                    
                    {(() => {
                        const analysis = resultData.ai_analysis || resultData.steps?.step2?.ai_analysis;
                        if (!analysis) return null;

                        return easyMode ? (
                            <div className="space-y-3">
                                <div className={`p-5 rounded-xl ${
                                    (analysis.risk_level === 'high' || analysis.status === 'DANGER') ? 'bg-rose-50 dark:bg-rose-950/30 border border-rose-100 dark:border-rose-900' :
                                    (analysis.risk_level === 'medium' || analysis.status === 'WARNING') ? 'bg-amber-50 dark:bg-amber-950/30 border border-amber-100 dark:border-amber-900' :
                                    'bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-100 dark:border-emerald-900'
                                }`}>
                                    <div className="flex items-center gap-2 mb-2">
                                        {(analysis.risk_level === 'high' || analysis.status === 'DANGER') ? (
                                            <span className="px-3 py-1 rounded-full text-xs font-bold bg-rose-200 text-rose-800 dark:bg-rose-800 dark:text-rose-200">위험</span>
                                        ) : (analysis.risk_level === 'medium' || analysis.status === 'WARNING') ? (
                                            <span className="px-3 py-1 rounded-full text-xs font-bold bg-amber-200 text-amber-800 dark:bg-amber-800 dark:text-amber-200">주의</span>
                                        ) : (
                                            <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-200 text-emerald-800 dark:bg-emerald-800 dark:text-emerald-200">안전</span>
                                        )}
                                    </div>
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
                                    <div className="flex items-center gap-2">
                                        <span className="text-neutral-500">Risk Level:</span>
                                        <span className={`px-2 py-0.5 rounded font-bold uppercase font-mono ${
                                            (analysis.risk_level === 'high' || analysis.status === 'DANGER') ? 'bg-rose-100 text-rose-700 dark:bg-rose-900 dark:text-rose-300' :
                                            (analysis.risk_level === 'medium' || analysis.status === 'WARNING') ? 'bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300' :
                                            'bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300'
                                        }`}>
                                            {analysis.risk_level || analysis.status || 'SAFE'}
                                        </span>
                                    </div>
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

            {resultData.steps?.step3 && resultData.steps.step3.issuer && (
                <div className="bg-white dark:bg-neutral-900 rounded-xl shadow-md border border-neutral-100 dark:border-neutral-800 p-5 md:col-span-2">
                    <div className="flex items-center gap-2 mb-4">
                        <Lock size={20} className={resultData.steps.step3.is_valid ? "text-emerald-600" : "text-rose-600"} />
                        <h4 className="font-bold text-neutral-900 dark:text-neutral-100">
                            {titlePrefix}{easyMode ? '🔒 이 사이트의 보안 상태' : 'SSL/TLS 인증서 검증 (Certificate Verification)'}
                        </h4>
                    </div>

                    {easyMode ? (
                        <div className={`p-4 rounded-xl ${
                            resultData.steps.step3.is_valid 
                                ? 'bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-100 dark:border-emerald-900' 
                                : 'bg-rose-50 dark:bg-rose-950/30 border border-rose-100 dark:border-rose-900'
                        }`}>
                            <div className="flex items-center gap-3 mb-2">
                                {resultData.steps.step3.is_valid ? (
                                    <CheckCircle size={22} className="text-emerald-500" />
                                ) : (
                                    <AlertTriangle size={22} className="text-rose-500" />
                                )}
                                <span className={`text-base font-bold ${
                                    resultData.steps.step3.is_valid ? 'text-emerald-700 dark:text-emerald-400' : 'text-rose-700 dark:text-rose-400'
                                }`}>
                                    {resultData.steps.step3.is_valid 
                                        ? '보안 연결이 확인되었습니다' 
                                        : '보안 인증서에 문제가 있습니다!'}
                                </span>
                            </div>
                            <p className="text-sm text-neutral-600 dark:text-neutral-400 leading-relaxed">
                                {resultData.steps.step3.is_valid 
                                    ? '이 사이트는 인증된 보안 연결(HTTPS)을 사용하고 있어요. 하지만 보안 인증서가 있다고 해서 반드시 안전한 사이트는 아닙니다.' 
                                    : '이 사이트의 보안 인증서가 유효하지 않습니다. 개인정보를 입력하면 유출될 수 있으니 각별히 주의하세요.'}
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-2 text-sm">
                            <div className="flex justify-between">
                                <span className="text-neutral-500">Certificate Validity</span>
                                <span className={`font-bold font-mono ${resultData.steps.step3.is_valid ? "text-emerald-600" : "text-rose-600"}`}>
                                    {resultData.steps.step3.is_valid ? 'VALID' : 'INVALID'}
                                </span>
                            </div>
                            <div className="flex flex-col gap-1">
                                <span className="text-neutral-500">Issuer (발급 기관)</span>
                                <span className="font-mono text-xs p-2 bg-neutral-50 dark:bg-neutral-800 rounded break-all text-neutral-600 dark:text-neutral-400">
                                    {resultData.steps.step3.issuer}
                                </span>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default UrlAnalysisDetail;
