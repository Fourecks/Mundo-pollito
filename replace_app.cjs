const fs = require('fs');
const file = 'App.tsx';
let content = fs.readFileSync(file, 'utf8');

// 1. Update handleAddTodo signature
content = content.replace(
    /const handleAddTodo = useCallback\(async \(text: string, options\?: \{\n    projectId\?: number \| null;\n    isUndated\?: boolean;\n    dueDate\?: string \| null;\n    startTime\?: string;\n    endTime\?: string;\n    priority\?: Priority;\n    notes\?: string;\n    syncToGoogle\?: boolean;\n    syncToOutlook\?: boolean;\n  \}\) => \{/,
    "const handleAddTodo = useCallback(async (text: string, options?: {\n    projectId?: number | null;\n    project_id?: number | null;\n    isUndated?: boolean;\n    dueDate?: string | null;\n    startTime?: string;\n    endTime?: string;\n    priority?: Priority;\n    notes?: string;\n    syncToGoogle?: boolean;\n    syncToOutlook?: boolean;\n    sprint_id?: string | null;\n    milestone_id?: string | null;\n    story_points?: number | null;\n  }) => {"
);

// 2. Update newTodo creation
content = content.replace(
    /    const projectId = options\?\.projectId \|\| null;/,
    "    const projectId = options?.projectId || options?.project_id || null;"
);

content = content.replace(
    /        project_id: projectId,\n    \};/,
    "        project_id: projectId,\n        sprint_id: options?.sprint_id,\n        milestone_id: options?.milestone_id,\n        story_points: options?.story_points,\n    };"
);

fs.writeFileSync(file, content, 'utf8');
