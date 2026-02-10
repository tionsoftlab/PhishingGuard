"use client";

import { useRouter } from 'next/navigation';
import { AlertTriangle, ArrowLeft } from 'lucide-react';

export default function NotFound() {
  const router = useRouter();
  return (
    <div className="flex flex-col items-center justify-center h-full text-center pb-20 min-h-[60vh]">
      <div className="w-24 h-24 bg-rose-50 rounded-3xl flex items-center justify-center mb-6 shadow-sm border border-rose-100 rotate-3">
        <AlertTriangle size={48} className="text-rose-500" />
      </div>
      <h1 className="text-4xl font-bold text-slate-900 mb-2">404 Not Found</h1>
      <h2 className="text-lg font-medium text-slate-600 mb-6">요청하신 페이지를 찾을 수 없습니다.</h2>
      <p className="text-slate-500 mb-8 max-w-sm text-sm leading-relaxed">
        페이지가 이동되었거나 삭제되었을 수 있습니다.<br/>
        입력하신 주소가 정확한지 다시 한번 확인해 주세요.
      </p>
      <button 
        onClick={() => router.push('/')}
        className="px-6 py-3 bg-slate-900 text-white rounded-xl font-bold hover:bg-slate-800 transition-colors shadow-lg shadow-slate-200 flex items-center gap-2"
      >
        <ArrowLeft size={18} />
        <span>홈으로 돌아가기</span>
      </button>
    </div>
  );
};
