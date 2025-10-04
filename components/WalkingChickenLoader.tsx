import React from 'react';
import ChickenIcon from './ChickenIcon';

const WalkingChickenLoader: React.FC = () => {
    return (
        <div className="flex flex-col items-center justify-center h-full text-center bg-gradient-to-br from-yellow-50 via-pink-50 to-white p-4 overflow-hidden">
            <div className="relative w-40 h-32">
                <div className="absolute inset-x-0 bottom-8 h-24">
                    <div className="animate-walk-cycle w-24 h-24 mx-auto">
                        <ChickenIcon className="w-full h-full text-pink-400" />
                    </div>
                </div>
                <div className="absolute bottom-8 left-1/2 -translate-x-1/2 w-16 h-3 bg-black rounded-full animate-shadow-cycle"></div>
            </div>
            <p className="text-xl font-semibold text-gray-600 -mt-4 animate-pulse">
                El pollito está buscando...
            </p>
        </div>
    );
};

export default WalkingChickenLoader;
