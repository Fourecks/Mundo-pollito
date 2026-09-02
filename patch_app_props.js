import fs from 'fs';

let content = fs.readFileSync('App.tsx', 'utf-8');

const oldProps = `  folders: Folder[];
  projects: Project[];`;

const newProps = `  folders: Folder[];
  notes: Note[];
  projects: Project[];`;

content = content.replace(oldProps, newProps);

const oldDesktopCall = `const DesktopApp: React.FC<AppComponentProps> = (props) => {
  const {
    isOnline, isSyncing, currentUser, onLogout,
    theme, toggleTheme, themeColors, onThemeColorChange, onResetThemeColors,
    allTodos, folders, projects, habits, habitRecords, userBackgrounds, playlists, quickNotes, browserSession, selectedDate,`;

const newDesktopCall = `const DesktopApp: React.FC<AppComponentProps> = (props) => {
  const {
    isOnline, isSyncing, currentUser, onLogout,
    theme, toggleTheme, themeColors, onThemeColorChange, onResetThemeColors,
    allTodos, folders, notes, projects, habits, habitRecords, userBackgrounds, playlists, quickNotes, browserSession, selectedDate,`;

content = content.replace(oldDesktopCall, newDesktopCall);

const oldMobileCall = `const MobileApp: React.FC<AppComponentProps> = (props) => {
  const {
    isOnline, isSyncing, currentUser, onLogout,
    theme, toggleTheme, themeColors, onThemeColorChange, onResetThemeColors,
    allTodos, folders, projects, habits, habitRecords, userBackgrounds, playlists, quickNotes, browserSession, selectedDate,`;

const newMobileCall = `const MobileApp: React.FC<AppComponentProps> = (props) => {
  const {
    isOnline, isSyncing, currentUser, onLogout,
    theme, toggleTheme, themeColors, onThemeColorChange, onResetThemeColors,
    allTodos, folders, notes, projects, habits, habitRecords, userBackgrounds, playlists, quickNotes, browserSession, selectedDate,`;

content = content.replace(oldMobileCall, newMobileCall);

const oldAppCall = `allTodos: allTodos, folders: foldersWithNotes, projects, habits, habitRecords, userBackgrounds, playlists, quickNotes, browserSession, selectedDate,`;

const newAppCall = `allTodos: allTodos, folders: foldersWithNotes, notes: notes, projects, habits, habitRecords, userBackgrounds, playlists, quickNotes, browserSession, selectedDate,`;

content = content.replace(oldAppCall, newAppCall);


fs.writeFileSync('App.tsx', content);
