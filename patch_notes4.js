import fs from 'fs';
let content = fs.readFileSync('components/NotesSection.tsx', 'utf-8');

const effectOld = `  // Sync active note state when selected note changes
  useEffect(() => {
    if (selectedNote) {
      activeNoteIdRef.current = selectedNote.id;`;

const effectNew = `  // Parse TOC
  const parseTOC = (html: string) => {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    const headings = doc.querySelectorAll('h1, h2, h3');
    const parsedToc: {level: number, text: string}[] = [];
    headings.forEach(h => {
       const level = parseInt(h.tagName.substring(1));
       parsedToc.push({ level, text: h.textContent || '' });
    });
    setToc(parsedToc);
  };

  // Sync active note state when selected note changes
  useEffect(() => {
    if (selectedNote) {
      activeNoteIdRef.current = selectedNote.id;
      parseTOC(selectedNote.content || '');`;

content = content.replace(effectOld, effectNew);

// Add TOC update to editor change
const handleEditorOld = `    if (editorRef.current) {
      const html = editorRef.current.innerHTML;
      setActiveNoteContent(html);
      setSaveStatus('saving');`;

const handleEditorNew = `    if (editorRef.current) {
      const html = editorRef.current.innerHTML;
      setActiveNoteContent(html);
      parseTOC(html);
      setSaveStatus('saving');`;

content = content.replace(handleEditorOld, handleEditorNew);

fs.writeFileSync('components/NotesSection.tsx', content);
