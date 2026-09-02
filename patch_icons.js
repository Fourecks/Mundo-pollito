import fs from 'fs';

let content = fs.readFileSync('components/NotesSection.tsx', 'utf-8');

content = content.replace(
  'AlertCircle,',
  'AlertCircle,\n  Terminal,\n  CloudLightning,\n  CheckCircle2,'
);

fs.writeFileSync('components/NotesSection.tsx', content);
