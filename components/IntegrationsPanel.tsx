import React from 'react';
import { GCalSettings, GoogleCalendar } from '../types';
import CloseIcon from './icons/CloseIcon';
import ChickenIcon from './ChickenIcon';
import ModalWindow from './ModalWindow';
import CalendarIcon from './icons/CalendarIcon';
import LinkIcon from './icons/LinkIcon';


interface IntegrationsPanelProps {
  isOpen: boolean;
  onClose: () => void;
  isMobile?: boolean;
  
  // Auth Props (for Google APIs)
  isSignedIn: boolean;
  onAuthClick: () => void;
  isGapiReady: boolean;

  // Google Calendar Props
  gcalSettings: GCalSettings;
  onGCalSettingsChange: (settings: GCalSettings) => void;
  userCalendars: GoogleCalendar[];
}


const IntegrationsPanel: React.FC<IntegrationsPanelProps> = (props) => {
    const { isOpen, onClose, isMobile, isSignedIn, onAuthClick, isGapiReady, gcalSettings, onGCalSettingsChange, userCalendars } = props;
    
    if (!isOpen) return null;

    const integrationsContent = (
      <div className="flex-grow overflow-y-auto custom-scrollbar p-4">
          {!isSignedIn ? (
              <div className="p-4 text-center">
                  <ChickenIcon className="w-16 h-16 text-primary mb-4 mx-auto" />
                  <h3 className="font-bold text-lg text-gray-700 dark:text-gray-300">Conecta tu cuenta de Google</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                  Para sincronizar con Google Calendar y guardar tus recuerdos en Google Drive, conecta tu cuenta.
                  </p>
                  <button
                      onClick={onAuthClick}
                      disabled={!isGapiReady}
                      className="mt-6 bg-primary text-white font-bold rounded-full px-6 py-3 shadow-md hover:bg-primary-dark transform hover:scale-105 active:scale-95 transition-all duration-200 disabled:bg-primary-light disabled:cursor-wait"
                  >
                      {isGapiReady ? 'Conectar con Google' : 'Cargando...'}
                  </button>
              </div>
          ) : (
              <div className="space-y-4">
                  <div className="bg-white/70 dark:bg-gray-800/70 p-4 rounded-xl shadow-sm">
                      <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 flex items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/50 text-blue-500 dark:text-blue-300">
                                <CalendarIcon className="h-5 w-5" />
                            </div>
                            <h4 className="font-bold text-gray-800 dark:text-gray-100">Google Calendar</h4>
                          </div>
                          <div className="relative cursor-pointer" onClick={() => onGCalSettingsChange({ ...gcalSettings, enabled: !gcalSettings.enabled })}>
                              <input type="checkbox" className="sr-only" checked={gcalSettings.enabled} readOnly />
                              <div className={`block w-10 h-6 rounded-full transition-colors ${gcalSettings.enabled ? 'bg-primary' : 'bg-gray-200 dark:bg-gray-600'}`}></div>
                              <div className={`dot absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform ${gcalSettings.enabled ? 'translate-x-full' : ''}`}></div>
                          </div>
                      </div>
                      <div className={`mt-3 pt-3 border-t border-secondary-light/50 dark:border-gray-700/50 transition-opacity duration-300 ${!gcalSettings.enabled ? 'opacity-50 pointer-events-none' : 'animate-fade-in'}`}>
                          <label className="text-xs font-semibold text-gray-600 dark:text-gray-300">Elegir calendario a sincronizar</label>
                          <select
                              value={gcalSettings.calendarId}
                              onChange={(e) => onGCalSettingsChange({ ...gcalSettings, calendarId: e.target.value })}
                              className="w-full mt-1 bg-white/80 dark:bg-gray-700/80 text-gray-800 dark:text-gray-200 border-2 border-secondary-light/50 dark:border-gray-600 rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-primary text-sm"
                          >
                              {userCalendars.map(cal => (
                                  <option key={cal.id} value={cal.id}>{cal.summary}</option>
                              ))}
                          </select>
                      </div>
                  </div>

                  {/* Placeholder for future integrations */}
                  <div className="bg-white/50 dark:bg-gray-800/50 p-4 rounded-xl shadow-sm opacity-60">
                      <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                                <div className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-200 dark:bg-gray-700 text-gray-400 dark:text-gray-500">
                                    <LinkIcon />
                                </div>
                                <h4 className="font-bold text-gray-500 dark:text-gray-400">Más integraciones...</h4>
                           </div>
                          <button disabled className="bg-gray-200 dark:bg-gray-700 text-gray-400 dark:text-gray-500 text-sm font-semibold rounded-full px-4 py-1 cursor-not-allowed">
                              Próximamente
                          </button>
                      </div>
                  </div>
              </div>
          )}
      </div>
    );

    if (isMobile) {
        return (
            <div className="fixed inset-0 bg-secondary-lighter dark:bg-gray-800 z-[60000] animate-deploy flex flex-col">
                <header className="flex items-center justify-between p-4 border-b border-secondary-light/50 dark:border-gray-700/50 flex-shrink-0">
                    <h2 className="text-xl font-bold text-primary-dark dark:text-primary">Integraciones</h2>
                    <button onClick={onClose} className="p-2 rounded-full text-gray-500 dark:text-gray-400 hover:bg-primary-light/50 dark:hover:bg-gray-700 hover:text-primary-dark transition-colors"><CloseIcon /></button>
                </header>
                {integrationsContent}
            </div>
        );
    }

    return (
        <ModalWindow
            isOpen={isOpen}
            onClose={onClose}
            title="Integraciones"
            isDraggable
            isResizable
            className="w-full max-w-lg h-auto"
        >
            {integrationsContent}
        </ModalWindow>
    );
};

export default IntegrationsPanel;