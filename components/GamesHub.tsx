import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import PuzzleGame from './PuzzleGame';
import MemoryGame from './MemoryGame';
import { GalleryImage } from '../types';
import GameIcon from './icons/GameIcon';
import BrainIcon from './icons/BrainIcon';
import ArtstepsViewer from './ArtstepsViewer';
import World3DIcon from './icons/World3DIcon';
import CloseIcon from './icons/CloseIcon';
import AppStoreIcon from './icons/AppStoreIcon';
import GooglePlayIcon from './icons/GooglePlayIcon';
import ChevronLeftIcon from './icons/ChevronLeftIcon';

interface GamesHubProps {
    galleryImages: GalleryImage[];
    isMobile?: boolean;
    currentUser: string;
}

// --- Standalone Artsteps Modal Component ---
interface ArtstepsModalProps {
    modalState: 'closed' | 'select' | 'app-info';
    setModalState: (state: 'closed' | 'select' | 'app-info') => void;
    onSelectBrowserPlay: () => void;
}

const ArtstepsModal: React.FC<ArtstepsModalProps> = ({ modalState, setModalState, onSelectBrowserPlay }) => {
    if (modalState === 'closed') return null;

    const artstepsUrl = "https://www.artsteps.com/view/68655877b52eb9ad69c492a5";
    const artstepsAndroidUrl = "https://play.google.com/store/apps/details?id=gr.dataverse.artstepsv2&hl=es_SV";
    const artstepsIosUrl = "https://apps.apple.com/gb/app/artsteps/id1421672085?l=es";

    const content = (
         <div 
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[70001] flex items-center justify-center p-4 animate-fade-in" 
            onClick={() => setModalState('closed')}
        >
            <div 
                className="bg-white/90 dark:bg-gray-800/90 rounded-2xl shadow-xl w-full max-w-md animate-pop-in relative overflow-hidden" 
                onClick={e => e.stopPropagation()}
            >
                <button onClick={() => setModalState('closed')} className="absolute top-2 right-2 p-2 rounded-full text-gray-500 hover:bg-black/5 dark:hover:bg-white/5 z-10"><CloseIcon /></button>
                
                {modalState === 'select' && (
                    <div className="p-8 text-center">
                        <h2 className="text-xl font-bold text-primary-dark dark:text-primary mb-4">Explorar Galería 3D</h2>
                        <p className="text-gray-600 dark:text-gray-300 mb-6">Para la mejor experiencia, especialmente en móvil, te recomendamos usar la aplicación de Artsteps.</p>
                        <div className="flex flex-col gap-3">
                            <button onClick={() => setModalState('app-info')} className="w-full bg-primary text-white font-bold rounded-full px-6 py-3 shadow-md hover:bg-primary-dark transform hover:scale-105 transition-all">
                                Jugar en la App (Recomendado)
                            </button>
                            <button onClick={onSelectBrowserPlay} className="w-full bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 font-bold rounded-full px-6 py-2 hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors">
                                Jugar en el Navegador
                            </button>
                        </div>
                    </div>
                )}

                {modalState === 'app-info' && (
                    <div className="p-8 text-center">
                        <button onClick={() => setModalState('select')} className="absolute top-2 left-2 p-2 rounded-full text-gray-500 hover:bg-black/5 dark:hover:bg-white/5 flex items-center gap-1 text-sm z-10"><ChevronLeftIcon /> Volver</button>
                        <h2 className="text-xl font-bold text-primary-dark dark:text-primary mb-2">Descarga la App</h2>
                        <p className="text-gray-600 dark:text-gray-300 mb-6">Instala la app gratuita de Artsteps para una experiencia inmersiva con mejores controles.</p>
                        <div className="flex flex-col sm:flex-row justify-center items-center gap-4 mb-6">
                            <a href={artstepsIosUrl} target="_blank" rel="noopener noreferrer" className="bg-white rounded-lg p-2 transition-transform hover:scale-105 shadow-md h-16 w-48 flex justify-center items-center">
                                <AppStoreIcon />
                            </a>
                            <a href={artstepsAndroidUrl} target="_blank" rel="noopener noreferrer" className="bg-white rounded-lg p-2 transition-transform hover:scale-105 shadow-md h-16 w-48 flex justify-center items-center">
                                <GooglePlayIcon />
                            </a>
                        </div>
                         <a href={artstepsUrl} target="_blank" rel="noopener noreferrer" className="w-full inline-block bg-primary text-white font-bold rounded-full px-6 py-3 shadow-md hover:bg-primary-dark transform hover:scale-105 transition-all">
                            ¡Jugar Ahora!
                        </a>
                         <p className="text-xs text-gray-500 dark:text-gray-400 mt-3">Esto intentará abrir la aplicación si ya está instalada.</p>
                    </div>
                )}
            </div>
        </div>
    );
    return createPortal(content, document.body);
};


