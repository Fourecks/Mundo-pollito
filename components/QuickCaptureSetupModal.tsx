
import React, { useState } from 'react';
import CloseIcon from './icons/CloseIcon';
import ChevronRightIcon from './icons/ChevronRightIcon';

interface QuickCaptureSetupModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
}

const QuickCaptureSetupModal: React.FC<QuickCaptureSetupModalProps> = ({ isOpen, onClose, userId }) => {
    const shortcutUrl = `${window.location.origin}/?task=`;
    const [copySuccess, setCopySuccess] = useState(false);

    const copyToClipboard = () => {
        navigator.clipboard.writeText(shortcutUrl).then(() => {
            setCopySuccess(true);
            setTimeout(() => setCopySuccess(false), 2500);
        }, (err) => {
            alert('No se pudo copiar la URL. Por favor, cópiala manualmente.');
            console.error('Error al copiar: ', err);
        });
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[60000] flex items-center justify-center p-4 animate-fade-in" onClick={onClose}>
            <div className="fixed inset-0 bg-secondary-lighter dark:bg-gray-800 z-[60001] animate-deploy flex flex-col" onClick={e => e.stopPropagation()}>
                <header className="flex-shrink-0 p-3 text-center relative border-b border-secondary-light/50 dark:border-gray-700/50 flex items-center justify-center">
                    <h3 className="font-bold text-lg text-primary-dark dark:text-primary">Configurar Captura Rápida</h3>
                    <button onClick={onClose} className="absolute right-4 top-1/2 -translate-y-1/2 p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/5">
                        <CloseIcon />
                    </button>
                </header>
                <main className="flex-grow p-4 overflow-y-auto custom-scrollbar">
                    <div className="max-w-md mx-auto space-y-4 text-sm text-gray-700 dark:text-gray-200">
                        <p>Sigue estos pasos para crear un Atajo en tu iPhone y añadir tareas desde la pantalla de bloqueo:</p>
                        
                        <div className="space-y-2">
                            <h4 className="font-bold text-primary-dark dark:text-primary">Paso 1: Copia la URL de la App</h4>
                            <p className="text-xs text-gray-500 dark:text-gray-400">Esta URL base se usará en tu atajo.</p>
                            <div className="relative">
                                <input
                                    type="text"
                                    value={shortcutUrl}
                                    readOnly
                                    className="w-full bg-white/80 dark:bg-gray-700/80 border-2 border-secondary-light dark:border-gray-600 rounded-lg p-2 pr-20 text-xs"
                                />
                                <button
                                    onClick={copyToClipboard}
                                    className="absolute right-1 top-1 bottom-1 bg-primary text-white font-semibold rounded-md px-3 text-xs transition-colors hover:bg-primary-dark"
                                >
                                    {copySuccess ? '¡Copiado!' : 'Copiar'}
                                </button>
                            </div>
                        </div>

                        <div className="space-y-2">
                             <h4 className="font-bold text-primary-dark dark:text-primary">Paso 2: Crea el Atajo</h4>
                             <ol className="list-decimal list-inside space-y-2 text-xs bg-white/60 dark:bg-gray-700/60 p-3 rounded-lg">
                                <li>Abre la app <strong>Atajos</strong> y toca el botón <strong>"+"</strong>.</li>
                                <li><strong>Acción 1:</strong> Busca y añade <strong>"Solicitar entrada"</strong>. En "Pregunta", escribe: <i>¿Qué tarea quieres añadir?</i></li>
                                <li><strong>Acción 2:</strong> Busca y añade <strong>"URL"</strong>.</li>
                                <li>En el campo de la URL, <strong>pega la URL de la app que copiaste</strong>.</li>
                                <li><strong>MUY IMPORTANTE:</strong> Justo después de la URL, <strong>toca la variable azul "Entrada proporcionada"</strong> que aparece sobre el teclado.</li>
                                <li><strong>Acción 3:</strong> Busca y añade <strong>"Abrir URL"</strong>.</li>
                                <li>¡Listo! Nombra tu atajo (ej. "Añadir Tarea") y añádelo a tu pantalla de inicio o de bloqueo como un widget.</li>
                             </ol>
                        </div>
                    </div>
                </main>
            </div>
        </div>
    );
};

export default QuickCaptureSetupModal;
