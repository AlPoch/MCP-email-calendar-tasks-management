import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { EmailService } from '../services/email.js';
import { config } from '../config.js';

export function registerEmailTools(server: McpServer, emailService: EmailService) {
    server.tool(
        'email_list',
        {
            limit: z.number().optional().describe('Number of emails to fetch (default: 10)'),
        },
        async ({ limit = 10 }: { limit?: number }) => {
            try {
                const emails = await emailService.listEmails(limit);
                return {
                    content: [{ type: 'text', text: JSON.stringify(emails, null, 2) }],
                };
            } catch (error) {
                return {
                    content: [{ type: 'text', text: `Error listing emails: ${error}` }],
                    isError: true,
                };
            }
        }
    );

    server.tool(
        'email_read',
        {
            uid: z.number().describe('The UID of the email to read'),
        },
        async ({ uid }: { uid: number }) => {
            try {
                const content = await emailService.getEmailContent(uid);
                return {
                    content: [{ type: 'text', text: content }],
                };
            } catch (error) {
                return {
                    content: [{ type: 'text', text: `Error reading email: ${error}` }],
                    isError: true,
                };
            }
        }
    );

    server.tool(
        'email_delete',
        {
            uid: z.number().describe('The UID of the email to delete'),
        },
        async ({ uid }: { uid: number }) => {
            try {
                await emailService.deleteEmail(uid);
                return {
                    content: [{ type: 'text', text: `Email ${uid} deleted successfully` }],
                };
            } catch (error) {
                return {
                    content: [{ type: 'text', text: `Error deleting email: ${error}` }],
                    isError: true,
                };
            }
        }
    );

    server.tool(
        'email_reply',
        {
            to: z.string().describe('Recipient email address'),
            subject: z.string().describe('Subject of the email'),
            body: z.string().describe('Body content of the reply'),
        },
        async ({ to, subject, body }: { to: string; subject: string; body: string }) => {
            try {
                await emailService.sendReply(to, subject, body);
                return {
                    content: [{ type: 'text', text: `Reply sent to ${to}` }],
                };
            } catch (error) {
                return {
                    content: [{ type: 'text', text: `Error sending reply: ${error}` }],
                    isError: true,
                };
            }
        }
    );

    server.tool(
        'email_list_folders',
        {},
        async () => {
            try {
                const folders = await emailService.listFolders();
                return {
                    content: [{ type: 'text', text: JSON.stringify(folders, null, 2) }]
                };
            } catch (error) {
                return {
                    content: [{ type: 'text', text: `Error listing folders: ${error}` }],
                    isError: true,
                };
            }
        }
    );

    server.tool(
        'email_move',
        {
            uid: z.number().describe('UID of the email to move to ' + config.gmx.moveTargetFolder),
        },
        async ({ uid }: { uid: number }) => {
            try {
                await emailService.moveEmailToSafeFolder(uid);
                return {
                    content: [{ type: 'text', text: `Email ${uid} moved to ${config.gmx.moveTargetFolder}` }]
                };
            } catch (error) {
                return {
                    content: [{ type: 'text', text: `Error moving email: ${error}` }],
                    isError: true
                };
            }
        }
    );
}
