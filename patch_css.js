const fs = require('fs');
let content = fs.readFileSync('index.css', 'utf-8');

const oldCss = \`  .mobile-minimalist-override [class*="bg-indigo"],
  .mobile-minimalist-override [class*="bg-blue"],
  .mobile-minimalist-override [class*="bg-purple"],
  .mobile-minimalist-override [class*="bg-amber"],
  .mobile-minimalist-override [class*="bg-emerald"] {
    background-color: var(--color-zinc-100) !important;
    color: var(--color-zinc-900) !important;
  }

  .dark .mobile-minimalist-override [class*="bg-indigo"],
  .dark .mobile-minimalist-override [class*="bg-blue"],
  .dark .mobile-minimalist-override [class*="bg-purple"],
  .dark .mobile-minimalist-override [class*="bg-amber"],
  .dark .mobile-minimalist-override [class*="bg-emerald"] {
    background-color: var(--color-zinc-800) !important;
    color: var(--color-zinc-50) !important;
  }\`;

const newCss = \`  .mobile-minimalist-override [class*="bg-indigo"],
  .mobile-minimalist-override [class*="bg-blue"],
  .mobile-minimalist-override [class*="bg-purple"],
  .mobile-minimalist-override [class*="bg-amber"],
  .mobile-minimalist-override [class*="bg-emerald"] {
    background-color: #000000 !important;
    color: #ffffff !important;
  }

  .dark .mobile-minimalist-override [class*="bg-indigo"],
  .dark .mobile-minimalist-override [class*="bg-blue"],
  .dark .mobile-minimalist-override [class*="bg-purple"],
  .dark .mobile-minimalist-override [class*="bg-amber"],
  .dark .mobile-minimalist-override [class*="bg-emerald"] {
    background-color: #ffffff !important;
    color: #000000 !important;
  }\`;

content = content.replace(oldCss, newCss);
fs.writeFileSync('index.css', content);
console.log('patched');
