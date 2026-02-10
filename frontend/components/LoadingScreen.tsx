import React from 'react';
import { motion } from 'framer-motion';
import { Fingerprint } from 'lucide-react';

const LoadingScreen: React.FC = () => {
  return (
    <div className="fixed inset-0 bg-neutral-950 flex flex-col items-center justify-center z-[100]">
      <div className="relative mb-8">
        {/* Background Fingerprint (Dimmed) */}
        <Fingerprint size={100} className="text-neutral-800" strokeWidth={1} />
        
        {/* Foreground Fingerprint (Light up) */}
        <motion.div
          initial={{ opacity: 0.3 }}
          animate={{ opacity: [0.3, 1, 0.3] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          className="absolute inset-0 text-blue-500"
        >
             <Fingerprint size={100} strokeWidth={1} />
        </motion.div>
        
        {/* Scanning Laser Line */}
        <motion.div
            className="absolute left-0 right-0 h-0.5 bg-blue-400 shadow-[0_0_20px_rgba(96,165,250,1)]"
            initial={{ top: '0%' }}
            animate={{ top: ['0%', '100%', '0%'] }}
            transition={{ duration: 2.5, ease: "linear", repeat: Infinity }}
        />
      </div>
      
      <div className="text-center">
        <h2 className="text-white font-bold text-xl tracking-wider mb-2">피싱가드</h2>
        <p className="text-neutral-500 text-xs font-medium tracking-[0.2em] animate-pulse">
            잠시만 기다려주세요...
        </p>
      </div>
    </div>
  );
};

export default LoadingScreen;