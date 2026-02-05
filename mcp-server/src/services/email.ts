import imaps from 'imap-simple';
import nodemailer from 'nodemailer';
import { config } from '../config.js';
import { simpleParser, ParsedMail } from 'mailparser';

export interface EmailMessage {
    id: number;
    uid: number;
    subject: string;
    from: string;
    date: string;
    account: string;
    flags?: string[];
    snippet?: string;
    folder?: string;
}

export interface ListEmailsOptions {
    account?: string;
    folder?: string;
    limit?: number;
    offset?: number; // For pagination
    search?: string; // Global search
    searchInBody?: boolean;
    unreadOnly?: boolean;
    since?: string; // ISO Date
}

export class EmailService {
    private smtpTransports: Map<string, nodemailer.Transporter> = new Map();

    constructor() {
        config.email.accounts.forEach(acc => {
            this.smtpTransports.set(acc.name, nodemailer.createTransport({
                host: acc.smtpHost,
                port: acc.smtpPort,
                secure: acc.smtpSecure !== undefined ? acc.smtpSecure : acc.smtpPort === 465,
                auth: {
                    user: acc.user,
                    pass: acc.password,
                },
                tls: {
                    rejectUnauthorized: false
                }
            }));
        });
    }

    private async getImapConnection(accountName: string) {
        const acc = config.email.accounts.find(a => a.name === accountName);
        if (!acc) throw new Error(`Account ${accountName} not found`);

        const connectionConfig = {
            imap: {
                user: acc.user,
                password: acc.password,
                host: acc.imapHost,
                port: acc.imapPort,
                tls: true,
                tlsOptions: { rejectUnauthorized: false },
                authTimeout: 10000,
            },
        };

        try {
            return await imaps.connect(connectionConfig);
        } catch (err: any) {
            console.error(`[EmailService] Connection failed for ${accountName}:`, err);
            throw new Error(`IMAP Connection Failed for ${accountName}: ${err.message}`);
        }
    }

    // Helper to resolve UID to Sequence Number (needed for many imap-simple actions)
    private async performOnUid(uid: number, accountName: string, folder: string, action: (connection: any, seqNo: number) => Promise<void>) {
        const connection = await this.getImapConnection(accountName);
        try {
            await connection.openBox(folder);
            // Fetch SeqNo for this UID. 
            // imap-simple search returns Message object which has `seqNo`.
            const results = await connection.search([['UID', uid]], { bodies: ['HEADER.FIELDS (DATE)'] });
            if (results.length === 0) throw new Error(`Email UID ${uid} not found in ${folder}`);

            const seqNo = results[0].seqNo;
            await action(connection, seqNo);
        } finally {
            connection.end();
        }
    }

    // --- Legacy V1 Implementation (Redirected) ---
    async listEmails(limit: number = 10, search?: string): Promise<EmailMessage[]> {
        const allMessages: EmailMessage[] = [];
        for (const acc of config.email.accounts) {
            try {
                const res = await this.listEmailsV2({
                    account: acc.name,
                    limit: limit,
                    search: search
                });
                allMessages.push(...res.emails);
            } catch (err) {
                console.warn(`[listEmails V1] Failed to fetch from ${acc.name}: ${err}`);
            }
        }
        return allMessages.sort((a, b) => {
            return new Date(b.date).getTime() - new Date(a.date).getTime();
        }).slice(0, limit);
    }

    // --- V2 Implementation ---

