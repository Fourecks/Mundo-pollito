const fs = require('fs');
let code = fs.readFileSync('components/SpotifyFloatingPlayer.tsx', 'utf8');

code = code.replace("import React, { useState } from 'react';", "import React, { useState, useContext } from 'react';\nimport { GripHorizontal } from 'lucide-react';\nimport { ModalWindowContext } from './ModalWindow';");

code = code.replace("    const handleRequireLogin = () => {", "    const { startInteraction } = useContext(ModalWindowContext);\n\n    const handleRequireLogin = () => {");

const loginDragHandle = `                <div className="relative">
                    <div 
                        className="absolute -top-3 -left-3 p-1.5 text-gray-400 hover:text-white rounded-full hover:bg-white/10 transition-colors cursor-move z-50"
                        onMouseDown={(e) => startInteraction?.(e, 'drag')}
                        onTouchStart={(e) => startInteraction?.(e, 'drag')}
                        title="Mover reproductor"
                    >
                        <GripHorizontal className="w-4 h-4" />
                    </div>`;
                    
code = code.replace('                <div className="relative">', loginDragHandle);

const playerDragHandle = `            <div className="absolute top-1.5 left-1.5 opacity-0 group-hover:opacity-100 transition-opacity z-50">
                <div 
                    className="p-1 text-white/80 hover:text-white transition-all bg-black/60 rounded-full backdrop-blur-sm cursor-move flex items-center justify-center"
                    onMouseDown={(e) => startInteraction?.(e, 'drag')}
                    onTouchStart={(e) => startInteraction?.(e, 'drag')}
                    style={{ filter: 'drop-shadow(0 1px 2px rgba(0, 0, 0, 0.8))' }}
                    title="Mover reproductor"
                >
                    <GripHorizontal className="w-4 h-4" />
                </div>
            </div>
            <div className="absolute top-1.5 right-1.5 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-50">`;
            
code = code.replace('            <div className="absolute top-1.5 right-1.5 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">', playerDragHandle);

fs.writeFileSync('components/SpotifyFloatingPlayer.tsx', code);
