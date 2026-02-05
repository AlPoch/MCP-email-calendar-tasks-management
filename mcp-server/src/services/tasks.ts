import { google, tasks_v1 } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';
import { config } from '../config.js';

export class TasksService {
    private tasksApi: tasks_v1.Tasks;
    private auth: OAuth2Client;

    constructor() {
        this.auth = new google.auth.OAuth2(
            config.google.clientId,
            config.google.clientSecret,
            config.google.redirectUri
        );

        if (config.google.refreshToken) {
            this.auth.setCredentials({
                refresh_token: config.google.refreshToken
            });
        }

        this.tasksApi = google.tasks({ version: 'v1', auth: this.auth });
    }

    // TaskLists CRUD
    async listTaskLists(): Promise<tasks_v1.Schema$TaskList[]> {
        const res = await this.tasksApi.tasklists.list();
        return res.data.items || [];
    }

    async createTaskList(title: string): Promise<tasks_v1.Schema$TaskList> {
        const res = await this.tasksApi.tasklists.insert({
            requestBody: { title }
        });
        return res.data;
    }

    async updateTaskList(taskListId: string, title: string): Promise<tasks_v1.Schema$TaskList> {
        const res = await this.tasksApi.tasklists.patch({
            tasklist: taskListId,
            requestBody: { title }
        });
        return res.data;
    }

    async deleteTaskList(taskListId: string): Promise<void> {
        await this.tasksApi.tasklists.delete({
            tasklist: taskListId
        });
    }

    // Tasks V2 List (Pagination)
    async listTasksV2(
        taskListId: string = '@default',
        completedMin?: string,
        completedMax?: string,
        dueMin?: string,
        dueMax?: string,
        pageToken?: string,
        maxResults: number = 100,
        showCompleted: boolean = true,
        showHidden: boolean = true,
        updatedMin?: string
    ): Promise<{ tasks: tasks_v1.Schema$Task[], nextPageToken?: string }> {

        const res = await this.tasksApi.tasks.list({
            tasklist: taskListId,
            completedMin,
            completedMax,
            dueMin,
            dueMax,
            pageToken,
            maxResults,
            showCompleted,
            showHidden,
            updatedMin
        });

        return {
            tasks: res.data.items || [],
            nextPageToken: res.data.nextPageToken || undefined
        };
    }

    // Backward compat V1
    async listTasks(taskListId: string = '@default'): Promise<tasks_v1.Schema$Task[]> {
        const res = await this.listTasksV2(taskListId);
        return res.tasks;
    }

    async getTask(taskListId: string, taskId: string): Promise<tasks_v1.Schema$Task> {
        const res = await this.tasksApi.tasks.get({
            tasklist: taskListId,
            task: taskId
        });
        return res.data;
    }

    async createTask(taskListId: string = '@default', title: string, notes?: string, due?: string): Promise<tasks_v1.Schema$Task> {
        const res = await this.tasksApi.tasks.insert({
            tasklist: taskListId,
            requestBody: {
                title,
                notes,
                due
            }
        });
        return res.data;
    }

    async updateTask(taskListId: string = '@default', taskId: string, updates: {
        title?: string,
        notes?: string,
        due?: string,
        status?: 'needsAction' | 'completed'
    }): Promise<tasks_v1.Schema$Task> {
        const res = await this.tasksApi.tasks.patch({
            tasklist: taskListId,
            task: taskId,
            requestBody: updates
        });
        return res.data;
    }

    async deleteTask(taskListId: string = '@default', taskId: string): Promise<void> {
        await this.tasksApi.tasks.delete({
            tasklist: taskListId,
            task: taskId
        });
    }

    async moveTask(taskListId: string, taskId: string, parentId?: string, previousId?: string): Promise<tasks_v1.Schema$Task> {
        const res = await this.tasksApi.tasks.move({
            tasklist: taskListId,
            task: taskId,
            parent: parentId,
            previous: previousId
        });
        return res.data;
    }

    async clearCompleted(taskListId: string): Promise<void> {
        await this.tasksApi.tasks.clear({
            tasklist: taskListId
        });
    }
}
