import React from 'react';
import TaskDetailsModal from './TaskDetailsModal';
import { Todo, Project } from '../types';

interface MobileTaskEditorProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (todo: Todo) => void;
  onDelete: (id: number) => void;
  todo: Todo | null;
  projects: Project[];
  onRemoveFromCalendar?: (todo: Todo) => Promise<void>;
  onSyncToCalendar?: (todo: Todo) => Promise<void>;
}

const MobileTaskEditor: React.FC<MobileTaskEditorProps> = (props) => {
  return <TaskDetailsModal {...props} />;
};

export default MobileTaskEditor;
