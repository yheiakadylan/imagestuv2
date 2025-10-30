import React from 'react';

interface ProgressBarProps {
    value: number; // 0 to 100
    className?: string;
}

const ProgressBar: React.FC<ProgressBarProps> = ({ value, className = '' }) => {
    return (
        <div className={`w-full bg-black/20 rounded-full h-2 overflow-hidden border border-white/10 ${className}`}>
            <div 
                className="bg-gradient-to-r from-blue-500 to-cyan-400 h-full rounded-full transition-all duration-300" 
                style={{ width: `${Math.max(0, Math.min(100, value))}%` }}
            ></div>
        </div>
    );
};

export default ProgressBar;