const GamesHub: React.FC<GamesHubProps> = ({ galleryImages, isMobile, currentUser }) => {
    const [activeGame, setActiveGame] = useState<'hub' | 'puzzle' | 'memory' | 'artsteps'>('hub');
    const [artstepsModalState, setArtstepsModalState] = useState<'closed' | 'select' | 'app-info'>('closed');

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
        <>
            <div className="w-full h-full flex flex-col p-4 md:p-8 bg-transparent overflow-y-auto">
                <div className="w-full max-w-3xl mx-auto">
                    <div className="text-center mb-8">
                        <h1 className="text-2xl md:text-3xl font-bold text-primary-dark dark:text-primary">Centro de Juegos</h1>
                        <p className="text-gray-600 dark:text-gray-300 mt-2">Un espacio para relajarte y conectar contigo.</p>
                    </div>

                    <div className="space-y-4">
                        <button 
                            onClick={() => setActiveGame('puzzle')}
                            className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-sm rounded-2xl p-4 text-left shadow-lg hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex items-center gap-4 w-full"
                        >
                            <div className="p-3 bg-primary-light/50 dark:bg-primary/20 rounded-xl text-primary-dark dark:text-primary">
                                <GameIcon />
                            </div>
                            <div>
                                <h2 className="font-bold text-lg text-primary-dark dark:text-primary">Rompecabezas de Recuerdos</h2>
                                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Arma tus fotos favoritas pieza por pieza.</p>
                            </div>
                        </button>
                        
                        <button 
                            onClick={() => setActiveGame('memory')}
                            className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-sm rounded-2xl p-4 text-left shadow-lg hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex items-center gap-4 w-full"
                        >
                            <div className="p-3 bg-secondary-light/50 dark:bg-secondary/20 rounded-xl text-secondary-dark dark:text-secondary">
                                <BrainIcon />
                            </div>
                            <div>
                                <h2 className="font-bold text-lg text-secondary-dark dark:text-secondary">Juego de Memoria</h2>
                                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Encuentra los pares de tus recuerdos.</p>
                            </div>
                        </button>
                        
                        <button 
                            onClick={() => setArtstepsModalState('select')}
                            className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-sm rounded-2xl p-4 text-left shadow-lg hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex items-center gap-4 w-full"
                        >
                            <div className="p-3 bg-blue-200/50 dark:bg-blue-500/20 rounded-xl text-blue-500 dark:text-blue-300">
                                <World3DIcon />
                            </div>
                            <div>
                                <h2 className="font-bold text-lg text-blue-600 dark:text-blue-300">Galería Virtual 3D</h2>
                                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Explora un espacio virtual inmersivo.</p>
                            </div>
                        </button>

                        <div className="bg-white/50 dark:bg-gray-800/50 backdrop-blur-sm rounded-2xl p-4 text-left shadow-md flex items-center gap-4 opacity-60 cursor-not-allowed w-full">
                            <div className="p-3 bg-gray-200/50 dark:bg-gray-700/50 rounded-xl text-gray-400 dark:text-gray-500">
                                <GameIcon />
                            </div>
                            <div>
                                <h2 className="font-bold text-lg text-gray-500 dark:text-gray-400">Próximamente</h2>
                                <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">Nuevos juegos para tu bienestar.</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            <ArtstepsModal 
                modalState={artstepsModalState}
                setModalState={setArtstepsModalState}
                onSelectBrowserPlay={() => setActiveGame('artsteps')}
            />
        </>
    );
};

export default GamesHub;