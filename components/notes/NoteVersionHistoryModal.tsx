import React, { useState } from 'react';
import { History, RotateCcw, Clock, X, Check, FileText } from 'lucide-react';
import { Note, NoteVersion } from '../../types';
import { cleanToPlainText } from '../../utils/textCleaner';

interface NoteVersionHistoryModalProps {
  note: Note;
  versions: NoteVersion[];
  onRestoreVersion: (version: NoteVersion) => void;
  onClose: () => void;
}

export const NoteVersionHistoryModal: React.FC<NoteVersionHistoryModalProps> = ({
  note,
  versions,
  onRestoreVersion,
  onClose,
}) => {
  const [selectedVersion, setSelectedVersion] = useState<NoteVersion | null>(
    versions.length > 0 ? versions[0] : null
  );

  return (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fade-in select-none overflow-y-auto" onClick={onClose}>
      <div 
        className="bg-white dark:bg-[#0a0a0a] border border-gray-200 dark:border-zinc-800 rounded-3xl shadow-2xl w-full max-w-3xl h-[80vh] max-h-[600px] flex flex-col overflow-hidden text-left"
        onClick={e => e.stopPropagation()}
      >
        
        {/* Modal Header */}
        <div className="p-4 px-5 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 flex items-center justify-center border border-zinc-200 dark:border-zinc-700">
              <History className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                Historial de Versiones
              </h3>
              <p className="text-[11px] text-zinc-400 truncate max-w-md">
                Nota: <span className="font-medium text-zinc-700 dark:text-zinc-300">{cleanToPlainText(note.title) || 'Sin título'}</span>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-md text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 flex overflow-hidden">
          
          {/* Versions Timeline List */}
          <div className="w-64 border-r border-zinc-200 dark:border-zinc-800 p-3 overflow-y-auto custom-scrollbar space-y-1.5 bg-zinc-50 dark:bg-zinc-900/50 flex-shrink-0">
            <div className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider px-2 mb-1">
              Puntos de guardado ({versions.length})
            </div>

            {versions.map((ver, idx) => {
              const isSelected = selectedVersion?.id === ver.id;
              const date = new Date(ver.created_at);
              const formattedTime = date.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
              const formattedDate = date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });

              return (
                <button
                  key={ver.id}
                  onClick={() => setSelectedVersion(ver)}
                  className={`w-full text-left p-2.5 rounded-xl border text-xs transition-all ${
                    isSelected
                      ? 'bg-zinc-200 dark:bg-zinc-800 border-zinc-300 dark:border-zinc-700 font-semibold text-zinc-900 dark:text-zinc-100'
                      : 'bg-white dark:bg-zinc-800/60 border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 hover:border-zinc-300'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="truncate">{cleanToPlainText(ver.title) || 'Sin título'}</span>
                    {idx === 0 && (
                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-zinc-200 dark:bg-zinc-700 text-zinc-800 dark:text-zinc-200 font-medium">
                        Actual
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1 text-[10px] text-zinc-400 mt-1">
                    <Clock className="w-2.5 h-2.5" />
                    <span>{formattedDate} a las {formattedTime}</span>
                  </div>
                </button>
              );
            })}

            {versions.length === 0 && (
              <div className="p-4 text-center text-xs text-zinc-400 italic">
                No hay versiones previas registradas aún.
              </div>
            )}
          </div>

          {/* Version Preview Area */}
          <div className="flex-1 flex flex-col overflow-hidden p-5">
            {selectedVersion ? (
              <div className="flex flex-col h-full overflow-hidden">
                <div className="flex items-center justify-between pb-3 border-b border-zinc-200 dark:border-zinc-800 mb-3 flex-shrink-0">
                  <div>
                    <h4 className="font-semibold text-zinc-900 dark:text-zinc-100 text-sm">
                      {cleanToPlainText(selectedVersion.title) || 'Sin título'}
                    </h4>
                    <span className="text-[11px] text-zinc-400">
                      Guardado el {new Date(selectedVersion.created_at).toLocaleString()}
                    </span>
                  </div>

                  <button
                    onClick={() => onRestoreVersion(selectedVersion)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-100 dark:hover:bg-zinc-200 dark:text-zinc-900 text-white font-medium text-xs transition-all"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Restaurar esta versión</span>
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto custom-scrollbar p-4 bg-zinc-50 dark:bg-zinc-800/40 rounded-xl border border-zinc-200 dark:border-zinc-800 text-xs leading-relaxed note-editor-content select-text text-zinc-800 dark:text-zinc-200"
                  dangerouslySetInnerHTML={{ __html: selectedVersion.content || '<p class="text-zinc-400 italic">Versión sin contenido.</p>' }}
                />
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-zinc-400">
                <FileText className="w-10 h-10 opacity-30 mb-2" />
                <p className="text-xs">Selecciona una versión para previsualizar.</p>
              </div>
            )}
          </div>

        </div>

      </div>
    </div>
  );
};
