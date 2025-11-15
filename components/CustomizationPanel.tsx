import React, { useState, useRef, useMemo } from 'react';
import { Background, ParticleType, AmbientSoundType, ThemeColors } from '../types';
import CloseIcon from './icons/CloseIcon';
import ThemeCustomizer from './ThemeCustomizer';

// Icons for Backgrounds
import UploadIcon from './icons/UploadIcon';
import TrashIcon from './icons/TrashIcon';
import StarIcon from './icons/StarIcon';
import VideoIcon from './icons/VideoIcon';
import ImageIcon from './icons/ImageIcon';
import ConfirmationModal from './ConfirmationModal';
import ChickenIcon from './ChickenIcon';

// Icons for Ambience
import SnowIcon from './icons/SnowIcon';
import RainIcon from './icons/RainIcon';
import StarsIcon from './icons/StarsIcon';
import BubblesIcon from './icons/BubblesIcon';
import SparksIcon from './icons/SparksIcon';
import ParticlesOffIcon from './icons/ParticlesOffIcon';
import ForestIcon from './icons/ForestIcon';
import CoffeeIcon from './icons/CoffeeIcon';
import WaveIcon from './icons/WaveIcon';
import SoundOffIcon from './icons/SoundOffIcon';
import VolumeIcon from './icons/VolumeIcon';
import ChevronRightIcon from './icons/ChevronRightIcon';

interface CustomizationPanelProps {
  isOpen: boolean;
  onClose: () => void;
  isMobile?: boolean;
  
  // Color Props
  colors: ThemeColors;
  onThemeColorChange: (colorName: keyof ThemeColors, value: string) => void;
  onReset: () => void;
  
  // Background Props
  activeBackground: Background | null;
  userBackgrounds: Background[];
  onSelectBackground: (background: Background | null) => void;
  onAddBackground: (file: File) => void;
  onDeleteBackground: (id: string) => void;
  onToggleFavorite: (id: string) => void;
  backgroundsLoading: boolean;
  
  // Ambience Props
  particleType: ParticleType;
  setParticleType: (type: ParticleType) => void;
  ambientSound: { type: AmbientSoundType; volume: number };
  setAmbientSound: React.Dispatch<React.SetStateAction<{ type: AmbientSoundType; volume: number }>>;
  dailyEncouragementHour?: number | null;
  onSetDailyEncouragement?: (localHour: number | null) => void;
}

const particleOptions: { type: ParticleType; icon: React.FC; label: string }[] = [
    { type: 'none', icon: ParticlesOffIcon, label: 'Ninguna' },
    { type: 'snow', icon: SnowIcon, label: 'Nieve' },
    { type: 'rain', icon: RainIcon, label: 'Lluvia' },
    { type: 'stars', icon: StarsIcon, label: 'Estrellas' },
    { type: 'bubbles', icon: BubblesIcon, label: 'Burbujas' },
    { type: 'sparks', icon: SparksIcon, label: 'Chispas' },
];

const soundOptions: { type: AmbientSoundType; icon: React.FC; label: string }[] = [
    { type: 'none', icon: SoundOffIcon, label: 'Silencio' },
    { type: 'rain', icon: RainIcon, label: 'Lluvia' },
    { type: 'forest', icon: ForestIcon, label: 'Bosque' },
    { type: 'coffee_shop', icon: CoffeeIcon, label: 'Cafetería' },
    { type: 'ocean', icon: WaveIcon, label: 'Mar' },
];

interface BackgroundsTabProps extends Pick<CustomizationPanelProps, 'activeBackground' | 'userBackgrounds' | 'onSelectBackground' | 'onAddBackground' | 'onDeleteBackground' | 'onToggleFavorite' | 'backgroundsLoading'> {}

