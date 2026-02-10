'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Check, ShieldCheck } from 'lucide-react';
import ConsentModal from '@/components/ConsentModal';

export default function SignUpPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isAgreed, setIsAgreed] = useState(false);
  const [showConsentModal, setShowConsentModal] = useState(false);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('비밀번호가 일치하지 않습니다.');
      return;
    }

    if (!isAgreed) {
      setError('서비스 이용을 위해 약관 동의가 필요합니다.');
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          email,
          password,
          agreedToTerms: isAgreed
        })
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || '회원가입에 실패했습니다.');
      } else {
        alert('회원가입이 완료되었습니다. 로그인 페이지로 이동합니다.');
        router.push('/auth/signin');
      }
    } catch (err) {
      setError('회원가입 처리 중 오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center bg-gray-50 dark:bg-gray-900 px-4 py-12 min-h-[calc(100vh-3.5rem-4rem)] md:min-h-[calc(100vh-4rem)]">
      <div className="w-full max-w-2xl space-y-6">
        <div>
          <h2 className="text-center text-4xl font-extrabold text-gray-900 dark:text-white">
            회원가입
          </h2>
          <p className="mt-3 text-center text-base text-gray-600 dark:text-gray-400">
            이미 계정이 있으신가요?{' '}
            <Link href="/auth/signin" className="font-medium text-blue-600 hover:text-blue-500">
              로그인
            </Link>
          </p>
        </div>
        <form className="mt-6 space-y-5" onSubmit={handleSubmit}>
          <div className="space-y-5">
            <div>
              <label htmlFor="email" className="block text-base font-medium text-gray-700 dark:text-gray-300 mb-2">
                이메일
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="appearance-none relative block w-full px-4 py-3 border border-gray-300 dark:border-gray-700 placeholder-gray-500 dark:placeholder-gray-400 text-gray-900 dark:text-white rounded-lg focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 text-base bg-white dark:bg-gray-800"
                placeholder="이메일 주소"
              />
            </div>
            <div>
              <label htmlFor="password" className="block text-base font-medium text-gray-700 dark:text-gray-300 mb-2">
                비밀번호
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="new-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="appearance-none relative block w-full px-4 py-3 border border-gray-300 dark:border-gray-700 placeholder-gray-500 dark:placeholder-gray-400 text-gray-900 dark:text-white rounded-lg focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 text-base bg-white dark:bg-gray-800"
                placeholder="비밀번호 (최소 8자)"
              />
            </div>
            <div>
              <label htmlFor="confirmPassword" className="block text-base font-medium text-gray-700 dark:text-gray-300 mb-2">
                비밀번호 확인
              </label>
              <input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                autoComplete="new-password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="appearance-none relative block w-full px-4 py-3 border border-gray-300 dark:border-gray-700 placeholder-gray-500 dark:placeholder-gray-400 text-gray-900 dark:text-white rounded-lg focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 text-base bg-white dark:bg-gray-800"
                placeholder="비밀번호 확인"
              />
            </div>
          </div>

          {error && (
            <div className="rounded-md bg-red-50 dark:bg-red-900/20 p-4">
              <p className="text-sm text-red-800 dark:text-red-400">{error}</p>
            </div>
          )}

          
          <div className="py-2">
            <div className="flex items-center justify-between p-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center transition-colors ${
                  isAgreed ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400' : 'bg-gray-100 dark:bg-gray-700 text-gray-400'
                }`}>
                  {isAgreed ? <Check size={20} /> : <ShieldCheck size={20} />}
                </div>
                <div>
                  <p className="text-sm font-bold text-gray-900 dark:text-white">
                    {isAgreed ? '약관 동의 완료' : '약관 동의 필요'}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    서비스 이용을 위해 필수입니다
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowConsentModal(true)}
                className={`text-xs font-bold px-3 py-1.5 rounded-lg transition-colors ${
                  isAgreed 
                    ? 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600' 
                    : 'bg-blue-600 text-white hover:bg-blue-700'
                }`}
              >
                {isAgreed ? '내용 보기' : '확인하기'}
              </button>
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={isLoading}
              className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-base font-medium rounded-lg text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? '회원가입 중...' : '회원가입'}
            </button>
          </div>
        </form>
      </div>

      <ConsentModal 
        isOpen={showConsentModal}
        onClose={() => setShowConsentModal(false)}
        onConsent={() => {
          setIsAgreed(true);
          setShowConsentModal(false);
          setError('');
        }}
      />
    </div>
  );
}
