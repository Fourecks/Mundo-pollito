const fs = require('fs');
let html = fs.readFileSync('index.html', 'utf8');

const hoverCss = `
      body[data-fullscreen-window="true"] .app-dock-trigger-area:hover ~ .app-dock-container,
      body[data-fullscreen-window="true"] .app-dock-container:hover,
      body.focus-mode-active .app-dock-trigger-area:hover ~ .app-dock-container,
      body.focus-mode-active .app-dock-container:hover {
          transform: translateY(0) !important;
          opacity: 1 !important;
          pointer-events: auto !important;
      }
      body[data-fullscreen-window="true"] .app-left-sidebar-trigger-area:hover ~ .app-left-sidebar-container,
      body[data-fullscreen-window="true"] .app-left-sidebar-container:hover,
      body.focus-mode-active .app-left-sidebar-trigger-area:hover ~ .app-left-sidebar-container,
      body.focus-mode-active .app-left-sidebar-container:hover {
          transform: translateX(0) !important;
          opacity: 1 !important;
          pointer-events: auto !important;
      }
      body[data-fullscreen-window="true"] .app-right-header-trigger-area:hover ~ .app-right-header-container,
      body[data-fullscreen-window="true"] .app-right-header-container:hover,
      body.focus-mode-active .app-right-header-trigger-area:hover ~ .app-right-header-container,
      body.focus-mode-active .app-right-header-container:hover {
          transform: translateX(0) !important;
          opacity: 1 !important;
          pointer-events: auto !important;
      }
`;

// Replace the old hover rules
html = html.replace(/body\[data-fullscreen-window="true"\] \.app-dock-trigger-area:hover ~ \.app-dock-container,\s*body\[data-fullscreen-window="true"\] \.app-dock-container:hover \{\s*transform: translateY\(0\) !important;\s*\}/, hoverCss);

html = html.replace(/body\[data-fullscreen-window="true"\] \.app-left-sidebar-trigger-area:hover ~ \.app-left-sidebar-container,\s*body\[data-fullscreen-window="true"\] \.app-left-sidebar-container:hover \{\s*transform: translateX\(0\) !important;\s*\}/, '');

html = html.replace(/body\[data-fullscreen-window="true"\] \.app-right-header-trigger-area:hover ~ \.app-right-header-container,\s*body\[data-fullscreen-window="true"\] \.app-right-header-container:hover \{\s*transform: translateX\(0\) !important;\s*\}/, '');


// Also we need to add the hidden rules for body.focus-mode-active
const hiddenCss = `
      body[data-fullscreen-window="true"] .app-dock-container,
      body.focus-mode-active .app-dock-container {
          transform: translateY(100%) !important;
          z-index: 70000 !important;
      }
      body[data-fullscreen-window="true"] .app-left-sidebar-container,
      body.focus-mode-active .app-left-sidebar-container {
          transform: translateX(-120%) !important;
          z-index: 70000 !important;
      }
      body[data-fullscreen-window="true"] .app-right-header-container,
      body.focus-mode-active .app-right-header-container {
          transform: translateX(120%) !important;
          z-index: 70000 !important;
      }
`;

html = html.replace(/body\[data-fullscreen-window="true"\] \.app-dock-container \{\s*transform: translateY\(100\%\) !important;\s*z-index: 70000 !important;\s*\}/, hiddenCss);
html = html.replace(/body\[data-fullscreen-window="true"\] \.app-left-sidebar-container \{\s*transform: translateX\(-120\%\) !important;\s*z-index: 70000 !important;\s*\}/, '');
html = html.replace(/body\[data-fullscreen-window="true"\] \.app-right-header-container \{\s*transform: translateX\(120\%\) !important;\s*z-index: 70000 !important;\s*\}/, '');


fs.writeFileSync('index.html', html);
