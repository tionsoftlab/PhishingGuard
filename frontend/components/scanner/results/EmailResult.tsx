import React from 'react';
import { AlertTriangle, Shield, CheckCircle, ExternalLink, Server, LinkIcon, Siren, ShieldCheck, ShieldX, Info } from "lucide-react";

interface EmailResultProps {
    resultData: any;
    easyMode: boolean;
}

const EmailResult: React.FC<EmailResultProps> = ({ resultData, easyMode }) => {
    return (
        <div className="space-y-4">
            {resultData.ai_analysis && (
                <div className="bg-white dark:bg-neutral-900 rounded-xl shadow-md border border-neutral-100 dark:border-neutral-800 p-5">
                    <div className="flex items-center gap-2 mb-4">
                        <Server size={20} className="text-indigo-600" />
                        <h4 className="font-bold text-neutral-900 dark:text-neutral-100">
                            {easyMode ? '📧 AI가 이메일을 분석했어요' : 'AI 이메일 분석 (Email Threat Analysis)'}
                        </h4>
                    </div>
                    
                    {easyMode ? (
                        <div className="space-y-3">
                            <div className={`p-5 rounded-xl ${
                                resultData.ai_analysis.status === 'DANGER' ? 'bg-rose-50 dark:bg-rose-950/30 border border-rose-100 dark:border-rose-900' :
                                resultData.ai_analysis.status === 'WARNING' ? 'bg-amber-50 dark:bg-amber-950/30 border border-amber-100 dark:border-amber-900' :
                                'bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-100 dark:border-emerald-900'
                            }`}>
                                <div className="flex items-center gap-2 mb-3">
                                    {resultData.ai_analysis.status === 'DANGER' ? (
                                        <ShieldX size={20} className="text-rose-500" />
                                    ) : resultData.ai_analysis.status === 'WARNING' ? (
                                        <AlertTriangle size={20} className="text-amber-500" />
                                    ) : (
                                        <ShieldCheck size={20} className="text-emerald-500" />
                                    )}
                                    <span className={`font-bold ${
                                        resultData.ai_analysis.status === 'DANGER' ? 'text-rose-700 dark:text-rose-400' :
                                        resultData.ai_analysis.status === 'WARNING' ? 'text-amber-700 dark:text-amber-400' :
                                        'text-emerald-700 dark:text-emerald-400'
                                    }`}>
                                        {resultData.ai_analysis.status === 'DANGER' ? '위험한 이메일입니다!' :
                                         resultData.ai_analysis.status === 'WARNING' ? '주의가 필요한 이메일입니다' :
                                         '안전한 이메일로 판단됩니다'}
                                    </span>
                                </div>
                                <p className="text-sm text-neutral-700 dark:text-neutral-300 leading-relaxed">
                                    {resultData.ai_analysis.reason}
                                </p>
                            </div>
                            {resultData.ai_analysis.threat_types && resultData.ai_analysis.threat_types.length > 0 && (
                                <div className="space-y-2">
                                    <p className="text-xs font-semibold text-neutral-500 dark:text-neutral-400">발견된 위험 유형:</p>
                                    {resultData.ai_analysis.threat_types.map((threat: string, idx: number) => (
                                        <div key={idx} className="flex items-center gap-2 p-2.5 bg-rose-50 dark:bg-rose-950/30 rounded-lg border border-rose-100 dark:border-rose-900">
                                            <Siren size={14} className="text-rose-500 flex-shrink-0" />
                                            <span className="text-sm text-rose-800 dark:text-rose-300 font-medium">{threat}</span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="space-y-3">
                            <div className={`p-4 rounded-lg ${
                                resultData.ai_analysis.status === 'DANGER' ? 'bg-rose-50 dark:bg-rose-950' :
                                resultData.ai_analysis.status === 'WARNING' ? 'bg-amber-50 dark:bg-amber-950' :
                                'bg-emerald-50 dark:bg-emerald-950'
                            }`}>
                                <div className="flex items-center gap-2 mb-2 text-sm">
                                    <span className="text-neutral-500 font-mono">Status:</span>
                                    <span className={`font-mono font-bold ${
                                        resultData.ai_analysis.status === 'DANGER' ? 'text-rose-600' :
                                        resultData.ai_analysis.status === 'WARNING' ? 'text-amber-600' : 'text-emerald-600'
                                    }`}>{resultData.ai_analysis.status}</span>
                                </div>
                                <p className="text-sm font-mono text-neutral-700 dark:text-neutral-300">
                                    &quot;{resultData.ai_analysis.reason}&quot;
                                </p>
                            </div>
                            {resultData.ai_analysis.threat_types && resultData.ai_analysis.threat_types.length > 0 && (
                                <div>
                                    <p className="text-xs font-mono text-neutral-500 mb-2">Detected Threat Types:</p>
                                    <div className="flex flex-wrap gap-2">
                                        {resultData.ai_analysis.threat_types.map((threat: string, idx: number) => (
                                            <span key={idx} className="px-2.5 py-1 bg-neutral-100 dark:bg-neutral-800 rounded text-xs font-mono font-bold text-neutral-700 dark:text-neutral-300 border border-neutral-200 dark:border-neutral-700">
                                                {threat}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            )}
                            {resultData.ai_analysis.confidence !== undefined && (
                                <div className="flex items-center gap-2 text-sm">
                                    <span className="text-neutral-500 font-mono">Confidence:</span>
                                    <span className="font-mono font-bold text-neutral-700 dark:text-neutral-300">
                                        {(resultData.ai_analysis.confidence * 100).toFixed(2)}%
                                    </span>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}

            {resultData.url_analysis && resultData.url_analysis.length > 0 && (
                <div className="space-y-3">
                    <h4 className="font-bold text-neutral-900 dark:text-neutral-100 px-1">
                        {easyMode ? `🔗 이메일에서 발견된 링크 (${resultData.url_analysis.length}개)` : `URL Analysis Results (${resultData.url_analysis.length})`}
                    </h4>
                    
                    {resultData.url_analysis.map((urlResult: any, idx: number) => (
                        <div key={idx} className="bg-white dark:bg-neutral-900 rounded-xl shadow-sm border border-neutral-200 dark:border-neutral-700 p-4">
                            <div className="flex items-start justify-between gap-4 mb-3">
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-1">
                                        <LinkIcon size={14} className="text-neutral-400" />
                                        <p className="text-sm font-mono text-neutral-600 dark:text-neutral-300 truncate">
                                            {urlResult.final_url || urlResult.url}
                                        </p>
                                    </div>
                                </div>
                                <span className={`flex-shrink-0 px-2 py-1 rounded text-xs font-bold ${
                                    urlResult.final_status === 'DANGER' ? 'bg-rose-100 text-rose-700 dark:bg-rose-900 dark:text-rose-300' :
                                    urlResult.final_status === 'SUSPICIOUS' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300' :
                                    'bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300'
                                }`}>
                                    {easyMode 
                                        ? (urlResult.final_status === 'DANGER' ? '위험' : urlResult.final_status === 'SUSPICIOUS' ? '주의' : '안전')
                                        : urlResult.final_status}
                                </span>
                            </div>

                            {urlResult.screenshot_url && (
                                <div className="mb-3 rounded-lg overflow-hidden border border-neutral-100 dark:border-neutral-800">
                                    <img src={urlResult.screenshot_url} alt="Site Preview" className="w-full h-32 object-cover object-top" />
                                </div>
                            )}

                            {easyMode ? (
                                <div className={`p-3 rounded-lg text-sm ${
                                    urlResult.final_status === 'DANGER' ? 'bg-rose-50 dark:bg-rose-950/30 text-rose-700 dark:text-rose-400' :
                                    urlResult.final_status === 'SUSPICIOUS' ? 'bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400' :
                                    'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400'
                                }`}>
                                    {urlResult.final_status === 'DANGER' 
                                        ? '이 링크는 위험합니다. 절대 클릭하지 마세요!' 
                                        : urlResult.final_status === 'SUSPICIOUS'
                                        ? '이 링크는 주의가 필요합니다. 신중하게 확인하세요.'
                                        : '이 링크는 안전한 것으로 판단됩니다.'}
                                </div>
                            ) : (
                                <div className="grid grid-cols-2 gap-2 text-xs">
                                    <div className="bg-neutral-50 dark:bg-neutral-800 p-2 rounded">
                                        <span className="text-neutral-500 block mb-1 font-mono">Redirects</span>
                                        <span className="font-semibold font-mono">{urlResult.steps?.step0?.redirect_count || 0}</span>
                                    </div>
                                    <div className="bg-neutral-50 dark:bg-neutral-800 p-2 rounded">
                                        <span className="text-neutral-500 block mb-1 font-mono">ML Verdict</span>
                                        <span className={`font-semibold font-mono ${urlResult.steps?.['step1.5']?.ensemble_prediction === 1 ? 'text-rose-600' : 'text-emerald-600'}`}>
                                            {urlResult.steps?.['step1.5']?.ensemble_prediction === 1 ? 'DANGER' : 'SAFE'}
                                        </span>
                                    </div>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default EmailResult;
