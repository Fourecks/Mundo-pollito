import React, { useState, useRef } from 'react';
import { Background } from '../types';
import BackgroundIcon from './icons/BackgroundIcon';
import UploadIcon from './icons/UploadIcon';
import TrashIcon from './icons/TrashIcon';
import StarIcon from './icons/StarIcon';
import CloseIcon from './icons/CloseIcon';
import ConfirmationModal from './ConfirmationModal';
import VideoIcon from './icons/VideoIcon';
import ImageIcon from './icons/ImageIcon';
import { UnsplashGallery } from './UnsplashGallery';
import { Sparkles, Image as ImageIconLucide } from 'lucide-react';

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
  const [mainTab, setMainTab] = useState<'unsplash' | 'custom'>('unsplash');
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
    if (bgToDelete) {
      onDeleteBackground(bgToDelete.id);
      setBgToDelete(null);
    }
  };

  const filteredBackgrounds = view === 'favorites' ? userBackgrounds.filter(bg => bg.is_favorite) : userBackgrounds;

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="bg-white/70 dark:bg-gray-900/70 backdrop-blur-sm text-gray-700 dark:text-gray-300 hover:text-primary p-3 rounded-full shadow-lg transition-all duration-300 hover:scale-110"
        aria-label="Seleccionar fondo de pantalla"
      >
        <BackgroundIcon />
      </button>

      {isOpen && (
        <div
          className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[60000]"
          onClick={() => setIsOpen(false)}
        >
          <div
            className="fixed top-0 right-0 h-full w-full max-w-md bg-white dark:bg-gray-900 shadow-2xl flex flex-col transition-transform duration-300 transform animate-slide-in border-l border-gray-200 dark:border-gray-800"
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <header className="flex items-center justify-between p-4 border-b border-gray-100 dark:border-gray-800 flex-shrink-0">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-blue-500" />
                <h2 className="text-lg font-bold text-gray-900 dark:text-white">Fondos de Pantalla</h2>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1.5 rounded-full text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
              >
                <CloseIcon />
              </button>
            </header>

            {/* Main Tabs (Unsplash vs Custom) */}
            <div className="p-3 border-b border-gray-100 dark:border-gray-800 flex-shrink-0 bg-gray-50/50 dark:bg-gray-900/50">
              <div className="bg-gray-200/80 dark:bg-gray-800 p-1 rounded-xl flex items-center gap-1">
                <button
                  onClick={() => setMainTab('unsplash')}
                  className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                    mainTab === 'unsplash'
                      ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                      : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                  }`}
                >
                  <Sparkles className="w-3.5 h-3.5 text-blue-500" />
                  <span>Unsplash (Galeria)</span>
                </button>
                <button
                  onClick={() => setMainTab('custom')}
                  className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                    mainTab === 'custom'
                      ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                      : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                  }`}
                >
                  <ImageIconLucide className="w-3.5 h-3.5 text-indigo-500" />
                  <span>Mis Fondos ({userBackgrounds.length})</span>
                </button>
              </div>
            </div>

            {/* Content Area */}
            <main className="flex-grow p-4 overflow-hidden flex flex-col">
              {mainTab === 'unsplash' ? (
                <UnsplashGallery
                  activeBackground={activeBackground}
                  onSelectBackground={onSelect}
                />
              ) : (
                <div className="flex flex-col h-full space-y-4">
                  {/* Filter Sub-tabs */}
                  <div className="flex items-center justify-between pb-2 border-b border-gray-100 dark:border-gray-800">
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => setView('all')}
                        className={`text-xs font-medium transition-colors ${
                          view === 'all'
                            ? 'text-gray-900 dark:text-white font-semibold underline underline-offset-4 decoration-blue-500'
                            : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'
                        }`}
                      >
                        Todos
                      </button>
                      <button
                        onClick={() => setView('favorites')}
                        className={`text-xs font-medium transition-colors ${
                          view === 'favorites'
                            ? 'text-gray-900 dark:text-white font-semibold underline underline-offset-4 decoration-blue-500'
                            : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'
                        }`}
                      >
                        Favoritos
                      </button>
                    </div>

                    <button
                      onClick={triggerFileUpload}
                      className="px-3 py-1.5 bg-blue-500 hover:bg-blue-600 text-white rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5 shadow-sm"
                    >
                      <UploadIcon />
                      <span>Subir</span>
                    </button>
                  </div>

                  {/* Custom Backgrounds Grid */}
                  <div className="flex-1 overflow-y-auto custom-scrollbar pr-1">
                    <div className="grid grid-cols-2 gap-3">
                      {view === 'all' && (
                        /* Default theme reset option */
                        <button
                          onClick={() => onSelect(null)}
                          className={`group relative aspect-video rounded-xl border flex flex-col items-center justify-center p-3 text-center transition-all ${
                            !activeBackground
                              ? 'border-blue-500 ring-2 ring-blue-500/20 bg-blue-50/50 dark:bg-blue-900/10 text-blue-600 dark:text-blue-400'
                              : 'border-dashed border-gray-200 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-700 text-gray-500 dark:text-gray-400'
                          }`}
                        >
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 via-indigo-500 to-purple-500 shadow-sm mb-1.5" />
                          <span className="text-xs font-medium">Original</span>
                        </button>
                      )}

                      {filteredBackgrounds.map(bg => (
                        <div key={bg.id} className="group relative">
                          <button
                            onClick={() => onSelect(bg)}
                            className={`w-full aspect-video rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-all duration-200 block border ${
                              activeBackground?.id === bg.id
                                ? 'ring-2 ring-blue-500 border-blue-500 scale-[1.02]'
                                : 'border-gray-100 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-700'
                            }`}
                          >
                            {bg.type === 'video' ? (
                              <video src={bg.url} className="w-full h-full object-cover" />
                            ) : (
                              <div
                                className="w-full h-full bg-cover bg-center"
                                style={{ backgroundImage: `url(${bg.url})` }}
                              />
                            )}
                            <div className="absolute inset-0 bg-black/20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                              {bg.type === 'video' ? <VideoIcon /> : <ImageIcon />}
                            </div>
                          </button>
                          <div className="absolute top-1.5 right-1.5 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={(e) => { e.stopPropagation(); onToggleFavorite(bg.id); }}
                              className={`p-1 rounded-full backdrop-blur-md transition-colors ${
                                bg.is_favorite ? 'bg-yellow-400 text-white' : 'bg-black/40 text-white hover:bg-yellow-500'
                              }`}
                              title={bg.is_favorite ? 'Quitar de favoritos' : 'Añadir a favoritos'}
                            >
                              <StarIcon filled={!!bg.is_favorite} className="h-3.5 w-3.5" />
                            </button>
                            <button
                              onClick={(e) => { e.stopPropagation(); setBgToDelete(bg); }}
                              className="p-1 rounded-full bg-black/40 text-white hover:bg-red-500 backdrop-blur-md transition-colors"
                              title="Eliminar fondo"
                            >
                              <TrashIcon className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>

                    {filteredBackgrounds.length === 0 && view === 'favorites' && (
                      <div className="text-center text-gray-400 py-12 text-sm">
                        <p>No tienes fondos favoritos.</p>
                        <p className="text-xs mt-1 text-gray-500">Marca los fondos subidos con estrella para verlos aquí.</p>
                      </div>
                    )}
                  </div>
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
      <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*,video/*" className="hidden" />
    </>
  );
};

export default BackgroundSelector;