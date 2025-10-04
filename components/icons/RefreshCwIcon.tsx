
import React from 'react';

const RefreshCwIcon: React.FC<{className?: string}> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className || "h-5 w-5"} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h5M20 20v-5h-5m-4-1a9 9 0 0110.46-7.87M4.13 15.04A9 9 0 014 12" />
    </svg>
);

export default RefreshCwIcon;