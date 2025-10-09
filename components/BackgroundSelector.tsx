import React, { useState, useRef, useEffect } from 'react';
import { Background } from '../types';
import BackgroundIcon from './icons/BackgroundIcon';
import UploadIcon from './icons/UploadIcon';
import TrashIcon from './icons/TrashIcon';
import StarIcon from './icons/StarIcon';
import CloseIcon from './icons/CloseIcon';
import ConfirmationModal from './ConfirmationModal';
import VideoIcon from './icons/VideoIcon';
import ImageIcon from './icons/ImageIcon';


interface BackgroundSelectorProps {
    activeBackground: Background | null;
    userBackgrounds: Background[];
    onSelect: (background: Background | null) => void;
    onAddBackground: (file: File) => void;
    onDeleteBackground: (id: string) => void;
    onToggleFavorite: (id: string) => void;
}

const BackgroundSelector: React.FC<BackgroundSelectorProps> = ({
    activeBackground,
    userBackgrounds,
    onSelect,
    onAddBackground,
    onDeleteBackground,
    onToggleFavorite,
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const [view, setView] = useState<'all' | 'favorites'>('all');
    const [bgToDelete, setBgToDelete] = useState<Background | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            onAddBackground(file);
        }
        if (event.target) event.target.value = '';
    };

    const triggerFileUpload = () => fileInputRef.current?.click();
    
    const confirmDelete = () => {
        if(bgToDelete) {
            onDeleteBackground(bgToDelete.id);
            setBgToDelete(null);
        }
    };
    
    const filteredBackgrounds = view === 'favorites' ? userBackgrounds.filter(bg => bg.isFavorite) : userBackgrounds;

    return (
        <>
            <button
                onClick={() => setIsOpen(true)}
                className="bg-white/70 dark:bg-gray-900/70 backdrop-blur-sm text-gray-700 dark:text-gray-300 hover:text-primary p-3 rounded-full shadow-lg transition-all duration-300 hover:scale-110"
                aria-label="Seleccionar fondo animado"
            >
                <BackgroundIcon />
            </button>

            {isOpen && (
                <div
                    className="fixed inset-0 bg-black/30 backdrop-blur-sm z-[60000]"
                    onClick={() => setIsOpen(false)}
                >
                    <div
                        className="fixed top-0 right-0 h-full w-full max-w-sm bg-secondary-lighter/90 dark:bg-gray-800/90 backdrop-blur-xl shadow-2xl flex flex-col transition-transform duration-300 transform animate-slide-in"
                        onClick={e => e.stopPropagation()}
                    >
                        <header className="flex items-center justify-between p-4 border-b border-secondary-light/50 dark:border-gray-700/50 flex-shrink-0">
                            <h2 className="text-xl font-bold text-primary-dark dark:text-primary">Fondos Animados</h2>
                            <button onClick={() => setIsOpen(false)} className="p-2 rounded-full text-gray-500 dark:text-gray-400 hover:bg-primary-light/50 dark:hover:bg-gray-700 hover:text-primary-dark transition-colors"><CloseIcon /></button>
                        </header>
                        
                        <div className="p-2 border-b border-secondary-light/50 dark:border-gray-700/50 flex-shrink-0">
                            <div className="bg-black/5 dark:bg-black/20 rounded-full p-1 flex items-center gap-1">
                                <button onClick={() => setView('all')} className={`w-full py-1.5 text-xs sm:text-sm font-semibold rounded-full transition-colors ${view === 'all' ? 'bg-white dark:bg-gray-600 shadow text-primary-dark dark:text-gray-100' : 'text-gray-600 dark:text-gray-300 hover:bg-white/50 dark:hover:bg-black/20'}`}>Todos</button>
                                <button onClick={() => setView('favorites')} className={`w-full py-1.5 text-xs sm:text-sm font-semibold rounded-full transition-colors ${view === 'favorites' ? 'bg-white dark:bg-gray-600 shadow text-primary-dark dark:text-gray-100' : 'text-gray-600 dark:text-gray-300 hover:bg-white/50 dark:hover:bg-black/20'}`}>Favoritos</button>
                            </div>
                        </div>

                        <main className="flex-grow p-4 overflow-y-auto custom-scrollbar">
                            <div className="grid grid-cols-2 gap-4">
                                {view === 'all' && (
                                    <>
                                        {/* Upload Button */}
                                        <button
                                            onClick={triggerFileUpload}
                                            className="bg-white/60 dark:bg-gray-700/60 rounded-lg shadow-sm hover:shadow-md transition-all duration-200 flex flex-col items-center justify-center text-center p-4 text-gray-500 dark:text-gray-400 hover:text-primary-dark dark:hover:text-primary"
                                        >
                                            <UploadIcon />
                                            <span className="text-xs font-semibold mt-2">Subir nuevo</span>
                                        </button>

                                        {/* Default background reset */}
                                        <button
                                            onClick={() => onSelect(null)}
                                            className={`bg-white/60 dark:bg-gray-700/60 rounded-lg shadow-sm hover:shadow-md transition-all duration-200 flex flex-col items-center justify-center text-center p-4 text-gray-500 dark:text-gray-400 ${!activeBackground ? 'ring-2 ring-primary' : ''}`}
                                        >
                                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-secondary-light via-primary-light to-secondary-lighter dark:from-gray-800 dark:via-primary/50 dark:to-gray-900"></div>
                                            <span className="text-xs font-semibold mt-2">Original</span>
                                        </button>
                                    </>
                                )}

                                {filteredBackgrounds.map(bg => (
                                    <div key={bg.id} className="group relative">
                                        <button
                                            onClick={() => onSelect(bg)}
                                            className={`w-full aspect-video rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-all duration-200 block ${activeBackground?.id === bg.id ? 'ring-2 ring-primary' : ''}`}
                                        >
                                            {bg.type === 'video' ? (
                                                <video src={bg.url} className="w-full h-full object-cover" />
                                            ) : (
                                                <div className="w-full h-full bg-cover bg-center" style={{ backgroundImage: `url(${bg.url})` }} />
                                            )}
                                            <div className="absolute inset-0 bg-black/20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                                {bg.type === 'video' ? <VideoIcon /> : <ImageIcon />}
                                            </div>
                                        </button>
                                        <div className="absolute top-1 right-1 flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button
                                                onClick={() => onToggleFavorite(bg.id)}
                                                className="p-1.5 rounded-full bg-black/30 text-white hover:bg-yellow-500 backdrop-blur-sm"
                                                title={bg.isFavorite ? 'Quitar de favoritos' : 'Añadir a favoritos'}
                                            >
                                                <StarIcon filled={!!bg.isFavorite} className="h-4 w-4" />
                                            </button>
                                            <button
                                                onClick={() => setBgToDelete(bg)}
                                                className="p-1.5 rounded-full bg-black/30 text-white hover:bg-red-500 backdrop-blur-sm"
                                                title="Eliminar fondo"
                                            >
                                                <TrashIcon className="h-4 w-4" />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                            {filteredBackgrounds.length === 0 && view === 'favorites' && (
                                <div className="text-center text-gray-500 dark:text-gray-400 py-10 col-span-2">
                                    <p className="font-medium">No tienes fondos favoritos.</p>
                                    <p className="text-sm">¡Añade algunos para verlos aquí!</p>
                                </div>
                            )}
                        </main>
                    </div>
                </div>
            )}
            <ConfirmationModal 
                isOpen={!!bgToDelete}
                onClose={() => setBgToDelete(null)}
                onConfirm={confirmDelete}
                title="Eliminar Fondo"
                message={`¿Seguro que quieres eliminar "${bgToDelete?.name}"? Esta acción no se puede deshacer.`}
                confirmText="Eliminar"
                cancelText="Cancelar"
            />
            <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*,video/*" className="hidden"/>
        </>
    );
};

export default BackgroundSelector;