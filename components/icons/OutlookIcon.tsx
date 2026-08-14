import React from 'react';

interface IconProps {
  className?: string;
}

const OutlookIcon: React.FC<IconProps> = ({ className = 'w-5 h-5' }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    {/* Right envelope/document part (layered blues) */}
    <path d="M12 5.5H20C21.1 5.5 22 6.4 22 7.5V16.5C22 17.6 21.1 18.5 20 18.5H12V5.5Z" fill="#106EBE" />
    <path d="M12 7.5L17 11.5L22 7.5V17C22 17.83 21.17 18.5 20.33 18.5H12V7.5Z" fill="#0078D4" />
    <path d="M12 11.5L17 15.5L22 11.5V17.5C22 18.05 21.45 18.5 20.9 18.5H12V11.5Z" fill="#28A8EA" opacity="0.85" />
    
    {/* Left overlapping plate for the 'O' */}
    <rect x="2" y="4.5" width="11" height="15" rx="2.5" fill="#005A9E" stroke="#ffffff" strokeWidth="1" />
    
    {/* The white letter O */}
    <circle cx="7.5" cy="12" r="3" stroke="#ffffff" strokeWidth="2.2" fill="none" />
  </svg>
);

export default OutlookIcon;
