import React, { useState, useRef, useEffect, useCallback } from 'react';
import TrashIcon from './icons/TrashIcon';
import UploadIcon from './icons/UploadIcon';
import GalleryIcon from './icons/GalleryIcon';
import CloseIcon from './icons/CloseIcon';
import EyeIcon from './icons/EyeIcon';
import { GalleryImage } from '../types';
import PlusIcon from './icons/PlusIcon';
import ChickenIcon from './ChickenIcon';

const ChevronLeftIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
    </svg>
);

const ChevronRightIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
    </svg>
);

interface ImageGalleryProps {
  images: GalleryImage[];
  onAddImages: (files: File[]) => void;
  onDeleteImage: (id: string) => void;
  isMobile?: boolean;
  isSignedIn: boolean;
  onAuthClick: () => void;
  isGapiReady: boolean;
  isLoading: boolean;
}

const ImageGallery: React.FC<ImageGalleryProps> = ({ images, onAddImages, onDeleteImage, isMobile = false, isSignedIn, onAuthClick, isGapiReady, isLoading }) => {
  const [viewingIndex, setViewingIndex] = useState<number | null>(null);
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const processFiles = useCallback((files: FileList) => {
    const validFiles: File[] = [];
    for (const file of Array.from(files)) {
      if (!file.type.startsWith('image/')) {
        alert("Por favor, sube solo archivos de imagen.");
        continue;
      }
      if (file.size > 10 * 1024 * 1024) { // 10MB limit
        alert(`La imagen "${file.name}" es demasiado grande. El límite es 10MB.`);
        continue;
      }
      validFiles.push(file);
    }
    if (validFiles.length > 0) {
      onAddImages(validFiles);
    }
  }, [onAddImages]);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) {
      processFiles(event.target.files);
    }
    if (event.target) event.target.value = ''; // Reset input to allow re-uploading the same file
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDraggingOver(true);
  };
  
  const handleDragEnter = (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      setIsDraggingOver(true);
  }

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDraggingOver(false);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDraggingOver(false);
    if (e.dataTransfer.files) {
      processFiles(e.dataTransfer.files);
    }
  };

  const triggerFileUpload = () => fileInputRef.current?.click();
  const openViewer = (index: number) => setViewingIndex(index);
  const closeViewer = () => setViewingIndex(null);

  const nextInViewer = useCallback(() => {
    if (viewingIndex !== null) {
      setViewingIndex((prevIndex) => (prevIndex! + 1) % images.length);
    }
  }, [viewingIndex, images.length]);

  const prevInViewer = useCallback(() => {
    if (viewingIndex !== null) {
      setViewingIndex((prevIndex) => (prevIndex! - 1 + images.length) % images.length);
    }
  }, [viewingIndex, images.length]);

  const deleteImage = (id: string) => {
    onDeleteImage(id);
  };
  
  // Viewer keyboard nav and preloading
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
        if (viewingIndex === null) return;
        if (e.key === 'ArrowRight') nextInViewer();
        if (e.key === 'ArrowLeft') prevInViewer();
        if (e.key === 'Escape') closeViewer();
    };
    window.addEventListener('keydown', handleKeyDown);

    if (viewingIndex !== null && images.length > 1) {
        const nextIndex = (viewingIndex + 1) % images.length;
        const prevIndex = (viewingIndex - 1 + images.length) % images.length;
        new Image().src = images[nextIndex].url;
        new Image().src = images[prevIndex].url;
    }
    
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [viewingIndex, images, nextInViewer, prevInViewer]);

  useEffect(() => {
      if (viewingIndex !== null && viewingIndex >= images.length) {
          setViewingIndex(images.length > 0 ? images.length - 1 : null);
      }
  }, [images, viewingIndex]);

  if (!isSignedIn) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center p-4">
        <ChickenIcon className="w-16 h-16 text-primary mb-4" />
        <h3 className="font-bold text-lg text-gray-700 dark:text-gray-300">Conecta tu Galería</h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-2 max-w-xs">
          Para ver, subir y gestionar tus recuerdos, conecta tu cuenta de Google Drive. Las imágenes se guardarán de forma segura en una carpeta privada de la aplicación.
        </p>
        <button
          onClick={onAuthClick}
          disabled={!isGapiReady}
          className="mt-6 bg-primary text-white font-bold rounded-full px-6 py-3 shadow-md hover:bg-primary-dark transform hover:scale-105 active:scale-95 transition-all duration-200 disabled:bg-primary-light disabled:cursor-wait"
        >
          {isGapiReady ? 'Conectar con Google Drive' : 'Cargando...'}
        </button>
      </div>
    );
  }

  if (isLoading) {
    return (
        <div className="flex flex-col items-center justify-center h-full text-center p-4">
            <ChickenIcon className="w-16 h-16 text-primary animate-pulse" />
            <p className="font-semibold text-gray-600 dark:text-gray-300 mt-4">Cargando recuerdos desde Drive...</p>
        </div>
    );
  }

  return (
    <div
      className="flex flex-col h-full w-full p-2 relative"
      onDragEnter={handleDragEnter}
    >
        <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*" multiple className="hidden"/>
        {isMobile ? (
             <button onClick={triggerFileUpload} className="fixed bottom-24 right-4 bg-primary text-white rounded-full p-4 shadow-lg z-40 transform hover:scale-110 active:scale-95 transition-transform">
                <PlusIcon />
            </button>
        ) : (
             <div className="flex-shrink-0 pb-2 flex justify-end">
                <button onClick={triggerFileUpload} className="bg-primary text-white font-bold rounded-full px-4 py-2 shadow-md hover:bg-primary-dark transform hover:scale-105 active:scale-95 transition-all duration-200 inline-flex items-center gap-2">
                    <UploadIcon />
                    <span>Subir Foto</span>
                </button>
            </div>
        )}
     

      {images.length === 0 ? (
          <div 
              className="flex flex-col items-center justify-center h-full text-center text-gray-500 dark:text-gray-400 flex-grow border-2 border-dashed border-secondary-light dark:border-gray-600 rounded-2xl transition-colors bg-secondary-lighter/20 dark:bg-gray-800/20 cursor-pointer"
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={triggerFileUpload}
          >
              <div className="p-5 rounded-full bg-secondary-light/50 dark:bg-gray-700/50 mb-4">
                  <GalleryIcon />
              </div>
              <h3 className="font-bold text-lg text-gray-600 dark:text-gray-300">Tu galería está vacía</h3>
              <p className="text-sm mt-1">Arrastra y suelta fotos aquí o haz clic para subir.</p>
          </div>
      ) : (
          <div
              className="flex-grow overflow-y-auto custom-scrollbar p-1 relative"
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
          >
              <div className="columns-2 sm:columns-3 md:columns-4 gap-3 space-y-3">
                  {images.map((image, index) => (
                      <div key={image.id} className="[break-inside:avoid]">
                          <button
                              onClick={() => openViewer(index)}
                              className="rounded-lg overflow-hidden cursor-pointer group relative shadow-md hover:shadow-xl transition-all duration-300 block w-full focus:outline-none focus:ring-4 focus:ring-primary focus:ring-offset-2 focus:ring-offset-secondary-lighter dark:focus:ring-offset-gray-800"
                          >
                              <img src={image.url} alt={`Recuerdo ${index + 1}`} className="w-full h-auto object-cover transition-transform duration-300 group-hover:scale-105" />
                              <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                                 <EyeIcon />
                              </div>
                          </button>
                      </div>
                  ))}
              </div>
          </div>
      )}
      
      {isDraggingOver && (
          <div
              className="absolute inset-4 border-4 border-dashed border-primary bg-primary-light/50 dark:bg-primary/20 backdrop-blur-sm rounded-2xl flex items-center justify-center text-primary-dark dark:text-primary font-bold z-10 pointer-events-none"
              onDragLeave={handleDragLeave}
          >
              <p>¡Suelta las imágenes aquí!</p>
          </div>
      )}
        
      {viewingIndex !== null && images[viewingIndex] && (
          <div className="fixed inset-0 bg-black/80 z-[60] flex items-center justify-center p-4 animate-fade-in" onClick={closeViewer}>
              <div className="relative w-full h-full max-w-5xl max-h-[90vh] flex items-center justify-center">
                  <img
                      key={viewingIndex}
                      src={images[viewingIndex].url}
                      alt={`Recuerdo ${viewingIndex + 1}`}
                      className="object-contain w-auto h-auto max-w-full max-h-full block animate-pop-in"
                      onClick={e => e.stopPropagation()}
                  />
                   {images.length > 1 && (
                    <>
                      <button onClick={e => { e.stopPropagation(); prevInViewer(); }} aria-label="Imagen anterior" className="absolute left-0 sm:left-4 top-1/2 -translate-y-1/2 bg-black/30 hover:bg-black/50 text-white p-2 rounded-full shadow-md focus:outline-none focus:ring-2 focus:ring-primary z-10 transition-opacity duration-300">
                          <ChevronLeftIcon />
                      </button>
                      <button onClick={e => { e.stopPropagation(); nextInViewer(); }} aria-label="Siguiente imagen" className="absolute right-0 sm:right-4 top-1/2 -translate-y-1/2 bg-black/30 hover:bg-black/50 text-white p-2 rounded-full shadow-md focus:outline-none focus:ring-2 focus:ring-primary z-10 transition-opacity duration-300">
                          <ChevronRightIcon />
                      </button>
                    </>
                  )}
                   <button onClick={e => { e.stopPropagation(); deleteImage(images[viewingIndex].id); }} aria-label="Eliminar imagen" className="absolute top-4 right-16 bg-black/30 hover:bg-red-500 text-white p-2 rounded-full shadow-md z-10 transition-all duration-300">
                      <TrashIcon className="h-5 w-5"/>
                  </button>
                  <button onClick={closeViewer} aria-label="Cerrar visor" className="absolute top-4 right-4 bg-black/30 hover:bg-black/50 text-white p-2 rounded-full shadow-md z-10 transition-all duration-300">
                      <CloseIcon />
                  </button>
                  <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/40 text-white text-sm rounded-full px-3 py-1 pointer-events-none z-10">
                      {viewingIndex + 1} / {images.length}
                  </div>
              </div>
          </div>
      )}

    </div>
  );
};

export default ImageGallery;