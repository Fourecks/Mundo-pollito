import React from 'react';

const BrowserIcon: React.FC = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 24 24" fill="currentColor">
    {/* Body */}
    <path d="M12,10c-3.3,0-6,2.7-6,6v2h12v-2C18,12.7,15.3,10,12,10z"/>
    {/* Head */}
    <circle cx="12" cy="7" r="4"/>
    {/* Beak */}
    <polygon points="16,7 17.5,8 16,9" fill="#FFC107"/>
  </svg>
);

export default BrowserIcon;
