import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { EmailService } from '../services/email.js';
import { config } from '../config.js';

export function registerEmailToolsV2(server: McpServer, emailService: EmailService) {

    server.tool(
        'email_list_v2',
        {
            account: z.string().optional().describe('Account name (defaults to first account)'),
            folder: z.string().optional().describe('Folder to search (default: INBOX)'),
            limit: z.number().optional().describe('Max results (default: 20)'),
            offset: z.number().optional().describe('Pagination offset (default: 0)'),
            search: z.string().optional().describe('Search term (Subject, From, or Body)'),
            searchInBody: z.boolean().optional().describe('Include BODY in search (slower)'),
            unreadOnly: z.boolean().optional().describe('Filter unread messages'),
            since: z.string().optional().describe('Filter messages since Date (ISO)')
        },
        async (args) => {
            try {
                const result = await emailService.listEmailsV2(args);
                return {
                    content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
                };
            } catch (err: any) {
                return {
                    isError: true,
                    content: [{ type: 'text', text: `Error: ${err.message}` }]
                };
            }
        }
    );

    server.tool(
        'email_read_v2',
        {
            uid: z.number(),
            account: z.string(),
            format: z.enum(['text', 'html']).optional()
        },
        async ({ uid, account, format }) => {
            try {
                const data = await emailService.getEmailContentV2(uid, account, format);
                return {
                    content: [{ type: 'text', text: JSON.stringify(data, null, 2) }]
                };
            } catch (err: any) {
                return { isError: true, content: [{ type: 'text', text: `Error: ${err.message}` }] };
            }
        }
    );

    server.tool(
        'email_move_v2',
        {
            uid: z.number(),
            account: z.string(),
            toFolder: z.string()
        },
        async ({ uid, account, toFolder }) => {
            try {
                await emailService.moveEmail(uid, account, toFolder);
                return { content: [{ type: 'text', text: `Moved email ${uid} to ${toFolder}` }] };
            } catch (err: any) {
                return { isError: true, content: [{ type: 'text', text: `Error: ${err.message}` }] };
            }
        }
    );

    server.tool(
        'email_copy',
        {
            uid: z.number(),
            account: z.string(),
            toFolder: z.string()
        },
        async ({ uid, account, toFolder }) => {
            try {
                await emailService.copyEmail(uid, account, toFolder);
                return { content: [{ type: 'text', text: `Copied email ${uid} to ${toFolder}` }] };
            } catch (err: any) {
                return { isError: true, content: [{ type: 'text', text: `Error: ${err.message}` }] };
            }
        }
    );

    server.tool(
        'email_mark_read',
        {
            uid: z.number(),
            account: z.string(),
            seen: z.boolean()
        },
        async ({ uid, account, seen }) => {
            try {
                await emailService.markAsRead(uid, account, seen);
                return { content: [{ type: 'text', text: `Marked email ${uid} as ${seen ? 'Read' : 'Unread'}` }] };
            } catch (err: any) {
                return { isError: true, content: [{ type: 'text', text: `Error: ${err.message}` }] };
            }
        }
    );

    server.tool(
        'email_flags',
        {
            uid: z.number(),
            account: z.string(),
            flags: z.array(z.string()).describe('IMAP flags to add (e.g. \\Flagged)')
        },
        async ({ uid, account, flags }) => {
            try {
                await emailService.addFlags(uid, account, flags);
                return { content: [{ type: 'text', text: `Added flags [${flags.join(', ')}] to ${uid}` }] };
            } catch (err: any) {
                return { isError: true, content: [{ type: 'text', text: `Error: ${err.message}` }] };
            }
        }
    );

    server.tool(
        'email_send_v2',
        {
            to: z.string(),
            subject: z.string(),
            body: z.string(),
            account: z.string().optional(),
            attachments: z.array(z.object({
                filename: z.string(),
                content: z.string().describe('Base64 content'),
                contentType: z.string().optional()
            })).optional()
        },
        async ({ to, subject, body, account, attachments }) => {
            try {
                const accountName = account || config.email.accounts[0].name;
                // Convert base64 to Buffer
                const processedAttachments = attachments?.map(a => ({
                    filename: a.filename,
                    content: Buffer.from(a.content, 'base64'),
                    contentType: a.contentType
                }));

                await emailService.sendEmail(to, subject, body, accountName, processedAttachments);
                return { content: [{ type: 'text', text: `Sent email to ${to} from ${accountName}` }] };
            } catch (err: any) {
                return { isError: true, content: [{ type: 'text', text: `Error: ${err.message}` }] };
            }
        }
    );

    server.tool(
        'email_forward',
        {
            uid: z.number(),
            account: z.string(),
            to: z.string(),
            mode: z.enum(['inline', 'rfc822']).optional().describe('Forwarding mode (default: rfc822 attachment)')
        },
        async ({ uid, account, to, mode }) => {
            try {
                await emailService.forwardEmail(uid, account, to, mode || 'rfc822');
                return { content: [{ type: 'text', text: `Forwarded email ${uid} to ${to}` }] };
            } catch (err: any) {
                return { isError: true, content: [{ type: 'text', text: `Error: ${err.message}` }] };
            }
        }
    );

    server.tool(
        'email_get_raw',
        { uid: z.number(), account: z.string() },
        async ({ uid, account }) => {
            try {
                const raw = await emailService.getRawEmail(uid, account);
                return { content: [{ type: 'text', text: raw }] };
            } catch (err: any) {
                return { isError: true, content: [{ type: 'text', text: `Error: ${err.message}` }] };
            }
        }
    );
}