    async listEmailsV2(opts: ListEmailsOptions): Promise<{ emails: EmailMessage[], nextCursor?: number }> {
        const accountsToQuery = opts.account
            ? [config.email.accounts.find(a => a.name === opts.account)].filter(Boolean) as typeof config.email.accounts
            : config.email.accounts;

        if (accountsToQuery.length === 0) throw new Error('No valid account specified');

        const targetAccount = accountsToQuery[0];
        const folder = opts.folder || 'INBOX';
        const limit = opts.limit || 20;
        const offset = opts.offset || 0;

        console.log(`[EmailService V2] Querying ${targetAccount.name} / ${folder} (Limit: ${limit}, Offset: ${offset})`);

        const connection = await this.getImapConnection(targetAccount.name);
        try {
            await connection.openBox(folder);

            let searchCriteria: any[] = [];
            if (opts.unreadOnly) searchCriteria.push('UNSEEN');
            if (opts.since) searchCriteria.push(['SINCE', new Date(opts.since).toISOString()]);

            if (opts.search) {
                const term = opts.search;
                const textSearch = ['OR', ['SUBJECT', term], ['FROM', term]];
                if (opts.searchInBody) {
                    searchCriteria.push(['OR', ['OR', ['SUBJECT', term], ['FROM', term]], ['BODY', term]]);
                } else {
                    searchCriteria.push(textSearch);
                }
            }

            if (searchCriteria.length === 0) searchCriteria = ['ALL'];

            const allUIDs = await connection.search(searchCriteria, { bodies: ['HEADER.FIELDS (DATE)'], markSeen: false });

            allUIDs.sort((a, b) => {
                const dateA = a.attributes.date ? new Date(a.attributes.date).getTime() : 0;
                const dateB = b.attributes.date ? new Date(b.attributes.date).getTime() : 0;
                return dateB - dateA;
            });

            const slicedMessages = allUIDs.slice(offset, offset + limit);
            if (slicedMessages.length === 0) return { emails: [] };

            const targetUIDs = slicedMessages.map(m => m.attributes.uid);
            // Fetch clean headers for these UIDs. 
            // Since imap-simple doesn't support UID fetch easily, we use the results we already have
            // BUT we only fetched minimal headers. 
            // We'll trust that we can fetch more details OR just use what we have if minimal is acceptable?
            // "Subject" and "From" are required.
            // We MUST do a second fetch or initial fetch must include them.
            // Let's do initial fetch with proper headers since slice is local.
            // For massive inboxes, fetching ALL headers is bad.
            // But we don't have UID fetch support easily.
            // WORKAROUND: Use 'search' with [['UID', ...]] for the sliced subset.
            const subsetSearch = [['UID', targetUIDs.join(',')]];
            // Wait, does SEARCH UID 1,2,3 work? Yes: UID 1,2,3.
            // imap-simple criteria: [['UID', '1,2,3']] ? No, usually single UID. 
            // node-imap `search` allows array ? 'search' takes criteria list.
            // We can construct ['OR', ['UID', 1], ['UID', 2]...]
            // Let's fallback to: Fetch everything initially (HEADER only). It's reasonable for < 5000 emails.

            // Re-doing the search with full headers.
            const fullFetch = await connection.search(searchCriteria, {
                bodies: ['HEADER'],
                markSeen: false,
                struct: true
            });

            fullFetch.sort((a, b) => {
                return new Date(b.attributes.date).getTime() - new Date(a.attributes.date).getTime();
            });

            const paged = fullFetch.slice(offset, offset + limit);

            const emails: EmailMessage[] = paged.map(msg => {
                const headerPart = msg.parts.find(p => p.which === 'HEADER');
                const header = headerPart?.body || {};

                return {
                    id: msg.seqNo,
                    uid: msg.attributes.uid,
                    subject: header.subject ? header.subject[0] : '(No Subject)',
                    from: header.from ? header.from[0] : 'Unknown',
                    date: msg.attributes.date.toString(),
                    account: targetAccount.name,
                    flags: msg.attributes.flags,
                    folder: folder
                };
            });

            return {
                emails,
                nextCursor: paged.length === limit ? offset + limit : undefined
            };

        } finally {
            connection.end();
        }
    }

    async getEmailContentV2(uid: number, accountName: string, format: 'text' | 'html' = 'text'): Promise<any> {
        const connection = await this.getImapConnection(accountName);
        try {
            await connection.openBox('INBOX');
            const searchCriteria = [['UID', uid]];
            const fetchOptions = {
                bodies: [''],
                markSeen: true,
            };

            const messages = await connection.search(searchCriteria, fetchOptions);
            if (messages.length === 0) throw new Error(`Email UID ${uid} not found`);

            const rawSource = messages[0].parts[0].body;
            const parsed = await simpleParser(rawSource);

            // Safe address parsing
            const fromText = (parsed.from as any)?.text || (Array.isArray(parsed.from) ? parsed.from[0]?.text : (parsed.from as any)?.value?.[0]?.address) || 'Unknown';
            const toText = (parsed.to as any)?.text || (Array.isArray(parsed.to) ? parsed.to[0]?.text : (parsed.to as any)?.value?.[0]?.address) || 'Unknown';

            return {
                subject: parsed.subject,
                from: fromText,
                to: toText,
                date: parsed.date,
                text: parsed.text,
                html: parsed.html,
                params: {
                    messageId: parsed.messageId,
                    priority: parsed.priority
                },
                attachments: parsed.attachments?.map(a => ({
                    filename: a.filename,
                    contentType: a.contentType,
                    size: a.size,
                    checksum: a.checksum,
                    id: a.checksum
                })) || []
            };

        } finally {
            connection.end();
        }
    }

