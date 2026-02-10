"use client";

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, Check, ChevronDown, ChevronUp, X } from 'lucide-react';

interface ConsentModalProps {
  isOpen: boolean;
  onConsent: () => void;
  onClose: () => void;
}

const ConsentModal: React.FC<ConsentModalProps> = ({ isOpen, onConsent, onClose }) => {
  const [allChecked, setAllChecked] = useState(false);
  const [privacyChecked, setPrivacyChecked] = useState(false);
  const [tosChecked, setTosChecked] = useState(false);
  const [showPrivacyDetail, setShowPrivacyDetail] = useState(false);
  const [showTosDetail, setShowTosDetail] = useState(false);

  const handleAllCheck = () => {
    const newValue = !allChecked;
    setAllChecked(newValue);
    setPrivacyChecked(newValue);
    setTosChecked(newValue);
  };

  const updateAllCheck = (privacy: boolean, tos: boolean) => {
    setAllChecked(privacy && tos);
  };

  const handlePrivacyCheck = () => {
    const newValue = !privacyChecked;
    setPrivacyChecked(newValue);
    updateAllCheck(newValue, tosChecked);
  };

  const handleTosCheck = () => {
    const newValue = !tosChecked;
    setTosChecked(newValue);
    updateAllCheck(privacyChecked, newValue);
  };

  const canProceed = privacyChecked && tosChecked;

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="bg-white dark:bg-neutral-900 rounded-2xl shadow-2xl w-full max-w-lg max-h-[90dvh] flex flex-col overflow-hidden border border-neutral-200 dark:border-neutral-800"
          >
            <div className="flex items-center justify-between p-5 pb-4 border-b border-neutral-100 dark:border-neutral-800 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                  <Shield className="text-blue-600 dark:text-blue-400" size={20} />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-neutral-900 dark:text-white">서비스 이용 동의</h2>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400">검사 서비스 이용을 위해 동의가 필요합니다</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-2 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors text-neutral-400"
              >
                <X size={18} />
              </button>
            </div>

            <div className="overflow-y-auto flex-1 p-5 space-y-4 overscroll-contain">
              <button
                onClick={handleAllCheck}
                className="w-full flex items-center gap-3 p-4 rounded-xl bg-blue-50 dark:bg-blue-900/20 border-2 border-blue-200 dark:border-blue-800 transition-all hover:border-blue-400 dark:hover:border-blue-600"
              >
                <div className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all shrink-0 ${
                  allChecked 
                    ? 'bg-blue-600 border-blue-600' 
                    : 'border-neutral-300 dark:border-neutral-600'
                }`}>
                  {allChecked && <Check size={14} className="text-white" />}
                </div>
                <span className="font-bold text-neutral-900 dark:text-white text-sm">전체 동의하기</span>
              </button>

              <div className="border border-neutral-200 dark:border-neutral-700 rounded-xl overflow-hidden">
                <div className="flex items-center gap-3 p-4">
                  <button onClick={handlePrivacyCheck} className="shrink-0">
                    <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all ${
                      privacyChecked 
                        ? 'bg-blue-600 border-blue-600' 
                        : 'border-neutral-300 dark:border-neutral-600'
                    }`}>
                      {privacyChecked && <Check size={12} className="text-white" />}
                    </div>
                  </button>
                  <span className="text-sm font-medium text-neutral-800 dark:text-neutral-200 flex-1">[필수] 개인정보 수집·이용 동의</span>
                  <button
                    onClick={() => setShowPrivacyDetail(!showPrivacyDetail)}
                    className="p-1 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300 transition-colors"
                  >
                    {showPrivacyDetail ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                  </button>
                </div>
                
                <AnimatePresence>
                  {showPrivacyDetail && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden"
                    >
                      <div className="px-4 pb-4">
                        <div className="bg-neutral-50 dark:bg-neutral-800/50 rounded-lg p-4 text-xs text-neutral-600 dark:text-neutral-400 space-y-3 max-h-48 overflow-y-auto">
                          <div>
                            <p className="font-bold text-neutral-700 dark:text-neutral-300 mb-1">1. 수집 목적</p>
                            <p>피싱·스미싱 등 보안 위협 분석 서비스 제공, 분석 결과 캐싱을 통한 서비스 품질 향상, 서비스 이용 통계 및 개선</p>
                          </div>
                          <div>
                            <p className="font-bold text-neutral-700 dark:text-neutral-300 mb-1">2. 수집 항목</p>
                            <p>검사 대상 데이터(URL, 문자, 이메일 내용, QR 코드 이미지, 음성 파일), IP 주소, 브라우저 정보(User-Agent), 검사 결과 및 분석 데이터</p>
                          </div>
                          <div>
                            <p className="font-bold text-neutral-700 dark:text-neutral-300 mb-1">3. 보유 및 이용 기간</p>
                            <p>수집일로부터 1년간 보관 후 자동 파기. 단, 캐시 목적의 분석 결과는 서비스 운영 기간 동안 보관될 수 있습니다.</p>
                          </div>
                          <div>
                            <p className="font-bold text-neutral-700 dark:text-neutral-300 mb-1">4. 동의 거부 시 불이익</p>
                            <p>동의를 거부할 권리가 있으나, 거부 시 보안 검사 서비스를 이용하실 수 없습니다.</p>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <div className="border border-neutral-200 dark:border-neutral-700 rounded-xl overflow-hidden">
                <div className="flex items-center gap-3 p-4">
                  <button onClick={handleTosCheck} className="shrink-0">
                    <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all ${
                      tosChecked 
                        ? 'bg-blue-600 border-blue-600' 
                        : 'border-neutral-300 dark:border-neutral-600'
                    }`}>
                      {tosChecked && <Check size={12} className="text-white" />}
                    </div>
                  </button>
                  <span className="text-sm font-medium text-neutral-800 dark:text-neutral-200 flex-1">[필수] 서비스 이용약관 동의</span>
                  <button
                    onClick={() => setShowTosDetail(!showTosDetail)}
                    className="p-1 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300 transition-colors"
                  >
                    {showTosDetail ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                  </button>
                </div>
                
                <AnimatePresence>
                  {showTosDetail && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden"
                    >
                      <div className="px-4 pb-4">
                        <div className="bg-neutral-50 dark:bg-neutral-800/50 rounded-lg p-4 text-xs text-neutral-600 dark:text-neutral-400 space-y-3 max-h-48 overflow-y-auto">
                          <div>
                            <p className="font-bold text-neutral-700 dark:text-neutral-300 mb-1">제1조 (목적)</p>
                            <p>본 약관은 피싱가드(이하 "서비스")의 이용 조건 및 절차에 관한 사항을 규정함을 목적으로 합니다.</p>
                          </div>
                          <div>
                            <p className="font-bold text-neutral-700 dark:text-neutral-300 mb-1">제2조 (서비스 내용)</p>
                            <p>URL, 문자메시지, 이메일, QR 코드, 음성 파일에 대한 보안 위협 분석 서비스를 제공합니다. 분석 결과는 AI 기반으로 생성되며 100% 정확성을 보장하지 않습니다.</p>
                          </div>
                          <div>
                            <p className="font-bold text-neutral-700 dark:text-neutral-300 mb-1">제3조 (이용자의 의무)</p>
                            <p>이용자는 서비스를 악용하거나 타인의 권리를 침해하는 용도로 사용할 수 없습니다. 검사 데이터는 서비스 개선 및 다른 이용자의 보호를 위해 활용될 수 있습니다.</p>
                          </div>
                          <div>
                            <p className="font-bold text-neutral-700 dark:text-neutral-300 mb-1">제4조 (면책사항)</p>
                            <p>서비스는 보안 위협에 대한 참고 정보를 제공하며, 분석 결과에 따른 최종 판단 및 행동에 대한 책임은 이용자에게 있습니다.</p>
                          </div>
                          <div>
                            <p className="font-bold text-neutral-700 dark:text-neutral-300 mb-1">제5조 (데이터 활용)</p>
                            <p>검사된 모든 데이터는 서비스 품질 향상과 보안 위협 데이터베이스 구축에 활용됩니다. 동일한 검사 대상에 대해 기존 분석 결과가 반환될 수 있습니다.</p>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>

            <div className="p-5 pt-4 border-t border-neutral-100 dark:border-neutral-800 shrink-0">
              <button
                onClick={onConsent}
                disabled={!canProceed}
                className={`w-full py-3.5 rounded-xl font-bold text-sm transition-all ${
                  canProceed
                    ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-200 dark:shadow-none active:scale-[0.98]'
                    : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-400 dark:text-neutral-600 cursor-not-allowed'
                }`}
              >
                {canProceed ? '동의하고 계속하기' : '모든 항목에 동의해주세요'}
              </button>
              <p className="text-[11px] text-neutral-400 dark:text-neutral-500 text-center mt-3">
                동의 내용은 서비스 이용 기간 동안 유지됩니다
              </p>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default ConsentModal;
