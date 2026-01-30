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

    async listTaskLists(): Promise<tasks_v1.Schema$TaskList[]> {
        const res = await this.tasksApi.tasklists.list();
        return res.data.items || [];
    }

    async listTasks(taskListId: string = '@default'): Promise<tasks_v1.Schema$Task[]> {
        const res = await this.tasksApi.tasks.list({
            tasklist: taskListId,
            showCompleted: true,
            showHidden: true
        });
        return res.data.items || [];
    }

    async createTask(taskListId: string = '@default', title: string, notes?: string, due?: string): Promise<tasks_v1.Schema$Task> {
        const res = await this.tasksApi.tasks.insert({
            tasklist: taskListId,
            requestBody: {
                title,
                notes,
                due: due // RFC 3339 timestamp
            }
        });
        return res.data;
    }

    async updateTask(taskListId: string = '@default', taskId: string, updates: { title?: string, notes?: string, due?: string, status?: 'needsAction' | 'completed' }): Promise<tasks_v1.Schema$Task> {
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
}
