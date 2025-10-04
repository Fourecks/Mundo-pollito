import React from 'react';
import ChevronLeftIcon from './icons/ChevronLeftIcon';

interface ArtstepsViewerProps {
    onBack: () => void;
}

const ArtstepsViewer: React.FC<ArtstepsViewerProps> = ({ onBack }) => {
    return (
        <div className="artsteps-viewer-container w-full h-full bg-gray-100 dark:bg-gray-900 flex flex-col">
            <header className="p-3 border-b border-secondary-light/30 dark:border-gray-700/50 flex items-center flex-shrink-0">
                <button 
                    onClick={onBack} 
                    className="flex items-center gap-2 p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/5 text-sm text-primary-dark dark:text-primary font-semibold"
                >
                    <ChevronLeftIcon /> Volver
                </button>
            </header>
            <div className="flex-grow bg-black">
                <iframe 
                    src="https://www.artsteps.com/embed/68655877b52eb9ad69c492a5/560/315" 
                    frameBorder="0" 
                    allowFullScreen
                    className="w-full h-full border-none"
                    title="Artsteps Virtual Gallery"
                ></iframe>
            </div>
        </div>
    );
};

export default ArtstepsViewer;