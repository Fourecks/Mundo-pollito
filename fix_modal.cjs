const fs = require('fs');
let code = fs.readFileSync('components/ModalWindow.tsx', 'utf8');

const badCode = `              <div 
                className="absolute top-0 left-0 right-8 h-8 cursor-move z-[9999] touch-none flex items-start justify-center pt-1"
                onMouseDown={(e) => startInteraction(e, 'drag')}
                onTouchStart={(e) => startInteraction(e, 'drag')}
                title="Arrastrar ventana"
              >
                <div className="w-12 h-1.5 bg-white/30 rounded-full backdrop-blur-sm pointer-events-none" />
              </div>
                onMouseDown={(e) => startInteraction(e, 'drag')}
                onTouchStart={(e) => startInteraction(e, 'drag')}
                title="Arrastrar ventana"
              />`;

const goodCode = `              <div 
                className="absolute top-0 left-0 right-8 h-8 cursor-move z-[9999] touch-none flex items-start justify-center pt-1"
                onMouseDown={(e) => startInteraction(e, 'drag')}
                onTouchStart={(e) => startInteraction(e, 'drag')}
                title="Arrastrar ventana"
              >
                <div className="w-12 h-1.5 bg-white/30 rounded-full backdrop-blur-sm pointer-events-none" />
              </div>`;

code = code.replace(badCode, goodCode);
fs.writeFileSync('components/ModalWindow.tsx', code);
