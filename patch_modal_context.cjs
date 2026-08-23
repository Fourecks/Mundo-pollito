const fs = require('fs');
let code = fs.readFileSync('components/ModalWindow.tsx', 'utf8');

// Add context
code = code.replace(
  "import { WindowState } from '../types';",
  "import { WindowState } from '../types';\n\nexport const ModalWindowContext = React.createContext<{\n  startInteraction?: (e: React.MouseEvent | React.TouchEvent, type: 'drag' | 'resize') => void;\n}>({});"
);

// Wrap children
code = code.replace(
  'return (\n    <div className="pointer-events-none fixed inset-0 z-50 flex items-center justify-center">',
  'return (\n    <ModalWindowContext.Provider value={{ startInteraction }}>\n    <div className="pointer-events-none fixed inset-0 z-50 flex items-center justify-center">'
);

// We need to also close the Provider. Let's find the end.
const endDivIndex = code.lastIndexOf('</div>\n  );\n}');
if (endDivIndex !== -1) {
  code = code.substring(0, endDivIndex) + '</div>\n    </ModalWindowContext.Provider>\n  );\n}' + code.substring(endDivIndex + 14);
}

// Remove the hacky drag handle from frameless mode
const framelessDragHandle = `            {isDraggable && (
              <div 
                className="absolute top-0 left-0 right-8 h-8 cursor-move z-[9999] touch-none flex items-start justify-center pt-1"
                onMouseDown={(e) => startInteraction(e, 'drag')}
                onTouchStart={(e) => startInteraction(e, 'drag')}
                title="Arrastrar ventana"
              >
                <div className="w-12 h-1.5 bg-white/30 rounded-full backdrop-blur-sm pointer-events-none" />
              </div>
            )}`;

code = code.replace(framelessDragHandle, '');

fs.writeFileSync('components/ModalWindow.tsx', code);
