const fs = require('fs');
let code = fs.readFileSync('components/ModalWindow.tsx', 'utf8');

code = code.replace(
  '              <div \n                className="absolute top-0 left-0 right-0 h-8 cursor-move z-[9999] touch-none"',
  '              <div \n                className="absolute top-0 left-0 right-8 h-8 cursor-move z-[9999] touch-none flex items-start justify-center pt-1"\n                onMouseDown={(e) => startInteraction(e, \'drag\')}\n                onTouchStart={(e) => startInteraction(e, \'drag\')}\n                title="Arrastrar ventana"\n              >\n                <div className="w-12 h-1.5 bg-white/30 rounded-full backdrop-blur-sm pointer-events-none" />\n              </div>'
);

fs.writeFileSync('components/ModalWindow.tsx', code);