const BackgroundsTab: React.FC<BackgroundsTabProps> = (props) => {
    const { activeBackground, userBackgrounds, onSelectBackground, onAddBackground, onDeleteBackground, onToggleFavorite, backgroundsLoading } = props;
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
    
    const filteredBackgrounds = view === 'favorites' ? userBackgrounds.filter(bg => bg.is_favorite) : userBackgrounds;

    return (
        <>
            <div className="p-2 border-b border-secondary-light/50 dark:border-gray-700/50 flex-shrink-0">
                <div className="bg-black/5 dark:bg-black/20 rounded-full p-1 flex items-center gap-1">
                    <button onClick={() => setView('all')} className={`w-full py-1.5 text-xs sm:text-sm font-semibold rounded-full transition-colors ${view === 'all' ? 'bg-white dark:bg-gray-600 shadow text-primary-dark dark:text-gray-100' : 'text-gray-600 dark:text-gray-300 hover:bg-white/50 dark:hover:bg-black/20'}`}>Todos</button>
                    <button onClick={() => setView('favorites')} className={`w-full py-1.5 text-xs sm:text-sm font-semibold rounded-full transition-colors ${view === 'favorites' ? 'bg-white dark:bg-gray-600 shadow text-primary-dark dark:text-gray-100' : 'text-gray-600 dark:text-gray-300 hover:bg-white/50 dark:hover:bg-black/20'}`}>Favoritos</button>
                </div>
            </div>

            <main className="flex-grow p-4 overflow-y-auto custom-scrollbar">
                {backgroundsLoading ? (
                    <div className="flex flex-col items-center justify-center h-full text-center p-4">
                        <ChickenIcon className="w-12 h-12 text-primary animate-pulse" />
                        <p className="font-semibold text-gray-600 dark:text-gray-300 mt-3">Cargando fondos...</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-2 gap-4">
                        {view === 'all' && (
                            <>
                                <button onClick={triggerFileUpload} className="aspect-video bg-white/60 dark:bg-gray-700/60 rounded-lg shadow-sm hover:shadow-md transition-all duration-200 flex flex-col items-center justify-center text-center p-4 text-gray-500 dark:text-gray-400 hover:text-primary-dark dark:hover:text-primary">
                                    <UploadIcon />
                                    <span className="text-xs font-semibold mt-2">Subir nuevo</span>
                                </button>
                                <button onClick={() => onSelectBackground(null)} className={`aspect-video bg-white/60 dark:bg-gray-700/60 rounded-lg shadow-sm hover:shadow-md transition-all duration-200 flex flex-col items-center justify-center text-center p-4 text-gray-500 dark:text-gray-400 ${!activeBackground ? 'ring-2 ring-primary' : ''}`}>
                                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-secondary-light via-primary-light to-secondary-lighter dark:from-gray-800 dark:via-primary/50 dark:to-gray-900"></div>
                                    <span className="text-xs font-semibold mt-2">Original</span>
                                </button>
                            </>
                        )}

                        {filteredBackgrounds.map(bg => (
                            <div key={bg.id} className="group relative">
                                <button onClick={() => onSelectBackground(bg)} className={`w-full aspect-video rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-all duration-200 block ${activeBackground?.id === bg.id ? 'ring-2 ring-primary' : ''}`}>
                                    {bg.type === 'video' ? (<video src={bg.url} className="w-full h-full object-cover" />) : (<div className="w-full h-full bg-cover bg-center" style={{ backgroundImage: `url(${bg.url})` }} />)}
                                    <div className="absolute inset-0 bg-black/20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                        {bg.type === 'video' ? <VideoIcon /> : <ImageIcon />}
                                    </div>
                                </button>
                                <div className="absolute top-1 right-1 flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button onClick={() => onToggleFavorite(bg.id)} className="p-1.5 rounded-full bg-black/30 text-white hover:bg-yellow-500 backdrop-blur-sm" title={bg.is_favorite ? 'Quitar de favoritos' : 'Añadir a favoritos'}>
                                        <StarIcon filled={!!bg.is_favorite} className="h-4 w-4" />
                                    </button>
                                    <button onClick={() => setBgToDelete(bg)} className="p-1.5 rounded-full bg-black/30 text-white hover:bg-red-500 backdrop-blur-sm" title="Eliminar fondo">
                                        <TrashIcon className="h-4 w-4" />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
                {filteredBackgrounds.length === 0 && view === 'favorites' && !backgroundsLoading && (
                    <div className="text-center text-gray-500 dark:text-gray-400 py-10 col-span-2">
                        <p className="font-medium">No tienes fondos favoritos.</p>
                        <p className="text-sm">¡Añade algunos para verlos aquí!</p>
                    </div>
                )}
            </main>
            <ConfirmationModal isOpen={!!bgToDelete} onClose={() => setBgToDelete(null)} onConfirm={confirmDelete} title="Eliminar Fondo" message={`¿Seguro que quieres eliminar "${bgToDelete?.name}"?`} confirmText="Eliminar" cancelText="Cancelar" />
            <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*,video/*" className="hidden"/>
        </>
    );
};

const AmbienceTab: React.FC<Pick<CustomizationPanelProps, 'particleType' | 'setParticleType' | 'ambientSound' | 'setAmbientSound' | 'dailyEncouragementHour' | 'onSetDailyEncouragement'>> = ({ particleType, setParticleType, ambientSound, setAmbientSound, dailyEncouragementHour, onSetDailyEncouragement }) => {
    const [isDoseSettingsOpen, setIsDoseSettingsOpen] = useState(false);
    
    const doseSummary = useMemo(() => {
        if (dailyEncouragementHour === null) return 'Desactivado';
        const d = new Date();
        d.setHours(dailyEncouragementHour, 0, 0);
        return d.toLocaleTimeString(navigator.language, { hour: 'numeric', hour12: true });
    }, [dailyEncouragementHour]);

    const handleSoundSelect = (type: AmbientSoundType) => {
        setAmbientSound(prev => ({ ...prev, type }));
    };

    const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newVolume = parseFloat(e.target.value);
        setAmbientSound(prev => ({...prev, volume: newVolume }));
    };

    return (
        <div className="p-3">
             <div>
                <h4 className="font-bold text-gray-700 dark:text-gray-200 text-sm mb-2 text-center">Partículas</h4>
                <div className="grid grid-cols-3 gap-2">
                    {particleOptions.map(opt => (
                        <button key={opt.type} onClick={() => setParticleType(opt.type)} className={`flex flex-col items-center justify-center p-2 rounded-lg transition-colors text-xs font-semibold ${particleType === opt.type ? 'bg-primary-light/50 dark:bg-primary/20 text-primary-dark dark:text-primary' : 'text-gray-600 dark:text-gray-300 hover:bg-secondary-lighter dark:hover:bg-gray-700'}`} title={opt.label}>
                            <opt.icon />
                            <span className="mt-1">{opt.label}</span>
                        </button>
                    ))}
                </div>
            </div>
            <div className="mt-3 pt-3 border-t border-secondary-light/50 dark:border-gray-700/50">
                <h4 className="font-bold text-gray-700 dark:text-gray-200 text-sm mb-2 text-center">Sonidos</h4>
                <div className="grid grid-cols-3 gap-2">
                    {soundOptions.map(opt => (
                        <button key={opt.type} onClick={() => handleSoundSelect(opt.type)} className={`flex flex-col items-center justify-center p-2 rounded-lg transition-colors text-xs font-semibold ${ambientSound.type === opt.type ? 'bg-primary-light/50 dark:bg-primary/20 text-primary-dark dark:text-primary' : 'text-gray-600 dark:text-gray-300 hover:bg-secondary-lighter dark:hover:bg-gray-700'}`} title={opt.label}>
                            <opt.icon />
                            <span className="mt-1">{opt.label}</span>
                        </button>
                    ))}
                </div>
            </div>
            <div className={`mt-3 pt-3 border-t border-secondary-light/50 dark:border-gray-700/50 transition-opacity ${ambientSound.type === 'none' ? 'opacity-50' : ''}`}>
                 <div className="flex items-center gap-2">
                    <VolumeIcon />
                    <input type="range" min="0" max="1" step="0.05" value={ambientSound.volume} onChange={handleVolumeChange} disabled={ambientSound.type === 'none'} className="w-full h-2 bg-secondary-light/80 dark:bg-gray-600/80 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-primary" />
                 </div>
            </div>
            {onSetDailyEncouragement && (
                <div className="mt-3 pt-3 border-t border-secondary-light/50 dark:border-gray-700/50">
                    <button onClick={() => setIsDoseSettingsOpen(s => !s)} className="w-full flex justify-between items-center text-left p-1">
                        <h4 className="font-bold text-gray-700 dark:text-gray-200 text-sm">Dosis de Ánimo</h4>
                        <div className="flex items-center gap-1">
                            <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">{doseSummary}</span>
                            <ChevronRightIcon className={`h-4 w-4 text-gray-400 transition-transform duration-200 ${isDoseSettingsOpen ? 'rotate-90' : ''}`} />
                        </div>
                    </button>
                    {isDoseSettingsOpen && (
                        <div className="mt-2 animate-pop-in">
                            <select 
                                value={dailyEncouragementHour === null ? 'none' : dailyEncouragementHour} 
                                onChange={e => onSetDailyEncouragement(e.target.value === 'none' ? null : parseInt(e.target.value, 10))}
                                className="w-full bg-white/60 dark:bg-gray-700/60 text-gray-800 dark:text-gray-200 border-2 border-secondary-light/50 dark:border-gray-600 rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-primary text-sm appearance-none text-center"
                            >
                                <option value="none">Desactivado</option>
                                {Array.from({length: 24}, (_, i) => i).map(hour => {
                                    const displayDate = new Date();
                                    displayDate.setHours(hour, 0, 0);
                                    return <option key={hour} value={hour}>
                                        {displayDate.toLocaleTimeString(navigator.language, { hour: 'numeric', hour12: true })}
                                    </option>
                                })}
                            </select>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 text-center">Recibe un versículo cada día a la hora que elijas.</p>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

const CustomizationPanel: React.FC<CustomizationPanelProps> = (props) => {
    const { isOpen, onClose, isMobile } = props;
    const [activeTab, setActiveTab] = useState<'colores' | 'fondos' | 'ambiente'>('colores');

    const tabs = [
        { id: 'colores', label: 'Colores' },
        { id: 'fondos', label: 'Fondos' },
        { id: 'ambiente', label: 'Ambiente' },
    ];
    
    if (!isOpen) return null;

    const panelContent = (
        <div className="flex flex-col h-full">
            <header className="flex items-center justify-between p-4 border-b border-secondary-light/50 dark:border-gray-700/50 flex-shrink-0">
                <h2 className="text-xl font-bold text-primary-dark dark:text-primary">Personalización</h2>
                <button onClick={onClose} className="p-2 rounded-full text-gray-500 dark:text-gray-400 hover:bg-primary-light/50 dark:hover:bg-gray-700 hover:text-primary-dark transition-colors"><CloseIcon /></button>
            </header>
            
            <div className="border-b border-secondary-light/50 dark:border-gray-700/50 flex-shrink-0">
                <div className="flex items-center gap-1 p-2">
                    {tabs.map(tab => (
                        <button key={tab.id} onClick={() => setActiveTab(tab.id as any)} className={`w-full py-2 text-sm font-semibold rounded-lg transition-colors ${activeTab === tab.id ? 'bg-white dark:bg-gray-600 shadow text-primary-dark dark:text-gray-100' : 'text-gray-600 dark:text-gray-300 hover:bg-white/50 dark:hover:bg-black/20'}`}>
                            {tab.label}
                        </button>
                    ))}
                </div>
            </div>

            <div className="flex-grow overflow-y-auto custom-scrollbar">
                {activeTab === 'colores' && <ThemeCustomizer colors={props.colors} onThemeColorChange={props.onThemeColorChange} onReset={props.onReset} />}
                {activeTab === 'fondos' && <BackgroundsTab {...props} />}
                {activeTab === 'ambiente' && <AmbienceTab {...props} />}
            </div>
        </div>
    );

    if (isMobile) {
        return (
            <div className="fixed inset-0 bg-secondary-lighter dark:bg-gray-800 z-[60000] animate-deploy">
                {panelContent}
            </div>
        );
    }

    return (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-[60000]" onClick={onClose}>
            <div
                className="fixed top-0 right-0 h-full w-full max-w-sm bg-secondary-lighter dark:bg-gray-800/90 backdrop-blur-xl shadow-2xl flex flex-col transition-transform duration-300 transform animate-slide-in"
                onClick={e => e.stopPropagation()}
            >
                {panelContent}
            </div>
        </div>
    );
};

export default CustomizationPanel;