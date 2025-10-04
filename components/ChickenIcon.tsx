

import React from 'react';

interface ChickenIconProps {
  className?: string;
}

const ChickenIcon: React.FC<ChickenIconProps> = ({ className }) => {
  return (
    <svg 
      className={className} 
      viewBox="0 0 200 200" 
      fill="currentColor" 
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d="M157.9 76.5C157.9 56.4 141.5 40 121.4 40C109.8 40 100.2 45.4 94.1 53.6C91.5 45.9 84.1 40 75.5 40C64.9 40 56.3 48.6 56.3 59.2C56.3 60.7 56.4 62.1 56.6 63.5C41.1 69.3 30.1 83.9 30.1 100.9C30.1 122.9 47.7 140.5 69.7 140.5H137.9C152.1 140.5 163.6 129 163.6 114.8C163.6 102.3 154.5 91.8 142.6 90.1C152.1 87.2 157.9 80.3 157.9 76.5Z" opacity="0.8"/>
      <circle cx="128" cy="65" r="5" fill="#2d2d2d"/>
      <path d="M94.1 53.6C92.2 49 88.5 46.2 84.1 46.2C81 46.2 78.1 47.4 76.2 49.3L94.1 53.6Z" fill="#ff6b6b"/>
      <path d="M140 105L145 110L140 115" stroke="var(--color-secondary)" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
    </svg>
  );
};

export default ChickenIcon;