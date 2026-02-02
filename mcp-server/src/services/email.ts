import imaps from 'imap-simple';
import nodemailer from 'nodemailer';
import { config } from '../config.js';
import { simpleParser } from 'mailparser';

export interface EmailMessage {
    id: number;
    uid: number;
    subject: string;
    from: string;
    date: string;
    account: string; // The account name
}

export class EmailService {
    private smtpTransports: Map<string, nodemailer.Transporter> = new Map();

    constructor() {
        config.email.accounts.forEach(acc => {
            this.smtpTransports.set(acc.name, nodemailer.createTransport({
                host: acc.smtpHost,
                port: acc.smtpPort,
                secure: acc.smtpSecure !== undefined ? acc.smtpSecure : acc.smtpPort === 465, // Use SSL for 465, STARTTLS for others
                auth: {
                    user: acc.user,
                    pass: acc.password,
                },
                tls: {
                    rejectUnauthorized: false // Often needed for GMX/Google in local env
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
                tlsOptions: {
                    rejectUnauthorized: false
                },
                authTimeout: 5000,
            },
        };
        return await imaps.connect(connectionConfig);
    }

    async listEmails(limit: number = 10, search?: string): Promise<EmailMessage[]> {
        const allMessages: EmailMessage[] = [];
        console.log(`[EmailService] Fetching emails from ${config.email.accounts.length} accounts...`);

        // Fetch from all accounts
        const fetchPromises = config.email.accounts.map(async (acc) => {
            try {
                console.log(`[EmailService] Connecting to ${acc.name} (${acc.user})...`);
                const connection = await this.getImapConnection(acc.name);
                try {
                    console.log(`[EmailService] Successfully connected to ${acc.name}. Opening INBOX...`);
                    await connection.openBox('INBOX');

                    let searchCriteria: any[] = ['ALL'];
                    if (search) {
                        searchCriteria = [['OR', ['SUBJECT', search], ['OR', ['FROM', search], ['BODY', search]]]];
                    }

                    const fetchOptions = {
                        bodies: ['HEADER'],
                        markSeen: false,
                    };

                    const messages = await connection.search(searchCriteria, fetchOptions);

                    messages.forEach(msg => {
                        const originalSubject = msg.parts[0].body.subject ? msg.parts[0].body.subject[0] : '(No Subject)';
                        allMessages.push({
                            id: msg.seqNo,
                            uid: msg.attributes.uid,
                            subject: originalSubject,
                            from: msg.parts[0].body.from ? msg.parts[0].body.from[0] : 'Unknown',
                            date: msg.attributes.date.toString(),
                            account: acc.name
                        });
                    });
                } finally {
                    connection.end();
                }
            } catch (err) {
                console.error(`[EmailService] Error listing emails for account ${acc.name}:`, err);
            }
        });

        await Promise.all(fetchPromises);

        // Sort by Date (newest first) and take limit
        return allMessages.sort((a, b) => {
            const dateA = new Date(a.date);
            const dateB = new Date(b.date);
            return dateB.getTime() - dateA.getTime();
        }).slice(0, limit);
    }

    async getEmailContent(uid: number, accountName: string): Promise<string> {
        const connection = await this.getImapConnection(accountName);
        try {
            await connection.openBox('INBOX');
            const searchCriteria = [['UID', uid]];
            const fetchOptions = {
                bodies: [''],
                markSeen: true,
            };

            const messages = await connection.search(searchCriteria, fetchOptions);
            if (messages.length === 0) {
                throw new Error('Email not found');
            }

            const rawSource = messages[0].parts[0].body;
            const parsed = await simpleParser(rawSource);
            return parsed.text || parsed.html || '(No Content)';
        } catch (error) {
            console.error(`Error parsing email from ${accountName}:`, error);
            return `Error reading email content: ${error}`;
        } finally {
            connection.end();
        }
    }

    async deleteEmail(uid: number, accountName: string): Promise<void> {
        const connection = await this.getImapConnection(accountName);
        try {
            await connection.openBox('INBOX');
            const results = await connection.search([['UID', uid]], { bodies: ['HEADER'] });
            if (results.length > 0) {
                await connection.addFlags(results[0].attributes.uid, '\\Deleted');
            }
        } finally {
            connection.end();
        }
    }

    async sendEmail(to: string, subject: string, body: string, accountName: string): Promise<void> {
        const transport = this.smtpTransports.get(accountName);
        if (!transport) throw new Error(`SMTP Transport for account ${accountName} not found`);

        const acc = config.email.accounts.find(a => a.name === accountName);
        const isHtml = /<[a-z][\s\S]*>/i.test(body);

        await transport.sendMail({
            from: acc?.user,
            to: to,
            subject: subject,
            [isHtml ? 'html' : 'text']: body,
        });
    }

    async sendReply(to: string, subject: string, body: string, accountName: string): Promise<void> {
        const transport = this.smtpTransports.get(accountName);
        if (!transport) throw new Error(`SMTP Transport for account ${accountName} not found`);

        const acc = config.email.accounts.find(a => a.name === accountName);
        const isHtml = /<[a-z][\s\S]*>/i.test(body);

        await transport.sendMail({
            from: acc?.user,
            to: to,
            subject: subject.startsWith('Re:') ? subject : `Re: ${subject}`,
            [isHtml ? 'html' : 'text']: body,
        });
    }

    async listFolders(accountName: string): Promise<string[]> {
        const connection = await this.getImapConnection(accountName);
        try {
            const boxes = await connection.getBoxes();
            const allowed = ['INBOX', 'Spam', 'Junk', 'Gelöscht', 'Trash', config.email.moveTargetFolder];
            const allFolders = Object.keys(boxes);

            return allFolders.filter(f => {
                return allowed.some(a => f.toUpperCase().includes(a.toUpperCase()) || f === config.email.moveTargetFolder);
            });
        } finally {
            connection.end();
        }
    }

    async moveEmailToSafeFolder(uid: number, accountName: string): Promise<void> {
        const connection = await this.getImapConnection(accountName);
        try {
            await connection.openBox('INBOX');
            const target = config.email.moveTargetFolder;
            await connection.moveMessage(String(uid), target);
        } catch (error) {
            throw new Error(`Failed to move email to ${config.email.moveTargetFolder} in ${accountName}: ${error}`);
        } finally {
            connection.end();
        }
    }
}
