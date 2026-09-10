import { Project } from '../types';

export const PROJECT_ORDER_STORAGE_KEY = 'custom_project_order';

export const getSavedProjectOrder = (): number[] => {
    try {
        const stored = localStorage.getItem(PROJECT_ORDER_STORAGE_KEY);
        if (!stored) return [];
        const parsed = JSON.parse(stored);
        return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
        console.error('Error reading saved project order:', e);
        return [];
    }
};

export const saveProjectOrder = (ids: number[]): void => {
    try {
        localStorage.setItem(PROJECT_ORDER_STORAGE_KEY, JSON.stringify(ids));
    } catch (e) {
        console.error('Error saving project order:', e);
    }
};

export const sortProjectsBySavedOrder = (projects: Project[]): Project[] => {
    if (!projects || projects.length <= 1) return projects || [];
    const savedIds = getSavedProjectOrder();
    if (savedIds.length === 0) {
        return [...projects];
    }

    return [...projects].sort((a, b) => {
        const idxA = savedIds.indexOf(a.id);
        const idxB = savedIds.indexOf(b.id);
        if (idxA !== -1 && idxB !== -1) {
            return idxA - idxB;
        }
        if (idxA !== -1) return -1;
        if (idxB !== -1) return 1;
        return (a.name || '').localeCompare(b.name || '');
    });
};
