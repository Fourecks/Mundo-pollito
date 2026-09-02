import fs from 'fs';

let content = fs.readFileSync('components/NotesSection.tsx', 'utf-8');

const missingStates = `  const [slashMenuOpen, setSlashMenuOpen] = useState(false);
  const [slashMenuPos, setSlashMenuPos] = useState({ top: 0, left: 0 });`;

content = content.replace(
  "  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'error'>('saved');",
  "  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'error'>('saved');\n" + missingStates
);

fs.writeFileSync('components/NotesSection.tsx', content);
