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
            title: z.string().describe('Task title'),
            notes: z.string().optional().describe('Task notes/description'),
            due: z.string().optional().describe('Due date in RFC 3339 format (e.g. 2026-01-27T12:00:00Z)'),
            taskListId: z.string().optional().describe('ID of the task list (default: @default)'),
        },
        async ({ title, notes, due, taskListId }: { title: string; notes?: string; due?: string; taskListId?: string }) => {
            try {
                const task = await tasksService.createTask(taskListId, title, notes, due);
                return {
                    content: [{ type: 'text', text: `Task created: ${task.title} (ID: ${task.id})` }],
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
            title: z.string().optional(),
            notes: z.string().optional(),
            status: z.enum(['needsAction', 'completed']).optional(),
            due: z.string().optional(),
        },
        async ({ taskId, taskListId, title, notes, status, due }: { taskId: string; taskListId?: string; title?: string; notes?: string; status?: 'needsAction' | 'completed'; due?: string }) => {
            try {
                const task = await tasksService.updateTask(taskListId, taskId, { title, notes, status, due });
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
