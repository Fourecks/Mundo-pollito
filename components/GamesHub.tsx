import React, { useState, useEffect } from 'react';
import PuzzleGame from './PuzzleGame';
import MemoryGame from './MemoryGame';
import { GalleryImage } from '../types';
import GameIcon from './icons/GameIcon';
import BrainIcon from './icons/BrainIcon';
import ArtstepsViewer from './ArtstepsViewer';
import World3DIcon from './icons/World3DIcon';

interface GamesHubProps {
    galleryImages: GalleryImage[];
    isMobile?: boolean;
    currentUser: string;
}

const GamesHub: React.FC<GamesHubProps> = ({ galleryImages, isMobile, currentUser }) => {
    const [activeGame, setActiveGame] = useState<'hub' | 'puzzle' | 'memory' | 'artsteps'>('hub');
    
    useEffect(() => {
        if (isMobile && activeGame !== 'hub') {
            document.body.classList.add('landscape-game-mode');
        } else {
            document.body.classList.remove('landscape-game-mode');
        }
        return () => {
            document.body.classList.remove('landscape-game-mode');
        };
    }, [isMobile, activeGame]);

    if (activeGame === 'puzzle') {
        return <PuzzleGame images={galleryImages} onBack={() => setActiveGame('hub')} isMobile={isMobile} />;
    }

    if (activeGame === 'memory') {
        return <MemoryGame images={galleryImages} onBack={() => setActiveGame('hub')} isMobile={isMobile} />;
    }
    
    if (activeGame === 'artsteps') {
        return <ArtstepsViewer onBack={() => setActiveGame('hub')} />;
    }
    
    return (
        <div className="w-full h-full flex flex-col items-center justify-center p-4 md:p-8 bg-yellow-50/30 dark:bg-gray-900/30 overflow-y-auto">
            <h1 className="text-2xl md:text-3xl font-bold text-primary-dark dark:text-primary mb-6">Centro de Juegos Emocionales</h1>
            <p className="text-gray-600 dark:text-gray-300 text-center mb-8 max-w-lg">
                Un espacio para relajarte, conectar contigo y encontrar paz a través de juegos sencillos y significativos.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-3xl">
                {/* Puzzle Game Card */}
                <button 
                    onClick={() => setActiveGame('puzzle')}
                    className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-sm rounded-2xl p-6 text-left shadow-lg hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex items-center gap-4"
                >
                    <div className="p-3 bg-primary-light/50 dark:bg-primary/20 rounded-xl text-primary-dark dark:text-primary">
                        <GameIcon />
                    </div>
                    <div>
                        <h2 className="font-bold text-lg text-primary-dark dark:text-primary">Rompecabezas de Recuerdos</h2>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Arma tus fotos favoritas y revive momentos especiales pieza por pieza.</p>
                    </div>
                </button>
                
                 {/* Memory Game Card */}
                <button 
                    onClick={() => setActiveGame('memory')}
                    className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-sm rounded-2xl p-6 text-left shadow-lg hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex items-center gap-4"
                >
                    <div className="p-3 bg-secondary-light/50 dark:bg-secondary/20 rounded-xl text-secondary-dark dark:text-secondary">
                        <BrainIcon />
                    </div>
                    <div>
                        <h2 className="font-bold text-lg text-secondary-dark dark:text-secondary">Juego de Memoria</h2>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Encuentra los pares de tus recuerdos y ejercita tu mente con cariño.</p>
                    </div>
                </button>
                
                {/* Artsteps Game Card */}
                <button 
                    onClick={() => setActiveGame('artsteps')}
                    className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-sm rounded-2xl p-6 text-left shadow-lg hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex items-center gap-4"
                >
                    <div className="p-3 bg-blue-200/50 dark:bg-blue-500/20 rounded-xl text-blue-500 dark:text-blue-300">
                        <World3DIcon />
                    </div>
                    <div>
                        <h2 className="font-bold text-lg text-blue-600 dark:text-blue-300">Galería Virtual 3D</h2>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Explora un espacio virtual inmersivo.</p>
                    </div>
                </button>

                {/* Coming Soon Card */}
                <div className="bg-white/50 dark:bg-gray-800/50 backdrop-blur-sm rounded-2xl p-6 text-left shadow-md flex items-center gap-4 opacity-60 cursor-not-allowed">
                    <div className="p-3 bg-gray-200/50 dark:bg-gray-700/50 rounded-xl text-gray-400 dark:text-gray-500">
                        <GameIcon />
                    </div>
                    <div>
                        <h2 className="font-bold text-lg text-gray-500 dark:text-gray-400">Próximamente</h2>
                        <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">Nuevas experiencias y juegos para tu bienestar están en camino.</p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default GamesHub;