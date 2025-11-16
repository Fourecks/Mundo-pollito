import React from 'react';

const GoldenEggIcon: React.FC = () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="w-5 h-5">
        <defs>
            <radialGradient id="eggGradient" cx="0.4" cy="0.4" r="0.6">
                <stop offset="0%" stopColor="#FFFBEB" />
                <stop offset="60%" stopColor="#FBBF24" />
                <stop offset="100%" stopColor="#B45309" />
            </radialGradient>
        </defs>
        <path 
            d="M12 2C9 2 6 7 6 12c0 5 3 10 6 10s6-5 6-10c0-5-3-10-6-10z" 
            fill="url(#eggGradient)"
        />
        <path 
            d="M10 5 C 10 5, 9 6, 9.5 7 S 11 8, 11 7 C 11.5 6, 11 5, 10 5 Z"
            fill="white"
            opacity="0.7"
        />
    </svg>
);

export default GoldenEggIcon;