    // Reuse V1 for compat
    async getEmailContent(uid: number, accountName: string): Promise<string> {
        const data = await this.getEmailContentV2(uid, accountName);
        return data.text || data.html || '(No Content)';
    }

    async getRawEmail(uid: number, accountName: string): Promise<string> {
        const connection = await this.getImapConnection(accountName);
        try {
            await connection.openBox('INBOX');
            const messages = await connection.search([['UID', uid]], { bodies: [''] });
            if (messages.length === 0) throw new Error('Email not found');
            return messages[0].parts[0].body;
        } finally {
            connection.end();
        }
    }

    async listFolders(accountName: string): Promise<string[]> {
        const connection = await this.getImapConnection(accountName);
        try {
            if (typeof connection.getBoxes !== 'function') {
                throw new Error('IMAP Connection object invalid (no getBoxes method)');
            }
            const boxes = await connection.getBoxes();
            const flatten = (boxList: any, prefix = ''): string[] => {
                let result: string[] = [];
                for (const key of Object.keys(boxList)) {
                    const fullPath = prefix ? `${prefix}${boxList[key].delimiter}${key}` : key;
                    result.push(fullPath);
                    if (boxList[key].children) {
                        result = result.concat(flatten(boxList[key].children, fullPath));
                    }
                }
                return result;
            };
            return flatten(boxes);
        } finally {
            connection.end();
        }
    }

    async markAsRead(uid: number, accountName: string, seen: boolean): Promise<void> {
        await this.performOnUid(uid, accountName, 'INBOX', async (connection, seqNo) => {
            if (seen) {
                await connection.addFlags(seqNo, '\\Seen');
            } else {
                await connection.delFlags(seqNo, '\\Seen');
            }
        });
    }

    async addFlags(uid: number, accountName: string, flags: string[]): Promise<void> {
        await this.performOnUid(uid, accountName, 'INBOX', async (connection, seqNo) => {
            await connection.addFlags(seqNo, flags);
        });
    }

    async moveEmail(uid: number, accountName: string, targetFolder: string): Promise<void> {
        await this.performOnUid(uid, accountName, 'INBOX', async (connection, seqNo) => {
            await connection.moveMessage(seqNo, targetFolder);
        });
    }

    async copyEmail(uid: number, accountName: string, targetFolder: string): Promise<void> {
        await this.performOnUid(uid, accountName, 'INBOX', async (connection, seqNo) => {
            if ((connection as any).copyMessage) {
                await (connection as any).copyMessage(seqNo, targetFolder);
            } else {
                await new Promise<void>((resolve, reject) => {
                    (connection as any).imap.copy(seqNo, targetFolder, (err: any) => {
                        if (err) reject(err);
                        else resolve();
                    });
                });
            }
        });
    }

    async moveEmailToSafeFolder(uid: number, accountName: string): Promise<void> {
        return this.moveEmail(uid, accountName, config.email.moveTargetFolder);
    }

    async deleteEmail(uid: number, accountName: string): Promise<void> {
        await this.performOnUid(uid, accountName, 'INBOX', async (connection, seqNo) => {
            await connection.addFlags(seqNo, '\\Deleted');
        });
    }

    async sendEmail(to: string, subject: string, body: string, accountName: string, attachments: any[] = []): Promise<void> {
        const transport = this.smtpTransports.get(accountName);
        if (!transport) throw new Error(`SMTP Transport ${accountName} not found`);
        const acc = config.email.accounts.find(a => a.name === accountName);
        const isHtml = /<[a-z][\s\S]*>/i.test(body);

        await transport.sendMail({
            from: acc?.user,
            to,
            subject,
            [isHtml ? 'html' : 'text']: body,
            attachments
        });
    }

    async sendReply(to: string, subject: string, body: string, accountName: string): Promise<void> {
        return this.sendEmail(to, subject.startsWith('Re:') ? subject : `Re: ${subject}`, body, accountName);
    }

    async forwardEmail(uid: number, accountName: string, to: string, mode: 'inline' | 'rfc822' = 'rfc822'): Promise<void> {
        if (mode === 'rfc822') {
            const raw = await this.getRawEmail(uid, accountName);
            await this.sendEmail(to, `Fwd: Message ${uid}`, "Forwarded message attached.", accountName, [
                {
                    filename: 'original-message.eml',
                    content: raw,
                    contentType: 'message/rfc822'
                }
            ]);
        } else {
            const content = await this.getEmailContentV2(uid, accountName, 'html');
            const originalBody = content.html || content.text;
            const newBody = `<p>---------- Forwarded message ---------</p>${originalBody}`;
            await this.sendEmail(to, `Fwd: ${content.subject}`, newBody, accountName);
        }
    }
}
