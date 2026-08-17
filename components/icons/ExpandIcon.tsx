import React from 'react';

const ExpandIcon: React.FC<{ className?: string }> = ({ className = "h-5 w-5" }) => (
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    className={className} 
    fill="none" 
    viewBox="0 0 24 24" 
    stroke="currentColor" 
    strokeWidth={2}
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M15 3h6v6M9 21H3v-6M21 15v6h-6M3 9V3h6" />
  </svg>
);

export default ExpandIcon;
