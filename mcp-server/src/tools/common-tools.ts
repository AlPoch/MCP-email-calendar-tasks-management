import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { EmailService } from '../services/email.js';
import { CalendarService } from '../services/calendar.js';
import { TasksService } from '../services/tasks.js';

export function registerCommonTools(
    server: McpServer,
    email: EmailService,
    calendar: CalendarService,
    tasks: TasksService
) {
    server.tool(
        'capabilities',
        {},
        async () => {
            return {
                content: [{
                    type: 'text',
                    text: JSON.stringify({
                        email: {
                            provider: 'GMX/IMAP',
                            features: ['v2', 'pagination', 'search', 'forward-rfc822', 'flags', 'copy-move'],
                            limitations: ['imap-body-search-slow']
                        },
                        calendar: {
                            provider: 'Google Calendar v3',
                            features: ['v2', 'pagination', 'freebusy', 'sendUpdates'],
                        },
                        tasks: {
                            provider: 'Google Tasks v1',
                            features: ['v2', 'pagination', 'tasklists-crud', 'move'],
                            limitations: ['recurrence-not-native', 'attachments-not-supported']
                        }
                    }, null, 2)
                }]
            };
        }
    );

    server.tool(
        'healthcheck',
        {},
        async () => {
            const status: any = { status: 'healthy', checks: {} };

            // Email Check (cheap connectivity test via listing 1 email)
            try {
                const account = email.getAccountNames()[0];
                if (!account) throw new Error('No email accounts configured');

                const res = await email.listEmailsV2({ account, folder: 'INBOX', limit: 1, offset: 0 });
                status.checks.email = { status: 'ok', account, sampleEmails: res.emails.length };
            } catch (err: any) {
                status.checks.email = { status: 'error', message: err.message };
                status.status = 'degraded';
            }

            // Calendar Check
            try {
                const cals = await calendar.listCalendars();
                status.checks.calendar = { status: 'ok', count: cals.length };
            } catch (err: any) {
                status.checks.calendar = { status: 'error', message: err.message };
                status.status = 'degraded';
            }

            // Tasks Check
            try {
                const lists = await tasks.listTaskLists();
                status.checks.tasks = { status: 'ok', count: lists.length };
            } catch (err: any) {
                status.checks.tasks = { status: 'error', message: err.message };
                status.status = 'degraded';
            }

            return {
                content: [{ type: 'text', text: JSON.stringify(status, null, 2) }]
            };
        }
    );
}
