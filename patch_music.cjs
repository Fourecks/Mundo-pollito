const fs = require('fs');
let code = fs.readFileSync('components/MusicPlayer.tsx', 'utf8');

if (!code.includes('ModalWindowContext')) {
    code = code.replace("import React, { useState } from 'react';", "import React, { useState, useContext } from 'react';\nimport { ModalWindowContext } from './ModalWindow';");
    code = code.replace(
      "const MusicPlayer: React.FC<MusicPlayerProps> = ({", 
      "const MusicPlayer: React.FC<MusicPlayerProps> = ({"
    );
    
    // find the start of the component body
    const bodyStart = code.indexOf('}) => {') + 7;
    code = code.substring(0, bodyStart) + '\n  const { startInteraction } = useContext(ModalWindowContext);' + code.substring(bodyStart);
    
    code = code.replace(
        '        <header className="relative h-40 sm:h-48 w-full flex-shrink-0 overflow-hidden drag-handle cursor-move bg-gradient-to-r from-emerald-950 via-green-900 to-gray-900">',
        '        <header \n          className="relative h-40 sm:h-48 w-full flex-shrink-0 overflow-hidden drag-handle cursor-move bg-gradient-to-r from-emerald-950 via-green-900 to-gray-900"\n          onMouseDown={(e) => startInteraction?.(e, \'drag\')}\n          onTouchStart={(e) => startInteraction?.(e, \'drag\')}\n        >'
    );
    
    fs.writeFileSync('components/MusicPlayer.tsx', code);
}
