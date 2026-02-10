import React, { useState, useRef, useEffect } from 'react';
import { QrCode, Camera, X, ImageIcon, Loader2, Mic, MicOff } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import jsQR from "jsqr";

let activeGlobalStream: MediaStream | null = null;

interface QrInspectorProps {
    isScanning: boolean;
    onScan: (qrData: string, qrImage: string, expectedContext: string, skipComparison: boolean, typeNumber: number) => void;
}

const QrInspector: React.FC<QrInspectorProps> = ({ isScanning, onScan }) => {
    const [qrImageMode, setQrImageMode] = useState(false);
    const [cameraActive, setCameraActive] = useState(false);
    const [qrCapturedImage, setQrCapturedImage] = useState<string | null>(null);
    const [qrData, setQrData] = useState<string>('');
    const [qrScanStatus, setQrScanStatus] = useState('');
    const [showConfirmModal, setShowConfirmModal] = useState(false);
    const [showInputModal, setShowInputModal] = useState(false);
    const [predictedContext, setPredictedContext] = useState('');
    const [userExpectedText, setUserExpectedText] = useState('');
    const [qrTypeNumber, setQrTypeNumber] = useState<number | null>(null);

    const [stream, setStream] = useState<MediaStream | null>(null);
    const streamRef = useRef<MediaStream | null>(null);

    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const animationRef = useRef<number | null>(null);
    
    const [isListening, setIsListening] = useState(false);
    const recognitionRef = useRef<any>(null);

    useEffect(() => {
        if (typeof window !== 'undefined' && ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) {
            const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
            recognitionRef.current = new SpeechRecognition();
            recognitionRef.current.continuous = false;
            recognitionRef.current.interimResults = false;
            recognitionRef.current.lang = 'ko-KR';

            recognitionRef.current.onresult = (event: any) => {
                const transcript = event.results[0][0].transcript;
                setUserExpectedText((prev) => {
                    const newText = prev + (prev ? ' ' : '') + transcript;
                    return newText;
                });
                setIsListening(false);
            };

            recognitionRef.current.onerror = (event: any) => {
                console.error('Speech recognition error', event.error);
                setIsListening(false);
            };

            recognitionRef.current.onend = () => {
                setIsListening(false);
            };
        }
    }, []);

    const toggleListening = () => {
        if (!recognitionRef.current) {
            alert('이 브라우저는 음성 인식을 지원하지 않습니다.');
            return;
        }

        if (isListening) {
            recognitionRef.current.stop();
        } else {
            recognitionRef.current.start();
            setIsListening(true);
        }
    };

    const isMountedRef = useRef(true);
    const isStartingRef = useRef(false);

    useEffect(() => {
        const handleVisibilityChange = () => {
             if (document.hidden) {
                 stopCamera();
             }
        };
        
        document.addEventListener('visibilitychange', handleVisibilityChange);
        return () => {
            document.removeEventListener('visibilitychange', handleVisibilityChange);
        };
    }, []);

    useEffect(() => {
        isMountedRef.current = true;
        startCamera();
        
        return () => {
            isMountedRef.current = false;
            stopCamera();
        };
    }, []);

    useEffect(() => {
        if (cameraActive && stream && videoRef.current) {
            const videoEl = videoRef.current;
            videoEl.srcObject = stream;
            videoEl.setAttribute("playsinline", "true");
            
            const playPromise = videoEl.play();
            if (playPromise !== undefined) {
                playPromise.catch(e => {
                    if (e.name !== 'AbortError') {
                         console.error("Play error:", e);
                    }
                });
            }
            requestAnimationFrame(scanQRCode);
        }
    }, [cameraActive, stream]);

    const stopGlobalStream = () => {
        if (activeGlobalStream) {
            try {
                activeGlobalStream.getTracks().forEach(track => {
                    track.stop();
                    track.enabled = false;
                });
            } catch (e) {
                console.error("Error stopping global stream:", e);
            }
            activeGlobalStream = null;
        }
    };

    const startCamera = async () => {
        if (isStartingRef.current) return;
        isStartingRef.current = true;

        stopGlobalStream();
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
            streamRef.current = null;
        }

        setQrImageMode(false);
        setQrScanStatus('카메라 연결 중...');
        setQrCapturedImage(null);
        setQrData('');
        
        try {
            const mediaStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
            
            if (!isMountedRef.current) {
                mediaStream.getTracks().forEach(track => track.stop());
                stopGlobalStream();
                isStartingRef.current = false;
                return;
            }

            stopGlobalStream();

            setStream(mediaStream);
            streamRef.current = mediaStream; 
            activeGlobalStream = mediaStream;

            setCameraActive(true);
            setQrScanStatus('QR 코드를 카메라에 비춰주세요');
        } catch (err) {
            console.error("Camera error:", err);
            if (isMountedRef.current) {
                setQrScanStatus('카메라를 실행할 수 없습니다. 권한을 확인해주세요.');
            }
        } finally {
            isStartingRef.current = false;
        }
    };

    const stopCamera = () => {
        stopGlobalStream();

        const activeStream = streamRef.current; 
        if (activeStream) {
            activeStream.getTracks().forEach(track => track.stop());
            setStream(null);
            streamRef.current = null;
        }
        
        if (videoRef.current) {
            videoRef.current.srcObject = null;
            videoRef.current.load();
        }

        if (animationRef.current) {
            cancelAnimationFrame(animationRef.current);
            animationRef.current = null;
        }
        if (isMountedRef.current) {
           setCameraActive(false);
        }
    };

    const scanQRCode = () => {
        const video = videoRef.current;
        const canvas = canvasRef.current;
        if (!video || !canvas) return;

        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        if (!ctx) return;

        const scan = () => {
            if (!video.videoWidth || !video.videoHeight) {
                animationRef.current = requestAnimationFrame(scan);
                return;
            }

            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const code = jsQR(imageData.data, imageData.width, imageData.height);

            if (code) {
                const capturedImage = canvas.toDataURL('image/png');
                setQrCapturedImage(capturedImage);
                setQrData(code.data);
                stopCamera();
                processQRCode(code.data, capturedImage);
                return;
            }

            animationRef.current = requestAnimationFrame(scan);
        };

        animationRef.current = requestAnimationFrame(scan);
    };

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        stopCamera();
        setQrImageMode(true);
        setQrScanStatus('이미지 분석 중...');

        const reader = new FileReader();
        reader.onload = async (event) => {
            const imageBase64 = event.target?.result as string;
            setQrCapturedImage(imageBase64);

            try {
                const initResponse = await fetch('https://cslab.kku.ac.kr:8088/api/init/qr/', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ image: imageBase64 })
                });

                const initResult = await initResponse.json();
                
                if (initResult.type_number === -1) {
                    setQrScanStatus('QR 코드를 찾을 수 없어요. 다른 이미지를 시도해주세요.');
                    setQrImageMode(false);
                    return;
                }

                setQrData(initResult.qr_data);
                setQrTypeNumber(initResult.type_number);

                processQRCode(initResult.qr_data, imageBase64);
            } catch (err) {
                console.error('Image QR scan error:', err);
                setQrScanStatus('이미지 분석에 실패했어요.');
                setQrImageMode(false);
            }
        };
        reader.readAsDataURL(file);
    };

    const processQRCode = async (data: string, imageBase64: string) => {
        setQrScanStatus('QR 코드 분석 중...');
        
        const isUrl = /^(https?:\/\/|www\.)/i.test(data) || /\.(com|net|org|kr|co\.kr|io)/.test(data);
        const typeNum = isUrl ? 1 : 2;
        setQrTypeNumber(typeNum);

        try {
            const aiResponse = await fetch('https://cslab.kku.ac.kr:8088/api/ai/qr/', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ image: imageBase64 })
            });

            if (aiResponse.ok) {
                const aiResult = await aiResponse.json();
                if (aiResult.result_code === 1 && aiResult.prediction) {
                    setPredictedContext(aiResult.prediction);
                    setShowConfirmModal(true);
                    return;
                }
            }
            setShowInputModal(true);
        } catch (err) {
            console.error('AI QR prediction error:', err);
            setShowInputModal(true);
        }
    };

    const handleConfirmYes = () => {
        setUserExpectedText(predictedContext);
        setShowConfirmModal(false);
        onScan(qrData, qrCapturedImage!, predictedContext, false, qrTypeNumber!);
    };

    const handleConfirmNo = () => {
        setShowConfirmModal(false);
        setShowInputModal(true);
    };

    const handleInputSubmit = () => {
        setShowInputModal(false);
        onScan(qrData, qrCapturedImage!, userExpectedText, false, qrTypeNumber!);
    };

    const handleSkipComparison = () => {
        setShowInputModal(false);
        setShowConfirmModal(false);
        onScan(qrData, qrCapturedImage!, '', true, qrTypeNumber!);
    };

    const loadTestData = async () => {
        try {
            stopCamera();
            setQrImageMode(true);
            setQrScanStatus('테스트 이미지 로딩 중...');

            const response = await fetch('/test/qr.png');
            if (!response.ok) throw new Error('테스트 파일을 찾을 수 없습니다.');
            const blob = await response.blob();

            const reader = new FileReader();
            reader.onload = async (event) => {
                const imageBase64 = event.target?.result as string;
                setQrCapturedImage(imageBase64);

                try {
                    setQrScanStatus('QR 코드 디코딩 중...');
                    
                    const initResponse = await fetch('https://cslab.kku.ac.kr:8088/api/init/qr/', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ image: imageBase64 })
                    });

                    const initResult = await initResponse.json();
                    
                    if (initResult.type_number === -1) {
                        setQrScanStatus('테스트 QR 이미지에서 QR 코드를 찾을 수 없습니다.');
                        setQrImageMode(false);
                        alert('테스트 QR 이미지에서 QR 코드를 찾을 수 없습니다.');
                        return;
                    }

                    setQrData(initResult.qr_data);
                    setQrTypeNumber(initResult.type_number);

                    processQRCode(initResult.qr_data, imageBase64);
                } catch (err) {
                    console.error('Test QR scan error:', err);
                    setQrScanStatus('테스트 이미지 분석에 실패했습니다.');
                    setQrImageMode(false);
                    alert('테스트 이미지 분석에 실패했습니다.');
                }
            };
            reader.readAsDataURL(blob);
        } catch (e) {
            console.error('Test file load error:', e);
            alert('테스트 파일을 불러오는데 실패했습니다.');
        }
    };

    React.useEffect(() => {
        (window as any).__qrLoadTestData = loadTestData;
        return () => {
            delete (window as any).__qrLoadTestData;
        };
    }, []);


    return (
        <motion.div
            key="qr"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20, transition: { duration: 0 } }}
            className="w-full max-w-3xl mx-auto"
        >
            <div className="bg-neutral-900 rounded-2xl overflow-hidden shadow-xl aspect-[4/3] md:aspect-video relative mb-3 max-h-[400px] md:max-h-[500px]">
                {!qrCapturedImage && !cameraActive && !qrImageMode && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-6 bg-neutral-100 dark:bg-neutral-800">
                        <QrCode size={48} className="text-neutral-400 mb-4" />
                        <h3 className="text-lg font-bold text-neutral-700 dark:text-neutral-300 mb-2">
                            QR 코드 스캔
                        </h3>
                        <p className="text-sm text-neutral-500 mb-6 max-w-xs">
                            카메라를 켜거나 이미지를 업로드하여<br />QR 코드를 분석하세요.
                        </p>
                        <div className="flex gap-3">
                            <button
                                onClick={startCamera}
                                className="px-6 py-3 bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 rounded-xl font-bold flex items-center gap-2 hover:opacity-90 transition-opacity"
                            >
                                <Camera size={20} />
                                카메라 켜기
                            </button>
                            <label className="px-6 py-3 bg-white dark:bg-neutral-700 border border-neutral-200 dark:border-neutral-600 rounded-xl font-bold flex items-center gap-2 cursor-pointer hover:bg-neutral-50 dark:hover:bg-neutral-600 transition-colors text-neutral-900 dark:text-white">
                                <ImageIcon size={20} />
                                이미지 불러오기
                                <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
                            </label>
                        </div>
                    </div>
                )}

                {cameraActive && (
                    <div className="relative w-full h-full bg-black">
                        <video ref={videoRef} className="w-full h-full object-cover" />
                        <canvas ref={canvasRef} className="hidden" />
                        <div className="absolute inset-0 border-2 border-indigo-500 opacity-50 m-12 rounded-xl pointer-events-none animate-pulse">
                            <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-indigo-500 -mt-1 -ml-1"></div>
                            <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-indigo-500 -mt-1 -mr-1"></div>
                            <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-indigo-500 -mb-1 -ml-1"></div>
                            <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-indigo-500 -mb-1 -mr-1"></div>
                        </div>
                        <div className="absolute bottom-4 left-0 right-0 text-center text-white text-sm bg-black/50 py-2">
                            QR 코드를 사각형 안에 비춰주세요
                        </div>
                        <button 
                            onClick={stopCamera}
                            className="absolute top-4 right-4 p-2 bg-black/50 text-white rounded-full hover:bg-black/70"
                        >
                            <X size={20} />
                        </button>
                    </div>
                )}

                {qrCapturedImage && (
                    <div className="relative w-full h-full bg-black flex items-center justify-center">
                        <img src={qrCapturedImage} alt="Captured" className="max-w-full max-h-full object-contain" />
                        <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center">
                            <Loader2 className="animate-spin text-white mb-2" size={32} />
                            <p className="text-white font-medium">{qrScanStatus}</p>
                        </div>
                        <button 
                            onClick={() => {
                                setQrCapturedImage(null);
                                setQrImageMode(false);
                            }}
                            className="absolute top-4 right-4 p-2 bg-black/50 text-white rounded-full hover:bg-black/70"
                        >
                            <X size={20} />
                        </button>
                    </div>
                )}
            </div>

             <AnimatePresence>
                {showConfirmModal && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
                        onClick={() => setShowConfirmModal(false)}
                    >
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            onClick={(e) => e.stopPropagation()}
                            className="bg-white dark:bg-neutral-900 rounded-2xl shadow-2xl p-6 max-w-md w-full"
                        >
                            <div className="text-center mb-6">
                                <QrCode size={48} className="mx-auto text-indigo-500 mb-4" />
                                <h3 className="text-xl font-bold text-neutral-900 dark:text-white mb-2">
                                    이 QR 코드의 목적이 맞나요?
                                </h3>
                                <p className="text-neutral-600 dark:text-neutral-400 text-sm">
                                    AI가 분석한 결과, 이 QR 코드는:
                                </p>
                                <div className="mt-4 p-4 bg-indigo-50 dark:bg-indigo-950 rounded-xl">
                                    <p className="text-indigo-700 dark:text-indigo-300 font-medium">
                                        "{predictedContext}"
                                    </p>
                                </div>
                                <p className="text-neutral-500 text-sm mt-3">
                                    을(를) 위한 것으로 보입니다.
                                </p>
                            </div>
                            <div className="flex gap-3">
                                <button
                                    onClick={handleConfirmNo}
                                    className="flex-1 py-3 px-4 bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-300 rounded-xl font-medium transition-colors"
                                >
                                    아니요
                                </button>
                                <button
                                    onClick={handleConfirmYes}
                                    className="flex-1 py-3 px-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-medium transition-colors"
                                >
                                    네, 맞아요
                                </button>
                            </div>
                            <button
                                onClick={handleSkipComparison}
                                className="w-full mt-3 py-2 text-sm text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300 transition-colors"
                            >
                                이 단계 건너뛰기
                            </button>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            <AnimatePresence>
                {showInputModal && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
                        onClick={() => setShowInputModal(false)}
                    >
                         <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            onClick={(e) => e.stopPropagation()}
                            className="bg-white dark:bg-neutral-900 rounded-2xl shadow-2xl p-6 max-w-md w-full"
                        >
                            <div className="text-center mb-6">
                                <QrCode size={48} className="mx-auto text-amber-500 mb-4" />
                                <h3 className="text-xl font-bold text-neutral-900 dark:text-white mb-2">
                                    이 QR 코드의 목적은 무엇인가요?
                                </h3>
                                <p className="text-neutral-600 dark:text-neutral-400 text-sm">
                                    QR 코드를 스캔하려는 목적을 알려주세요.
                                </p>
                                {qrData && (
                                    <div className="mt-3 p-3 bg-neutral-100 dark:bg-neutral-800 rounded-lg">
                                        <p className="text-xs text-neutral-500 mb-1">감지된 QR 데이터:</p>
                                        <p className="text-sm text-neutral-700 dark:text-neutral-300 font-mono break-all">
                                            {qrData.length > 100 ? qrData.slice(0, 100) + '...' : qrData}
                                        </p>
                                    </div>
                                )}
                            </div>
                            <div className="relative mb-4">
                                <input
                                    type="text"
                                    value={userExpectedText}
                                    onChange={(e) => setUserExpectedText(e.target.value)}
                                    placeholder={isListening ? "듣고 있어요..." : "예: 네이버 로그인, 결제 페이지, 쿠폰 등록..."}
                                    className={`w-full px-4 py-3 pr-12 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl text-neutral-800 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-amber-500 transition-colors ${
                                        isListening ? 'ring-2 ring-red-400 border-red-400 bg-red-50 dark:bg-red-900/10' : ''
                                    }`}
                                />
                                <button
                                    onClick={toggleListening}
                                    className={`absolute right-3 top-1/2 -translate-y-1/2 p-2 rounded-full transition-all ${
                                        isListening 
                                        ? 'bg-red-500 text-white animate-pulse shadow-lg shadow-red-200 dark:shadow-none' 
                                        : 'text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-700'
                                    }`}
                                    title="음성으로 입력하기"
                                >
                                    {isListening ? <MicOff size={18} /> : <Mic size={18} />}
                                </button>
                            </div>
                            <div className="flex gap-3">
                                <button
                                    onClick={handleSkipComparison}
                                    className="flex-1 py-3 px-4 bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-300 rounded-xl font-medium transition-colors"
                                >
                                    건너뛰기
                                </button>
                                <button
                                    onClick={handleInputSubmit}
                                    disabled={!userExpectedText.trim()}
                                    className={`flex-1 py-3 px-4 rounded-xl font-medium transition-colors ${
                                        userExpectedText.trim() 
                                            ? 'bg-amber-600 hover:bg-amber-700 text-white' 
                                            : 'bg-neutral-300 dark:bg-neutral-700 text-neutral-500 cursor-not-allowed'
                                    }`}
                                >
                                    확인
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
};

export default QrInspector;
