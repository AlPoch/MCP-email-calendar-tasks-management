import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { TasksService } from '../services/tasks.js';

export function registerTasksToolsV2(server: McpServer, tasksService: TasksService) {

    // --- TaskLists ---
    server.tool(
        'tasks_create_list',
        { title: z.string() },
        async ({ title }) => {
            try {
                const list = await tasksService.createTaskList(title);
                return { content: [{ type: 'text', text: `Created list: ${list.title} (${list.id})` }] };
            } catch (err: any) { return { isError: true, content: [{ type: 'text', text: `Error: ${err.message}` }] }; }
        }
    );

    server.tool(
        'tasks_update_list',
        { taskListId: z.string(), title: z.string() },
        async ({ taskListId, title }) => {
            try {
                const list = await tasksService.updateTaskList(taskListId, title);
                return { content: [{ type: 'text', text: `Updated list: ${list.title}` }] };
            } catch (err: any) { return { isError: true, content: [{ type: 'text', text: `Error: ${err.message}` }] }; }
        }
    );

    server.tool(
        'tasks_delete_list',
        { taskListId: z.string() },
        async ({ taskListId }) => {
            try {
                await tasksService.deleteTaskList(taskListId);
                return { content: [{ type: 'text', text: `Deleted list ${taskListId}` }] };
            } catch (err: any) { return { isError: true, content: [{ type: 'text', text: `Error: ${err.message}` }] }; }
        }
    );

    // --- Tasks V2 ---
    server.tool(
        'tasks_list_v2',
        {
            taskListId: z.string().optional().describe('Default: @default'),
            showCompleted: z.boolean().optional(),
            showHidden: z.boolean().optional(),
            dueMin: z.string().optional(),
            dueMax: z.string().optional(),
            pageToken: z.string().optional(),
            maxResults: z.number().optional()
        },
        async (args) => {
            try {
                const res = await tasksService.listTasksV2(
                    args.taskListId,
                    undefined, undefined, // completedMin/Max
                    args.dueMin, args.dueMax,
                    args.pageToken,
                    args.maxResults,
                    args.showCompleted,
                    args.showHidden
                );
                return { content: [{ type: 'text', text: JSON.stringify(res, null, 2) }] };
            } catch (err: any) { return { isError: true, content: [{ type: 'text', text: `Error: ${err.message}` }] }; }
        }
    );

    server.tool(
        'tasks_get',
        { taskListId: z.string(), taskId: z.string() },
        async ({ taskListId, taskId }) => {
            try {
                const task = await tasksService.getTask(taskListId, taskId);
                return { content: [{ type: 'text', text: JSON.stringify(task, null, 2) }] };
            } catch (err: any) { return { isError: true, content: [{ type: 'text', text: `Error: ${err.message}` }] }; }
        }
    );

    server.tool(
        'tasks_move',
        {
            taskListId: z.string(),
            taskId: z.string(),
            parentId: z.string().optional().describe('New parent task ID'),
            previousId: z.string().optional().describe('Sibling ID to follow')
        },
        async ({ taskListId, taskId, parentId, previousId }) => {
            try {
                const task = await tasksService.moveTask(taskListId, taskId, parentId, previousId);
                return { content: [{ type: 'text', text: `Moved task ${taskId}. New Parent: ${task.parent || 'root'}` }] };
            } catch (err: any) { return { isError: true, content: [{ type: 'text', text: `Error: ${err.message}` }] }; }
        }
    );

    server.tool(
        'tasks_clear_completed',
        { taskListId: z.string() },
        async ({ taskListId }) => {
            try {
                await tasksService.clearCompleted(taskListId);
                return { content: [{ type: 'text', text: `Cleared completed tasks in ${taskListId}` }] };
            } catch (err: any) { return { isError: true, content: [{ type: 'text', text: `Error: ${err.message}` }] }; }
        }
    );
}
