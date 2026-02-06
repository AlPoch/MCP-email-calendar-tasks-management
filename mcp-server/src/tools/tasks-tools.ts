import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { TasksService } from '../services/tasks.js';

export function registerTasksTools(server: McpServer, tasksService: TasksService) {
    server.tool(
        'tasks_list_lists',
        {},
        async () => {
            try {
                const lists = await tasksService.listTaskLists();
                const simplified = lists.map(l => ({
                    id: l.id,
                    title: l.title,
                    updated: l.updated
                }));
                return {
                    content: [{ type: 'text', text: JSON.stringify(simplified, null, 2) }],
                };
            } catch (error) {
                return {
                    content: [{ type: 'text', text: `Error listing task lists: ${error}` }],
                    isError: true,
                };
            }
        }
    );

    server.tool(
        'tasks_list',
        {
            taskListId: z.string().optional().describe('ID of the task list (default: @default)'),
        },
        async ({ taskListId }: { taskListId?: string }) => {
            try {
                const tasks = await tasksService.listTasks(taskListId);
                const simplified = tasks.map(t => ({
                    id: t.id,
                    title: t.title,
                    notes: t.notes,
                    status: t.status,
                    due: t.due,
                    completed: t.completed
                }));
                return {
                    content: [{ type: 'text', text: JSON.stringify(simplified, null, 2) }],
                };
            } catch (error) {
                return {
                    content: [{ type: 'text', text: `Error listing tasks: ${error}` }],
                    isError: true,
                };
            }
        }
    );

    server.tool(
        'tasks_create',
        {
            title: z.string().min(1).describe('Task title'),
            notes: z.string().optional().describe('Task notes/description'),
            dueDay: z.string().optional().describe('Due day in YYYY-MM-DD format'),
            dueTime: z.string().optional().describe('Due time in HH:mm format'),
            recurrence: z.string().optional().describe('Recurrence rule (e.g., "Daily", "Every Monday")'),
            taskListId: z.string().optional().describe('ID of the task list (default: @default)'),
        },
        async ({ title, notes, dueDay, dueTime, recurrence, taskListId }: {
            title: string;
            notes?: string;
            dueDay?: string;
            dueTime?: string;
            recurrence?: string;
            taskListId?: string
        }) => {
            try {
                let due: string | undefined = undefined;
                if (dueDay) {
                    due = `${dueDay}T${dueTime || '12:00'}:00Z`;
                }

                let finalNotes = notes || '';
                if (recurrence) {
                    finalNotes = `${finalNotes}\n\n[RECURRENCE: ${recurrence}]`.trim();
                }

                const task = await tasksService.createTask(taskListId, title, finalNotes, due);
                return {
                    content: [{ type: 'text', text: `Task created: ${task.title} (ID: ${task.id}). Note: Google Tasks API may only show the date part of the due time.` }],
                };
            } catch (error) {
                return {
                    content: [{ type: 'text', text: `Error creating task: ${error}` }],
                    isError: true,
                };
            }
        }
    );

    server.tool(
        'tasks_update',
        {
            taskId: z.string().describe('ID of the task to update'),
            taskListId: z.string().optional().describe('ID of the task list (default: @default)'),
            title: z.string().min(1).optional(),
            notes: z.string().optional(),
            status: z.enum(['needsAction', 'completed']).optional(),
            dueDay: z.string().optional().describe('Due day in YYYY-MM-DD format'),
            dueTime: z.string().optional().describe('Due time in HH:mm format'),
            recurrence: z.string().optional().describe('Recurrence rule'),
        },
        async ({ taskId, taskListId, title, notes, status, dueDay, dueTime, recurrence }: {
            taskId: string;
            taskListId?: string;
            title?: string;
            notes?: string;
            status?: 'needsAction' | 'completed';
            dueDay?: string;
            dueTime?: string;
            recurrence?: string
        }) => {
            try {
                let due: string | undefined = undefined;
                if (dueDay) {
                    due = `${dueDay}T${dueTime || '12:00'}:00Z`;
                }

                let finalNotes = notes;
                if (recurrence) {
                    finalNotes = `${notes || ''}\n\n[RECURRENCE: ${recurrence}]`.trim();
                }

                const task = await tasksService.updateTask(taskListId, taskId, { title, notes: finalNotes, status, due });
                return {
                    content: [{ type: 'text', text: `Task updated: ${task.title}` }],
                };
            } catch (error) {
                return {
                    content: [{ type: 'text', text: `Error updating task: ${error}` }],
                    isError: true,
                };
            }
        }
    );

    server.tool(
        'tasks_delete',
        {
            taskId: z.string().describe('ID of the task to delete'),
            taskListId: z.string().optional().describe('ID of the task list (default: @default)'),
        },
        async ({ taskId, taskListId }: { taskId: string; taskListId?: string }) => {
            try {
                await tasksService.deleteTask(taskListId, taskId);
                return {
                    content: [{ type: 'text', text: `Task ${taskId} deleted successfully` }],
                };
            } catch (error) {
                return {
                    content: [{ type: 'text', text: `Error deleting task: ${error}` }],
                    isError: true,
                };
            }
        }
    );
}
