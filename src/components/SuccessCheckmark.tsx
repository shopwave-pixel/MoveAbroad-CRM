import React from 'react';
import { motion } from 'motion/react';

interface SuccessCheckmarkProps {
  size?: number;
  message?: string;
}

export default function SuccessCheckmark({ size = 32, message }: SuccessCheckmarkProps) {
  return (
    <div className="flex flex-col items-center justify-center p-3 text-center space-y-2 select-none">
      <motion.div
        initial={{ scale: 0.6, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.15, ease: "easeOut" }}
        className="rounded-full bg-emerald-50 dark:bg-emerald-950/20 p-2.5 border border-emerald-100 dark:border-emerald-900/30 flex items-center justify-center shrink-0"
      >
        <svg
          className="text-emerald-600 dark:text-emerald-400"
          width={size}
          height={size}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="3.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <motion.path
            d="M20 6L9 17l-5-5"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 0.18, ease: "easeInOut" }}
          />
        </svg>
      </motion.div>
      {message && (
        <motion.p 
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.12 }}
          className="text-[13px] font-bold text-emerald-800 dark:text-emerald-400 uppercase tracking-wide"
        >
          {message}
        </motion.p>
      )}
    </div>
  );
}
