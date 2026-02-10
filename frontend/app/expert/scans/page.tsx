'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Shield, Download, FileText, Activity, AlertTriangle, CheckCircle, HelpCircle } from 'lucide-react';
import { motion } from 'framer-motion';

interface AllScanRecord {
  id: number;
  scan_type: string;
  scan_target: string;
  result: string;
  risk_score?: number;
  threat_types?: string;
  analysis_result?: string;
  easy_summary?: string;
  expert_summary?: string;
  processing_time_ms?: number;
  user_agent?: string;
  created_at: string;
}

const ExpertScansPage = () => {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [scans, setScans] = useState<AllScanRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin');
      return;
    }

    if (status === 'authenticated') {
      fetchScans();
    }
  }, [status, router]);

  const fetchScans = async () => {
    try {
      const res = await fetch(`/api/expert/scans?limit=1000`);
      if (res.ok) {
        const data = await res.json();
        setScans(data);
      } else {
        if (res.status === 403) {
            router.push('/'); 
        }
      }
    } catch (error) {
      console.error('Failed to fetch scans:', error);
    } finally {
      setLoading(false);
    }
  };

  const [selectedScan, setSelectedScan] = useState<AllScanRecord | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  const handleDownloadCSV = () => {
    setDownloading(true);
    try {
      if (scans.length === 0) {
        alert('다운로드할 데이터가 없습니다.');
        return;
      }

      const headers = [
        'ID',
        'Time',
        'Type',
        'Target',
        'Result',
        'Risk Score',
        'Threat Types',
        'Easy Summary',
        'Expert Summary',
        'Processing Time (ms)',
        'User Agent',
        'Analysis Result (JSON)'
      ];

      const csvRows = [
        headers.join(','),
        ...scans.map(scan => {
          return [
            scan.id,
            `"${new Date(scan.created_at).toISOString()}"`,
            `"${scan.scan_type}"`,
            `"${(scan.scan_target || '').replace(/"/g, '""')}"`,
            `"${scan.result}"`,
            scan.risk_score || '',
            `"${(scan.threat_types || '').replace(/"/g, '""')}"`,
            `"${(scan.easy_summary || '').replace(/"/g, '""')}"`,
            `"${(scan.expert_summary || '').replace(/"/g, '""')}"`,
            scan.processing_time_ms || '',
            `"${(scan.user_agent || '').replace(/"/g, '""')}"`,
            `"${(scan.analysis_result || '{}').replace(/"/g, '""')}"`
          ].join(',');
        })
      ];

      const csvContent = csvRows.join('\n');
      
      const BOM = '\uFEFF'; 
      const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
      
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `expert_scans_${new Date().toISOString().slice(0,10)}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

    } catch (error) {
      console.error('CSV Download failed:', error);
      alert('CSV 다운로드 중 오류가 발생했습니다.');
    } finally {
      setDownloading(false);
    }
  };

  const getResultBadge = (result: string) => {
    switch (result) {
      case 'safe': return <span className="bg-emerald-100 text-emerald-700 px-2 py-1 rounded text-xs font-bold flex items-center gap-1"><CheckCircle size={12}/> 안전</span>;
      case 'warning': return <span className="bg-amber-100 text-amber-700 px-2 py-1 rounded text-xs font-bold flex items-center gap-1"><AlertTriangle size={12}/> 주의</span>;
      case 'danger': return <span className="bg-rose-100 text-rose-700 px-2 py-1 rounded text-xs font-bold flex items-center gap-1"><Shield size={12}/> 위험</span>;
      default: return <span className="bg-gray-100 text-gray-700 px-2 py-1 rounded text-xs font-bold flex items-center gap-1"><HelpCircle size={12}/> 미확인</span>;
    }
  };

  const openDetailModal = (scan: AllScanRecord) => {
    setSelectedScan(scan);
    setShowDetailModal(true);
  };

  if (loading) {
     return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <>
      <div className="min-h-screen bg-gray-50 dark:bg-black p-6 md:p-10 pb-20 md:pb-20">
        <div className="max-w-7xl mx-auto space-y-6">
        
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
                <h1 className="text-2xl font-bold text-neutral-900 dark:text-white flex items-center gap-2">
                    <Shield className="text-blue-600" />
                    전체 검사 기록
                </h1>
                <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">
                    플랫폼 내 모든 익명화된 검사 데이터를 조회하고 분석할 수 있습니다.
                </p>
            </div>
            <button
                onClick={handleDownloadCSV}
                disabled={downloading}
                className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-3 md:px-5 py-2 md:py-2.5 rounded-xl font-medium transition-colors disabled:opacity-70 disabled:cursor-not-allowed shadow-sm text-sm md:text-base whitespace-nowrap"
            >
                {downloading ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                ) : (
                    <Download size={18} />
                )}
                <span className="hidden md:inline">CSV 다운로드</span>
                <span className="md:hidden">다운로드</span>
            </button>
        </div>

        <div className="hidden md:block bg-white dark:bg-neutral-900 rounded-2xl shadow-sm border border-gray-100 dark:border-neutral-800 overflow-hidden">
            <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                    <thead className="bg-gray-50 dark:bg-neutral-800 text-gray-500 dark:text-neutral-400 font-bold border-b border-gray-100 dark:border-neutral-700">
                        <tr>
                            <th className="px-6 py-4 whitespace-nowrap">시간</th>
                            <th className="px-6 py-4 whitespace-nowrap">유형</th>
                            <th className="px-6 py-4 whitespace-nowrap">대상</th>
                            <th className="px-6 py-4 whitespace-nowrap">결과</th>
                            <th className="px-6 py-4 whitespace-nowrap">점수</th>
                            <th className="px-6 py-4 max-w-xs">위협 유형</th>
                            <th className="px-6 py-4 max-w-sm">전문가 요약</th>
                            <th className="px-6 py-4">상세</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-neutral-800">
                        {scans.map((scan) => (
                            <tr key={scan.id} className="hover:bg-gray-50 dark:hover:bg-neutral-800/50 transition-colors">
                                <td className="px-6 py-4 text-neutral-600 dark:text-neutral-400 whitespace-nowrap">
                                    {new Date(scan.created_at).toLocaleString('ko-KR', { 
                                        year: '2-digit', month: '2-digit', day: '2-digit', 
                                        hour: '2-digit', minute: '2-digit' 
                                    })}
                                </td>
                                <td className="px-6 py-4">
                                    <span className="uppercase text-xs font-bold px-2.5 py-1 bg-gray-100 dark:bg-neutral-700 rounded text-neutral-600 dark:text-neutral-300">
                                        {scan.scan_type}
                                    </span>
                                </td>
                                <td className="px-6 py-4">
                                     <div className="max-w-[240px] truncate text-neutral-900 dark:text-white font-medium" title={scan.scan_target}>
                                        {scan.scan_target}
                                     </div>
                                </td>
                                <td className="px-6 py-4">
                                    {getResultBadge(scan.result)}
                                </td>
                                <td className="px-6 py-4 font-bold text-neutral-700 dark:text-neutral-300">
                                    {scan.risk_score ? (
                                        <span className={
                                            scan.risk_score < 50 ? 'text-rose-500' : 
                                            scan.risk_score < 80 ? 'text-amber-500' : 'text-emerald-500'
                                        }>
                                            {Math.round(scan.risk_score)}
                                        </span>
                                    ) : '-'}
                                </td>
                                <td className="px-6 py-4 text-xs text-neutral-500 dark:text-neutral-400 max-w-xs break-words">
                                    {scan.threat_types ? (
                                        <div className="line-clamp-2" title={scan.threat_types}>
                                            {scan.threat_types.replace(/[\[\]"]/g, '')}
                                        </div>
                                    ) : '-'}
                                </td>
                                <td className="px-6 py-4 text-xs text-neutral-600 dark:text-neutral-400 max-w-sm">
                                    <div className="line-clamp-2" title={scan.expert_summary || scan.easy_summary}>
                                        {scan.expert_summary || scan.easy_summary || '-'}
                                    </div>
                                </td>
                                <td className="px-6 py-4">
                                    <button 
                                        onClick={() => openDetailModal(scan)}
                                        className="p-2 hover:bg-gray-100 dark:hover:bg-neutral-700 rounded-lg text-neutral-500 hover:text-neutral-900 dark:hover:text-white transition-colors"
                                        title="상세 보기"
                                    >
                                        <FileText size={18} />
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>

        {/* Mobile Card View */}
        <div className="md:hidden space-y-3">
            {scans.map((scan) => (
                <motion.div 
                    key={scan.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-white dark:bg-neutral-900 rounded-lg border border-gray-100 dark:border-neutral-800 p-4 hover:shadow-md dark:hover:shadow-neutral-800/50 transition-shadow"
                >
                    <div className="space-y-3">
                        {/* Header */}
                        <div className="flex items-start justify-between gap-2">
                            <div className="flex-1">
                                <div className="flex items-center gap-2 flex-wrap">
                                    <span className="uppercase text-xs font-bold px-2 py-1 bg-gray-100 dark:bg-neutral-700 rounded text-neutral-600 dark:text-neutral-300">
                                        {scan.scan_type}
                                    </span>
                                    {getResultBadge(scan.result)}
                                </div>
                                <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-2">
                                    {new Date(scan.created_at).toLocaleString('ko-KR')}
                                </p>
                            </div>
                            {scan.risk_score !== undefined && (
                                <div className="text-right">
                                    <p className="text-xs text-neutral-500 dark:text-neutral-400">위험도</p>
                                    <p className={`text-lg font-bold ${
                                        scan.risk_score < 50 ? 'text-rose-500' : 
                                        scan.risk_score < 80 ? 'text-amber-500' : 'text-emerald-500'
                                    }`}>
                                        {Math.round(scan.risk_score)}
                                    </p>
                                </div>
                            )}
                        </div>

                        {/* Target */}
                        <div className="bg-gray-50 dark:bg-neutral-800 rounded p-2">
                            <p className="text-xs text-neutral-500 dark:text-neutral-400 mb-1">대상</p>
                            <p className="text-xs font-mono break-all text-neutral-900 dark:text-neutral-200">
                                {scan.scan_target}
                            </p>
                        </div>

                        {/* Summary */}
                        {(scan.expert_summary || scan.easy_summary) && (
                            <div className="bg-blue-50 dark:bg-blue-900/20 rounded p-2 border border-blue-100 dark:border-blue-900/50">
                                <p className="text-xs text-blue-700 dark:text-blue-400 line-clamp-2">
                                    {scan.expert_summary || scan.easy_summary}
                                </p>
                            </div>
                        )}

                        {/* Threat Types */}
                        {scan.threat_types && (
                            <div>
                                <p className="text-xs text-neutral-500 dark:text-neutral-400 mb-1">위협 유형</p>
                                <p className="text-xs text-neutral-600 dark:text-neutral-400 line-clamp-2">
                                    {scan.threat_types.replace(/[\[\]"]/g, '')}
                                </p>
                            </div>
                        )}

                        <button 
                            onClick={() => openDetailModal(scan)}
                            className="w-full mt-2 py-2 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded font-medium text-sm hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors flex items-center justify-center gap-2"
                        >
                            <FileText size={14} />
                            상세 보기
                        </button>
                    </div>
                </motion.div>
            ))}
        </div>
            
             {scans.length === 0 && !loading && (
                <div className="hidden md:block p-12 text-center">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-100 dark:bg-neutral-800 mb-4">
                        <FileText className="text-gray-400" size={32} />
                    </div>
                    <h3 className="text-lg font-medium text-neutral-900 dark:text-white">데이터가 없습니다</h3>
                    <p className="text-neutral-500 dark:text-neutral-400 mt-1">표시할 검사 기록이 없습니다.</p>
                </div>
            )}
        </div>

        {scans.length === 0 && !loading && (
            <div className="md:hidden text-center py-12">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-100 dark:bg-neutral-800 mb-4">
                    <FileText className="text-gray-400" size={32} />
                </div>
                <h3 className="text-lg font-medium text-neutral-900 dark:text-white">데이터가 없습니다</h3>
                <p className="text-neutral-500 dark:text-neutral-400 mt-1">표시할 검사 기록이 없습니다.</p>
            </div>
        )}
      </div>

      {showDetailModal && selectedScan && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-white dark:bg-neutral-900 rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden shadow-2xl flex flex-col"
            >
                <div className="p-6 border-b border-gray-100 dark:border-neutral-800 flex justify-between items-center bg-gray-50 dark:bg-neutral-800/50">
                    <div>
                        <h3 className="text-xl font-bold text-neutral-900 dark:text-white flex items-center gap-2">
                           <Activity size={20} className="text-blue-600" />
                           검사 상세 분석
                        </h3>
                        <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">
                            ID: {selectedScan.id} • {new Date(selectedScan.created_at).toLocaleString('ko-KR')}
                        </p>
                    </div>
                    <button 
                        onClick={() => setShowDetailModal(false)}
                        className="p-2 hover:bg-gray-200 dark:hover:bg-neutral-700 rounded-full transition-colors"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-neutral-500"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                    </button>
                </div>
                
                <div className="p-6 overflow-y-auto flex-1">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                       <div className="space-y-4">
                          <h4 className="font-bold text-neutral-900 dark:text-white border-b border-gray-100 dark:border-neutral-800 pb-2">기본 정보</h4>
                          <div className="grid grid-cols-[100px_1fr] gap-y-2 text-sm">
                             <span className="text-neutral-500">유형</span>
                             <span className="font-medium uppercase">{selectedScan.scan_type}</span>
                             <span className="text-neutral-500">대상</span>
                             <span className="font-mono text-xs break-all bg-gray-50 dark:bg-neutral-800 p-1 rounded">{selectedScan.scan_target}</span>
                             <span className="text-neutral-500">결과</span>
                             <div>{getResultBadge(selectedScan.result)}</div>
                             <span className="text-neutral-500">점수</span>
                             <span className="font-bold">{selectedScan.risk_score}점</span>
                          </div>
                       </div>
                       
                       <div className="space-y-4">
                          <h4 className="font-bold text-neutral-900 dark:text-white border-b border-gray-100 dark:border-neutral-800 pb-2">분석 요약</h4>
                           <div className="text-sm text-neutral-600 dark:text-neutral-300 bg-gray-50 dark:bg-neutral-800 p-3 rounded-xl min-h-[100px]">
                              {selectedScan.expert_summary || selectedScan.easy_summary || "요약 정보 없음"}
                           </div>
                       </div>
                    </div>

                    <h4 className="font-bold text-neutral-900 dark:text-white border-b border-gray-100 dark:border-neutral-800 pb-2 mb-4">
                        상세 기술 데이터 (JSON)
                    </h4>
                    
                    <div className="bg-neutral-900 text-neutral-200 p-4 rounded-xl font-mono text-xs overflow-x-auto">
                        <pre className="whitespace-pre-wrap">
                            {(() => {
                                try {
                                    const parsed = JSON.parse(selectedScan.analysis_result || '{}');
                                    return JSON.stringify(parsed, null, 2);
                                } catch (e) {
                                    return selectedScan.analysis_result || "데이터 없음";
                                }
                            })()}
                        </pre>
                    </div>
                </div>

                <div className="p-4 border-t border-gray-100 dark:border-neutral-800 bg-gray-50 dark:bg-neutral-800/50 flex justify-end">
                    <button 
                        onClick={() => setShowDetailModal(false)}
                        className="px-6 py-2.5 bg-white border border-gray-200 dark:bg-neutral-800 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300 rounded-xl font-bold hover:bg-gray-50 dark:hover:bg-neutral-700 transition-colors"
                    >
                        닫기
                    </button>
                </div>
            </motion.div>
        </div>
      )}
    </>
  );
};

export default ExpertScansPage;
