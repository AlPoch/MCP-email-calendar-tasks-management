import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { EmailService } from '../services/email.js';
import { config } from '../config.js';

export function registerEmailTools(server: McpServer, emailService: EmailService, getSessionCount: () => number) {
    server.tool(
        'email_list',
        {
            limit: z.number().optional().describe('Number of emails to fetch (default: 10)'),
            search: z.string().optional().describe('Search term for Subject, From, or Body'),
        },
        async ({ limit = 10, search }: { limit?: number, search?: string }) => {
            try {
                const emails = await emailService.listEmails(limit, search);
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
        'email_send',
        {
            to: z.string().describe('Recipient email address'),
            subject: z.string().describe('Subject of the email'),
            body: z.string().describe('Body content of the email'),
            account: z.string().optional().describe('Account name to send from (default: first account)'),
        },
        async ({ to, subject, body, account }: { to: string; subject: string; body: string, account?: string }) => {
            try {
                const accountName = account || config.email.accounts[0].name;
                await emailService.sendEmail(to, subject, body, accountName);
                return {
                    content: [{ type: 'text', text: `Email sent to ${to} from ${accountName}` }],
                };
            } catch (error) {
                return {
                    content: [{ type: 'text', text: `Error sending email: ${error}` }],
                    isError: true,
                };
            }
        }
    );

    server.tool(
        'email_read',
        {
            uid: z.number().describe('The UID of the email to read'),
            account: z.string().describe('The account name where the email exists'),
        },
        async ({ uid, account }: { uid: number, account: string }) => {
            try {
                const content = await emailService.getEmailContent(uid, account);
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
            account: z.string().describe('The account name where the email exists'),
        },
        async ({ uid, account }: { uid: number, account: string }) => {
            try {
                await emailService.deleteEmail(uid, account);
                return {
                    content: [{ type: 'text', text: `Email ${uid} deleted successfully from ${account}` }],
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
            account: z.string().describe('The account name to reply from (must match original email)'),
        },
        async ({ to, subject, body, account }: { to: string; subject: string; body: string, account: string }) => {
            try {
                await emailService.sendReply(to, subject, body, account);
                return {
                    content: [{ type: 'text', text: `Reply sent to ${to} from ${account}` }],
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
        {
            account: z.string().optional().describe('Account name to list folders for (default: first account)'),
        },
        async ({ account }: { account?: string }) => {
            try {
                const accountName = account || config.email.accounts[0].name;
                const folders = await emailService.listFolders(accountName);
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
            uid: z.number().describe('UID of the email to move'),
            account: z.string().describe('The account name where the email exists'),
        },
        async ({ uid, account }: { uid: number, account: string }) => {
            try {
                await emailService.moveEmailToSafeFolder(uid, account);
                return {
                    content: [{ type: 'text', text: `Email ${uid} moved to ${config.email.moveTargetFolder} in ${account}` }]
                };
            } catch (error) {
                return {
                    content: [{ type: 'text', text: `Error moving email: ${error}` }],
                    isError: true
                };
            }
        }
    );

    server.tool(
        'debug_status',
        {},
        async () => {
            return {
                content: [{
                    type: 'text',
                    text: JSON.stringify({
                        status: 'running',
                        accounts: config.email.accounts.map(a => ({ name: a.name, user: a.user })),
                        sessions: getSessionCount(),
                        time: new Date().toISOString()
                    }, null, 2)
                }]
            };
        }
    );
}
