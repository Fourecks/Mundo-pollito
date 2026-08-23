const fs = require('fs');
let code = fs.readFileSync('components/ModalWindow.tsx', 'utf8');

// For the first return (fullscreen mode)
code = code.replace(
  "return (\n      <div\n        ref={modalRef}",
  "return (\n    <ModalWindowContext.Provider value={{ startInteraction }}>\n      <div\n        ref={modalRef}"
);

// We need to find where the fullscreen return ends.
const fullscreenReturnEnd = `      </div>\n    );\n  }`;
code = code.replace(
  fullscreenReturnEnd,
  `      </div>\n    </ModalWindowContext.Provider>\n    );\n  }`
);

// For the second return (normal mode)
code = code.replace(
  "  return (\n    <>\n      {/* Invisible backdrop",
  "  return (\n    <ModalWindowContext.Provider value={{ startInteraction }}>\n    <>\n      {/* Invisible backdrop"
);

// We need to find where the normal return ends.
code = code.replace(
  "    </>\n  );\n};\n\nexport const ModalWindow",
  "    </>\n    </ModalWindowContext.Provider>\n  );\n};\n\nexport const ModalWindow"
);

fs.writeFileSync('components/ModalWindow.tsx', code);
