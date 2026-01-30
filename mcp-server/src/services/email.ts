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
}

export class EmailService {
    private smtpTransport: nodemailer.Transporter;

    constructor() {
        this.smtpTransport = nodemailer.createTransport({
            host: config.gmx.smtpHost,
            port: config.gmx.smtpPort,
            secure: false, // STARTTLS
            auth: {
                user: config.gmx.user,
                pass: config.gmx.password,
            },
        });
    }

    private async getImapConnection() {
        const connectionConfig = {
            imap: {
                user: config.gmx.user,
                password: config.gmx.password,
                host: config.gmx.imapHost,
                port: config.gmx.imapPort,
                tls: true,
                authTimeout: 3000,
            },
        };
        return await imaps.connect(connectionConfig);
    }

    async listEmails(limit: number = 10, search?: string): Promise<EmailMessage[]> {
        const connection = await this.getImapConnection();
        try {
            await connection.openBox('INBOX');

            // Build search criteria
            let searchCriteria: any[] = ['ALL'];
            if (search) {
                // Search in Subject, From, or Body
                searchCriteria = [['OR', ['SUBJECT', search], ['OR', ['FROM', search], ['BODY', search]]]];
            }

            const fetchOptions = {
                bodies: ['HEADER'],
                markSeen: false,
            };

            // Fetch messages
            const messages = await connection.search(searchCriteria, fetchOptions);

            // Sort by Date (newest first) and take limit
            const sorted = messages.sort((a, b) => {
                const dateA = new Date(a.attributes.date);
                const dateB = new Date(b.attributes.date);
                return dateB.getTime() - dateA.getTime();
            }).slice(0, limit);

            return sorted.map(msg => ({
                id: msg.seqNo,
                uid: msg.attributes.uid,
                subject: msg.parts[0].body.subject ? msg.parts[0].body.subject[0] : '(No Subject)',
                from: msg.parts[0].body.from ? msg.parts[0].body.from[0] : 'Unknown',
                date: msg.attributes.date.toString(),
            }));
        } finally {
            connection.end();
        }
    }

    async getEmailContent(uid: number): Promise<string> {
        const connection = await this.getImapConnection();
        try {
            await connection.openBox('INBOX');
            const searchCriteria = [['UID', uid]];
            const fetchOptions = {
                bodies: [''], // Fetch the entire raw email
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
            console.error('Error parsing email:', error);
            return `Error reading email content: ${error}`;
        } finally {
            connection.end();
        }
    }

    async deleteEmail(uid: number): Promise<void> {
        const connection = await this.getImapConnection();
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

    async sendEmail(to: string, subject: string, body: string): Promise<void> {
        await this.smtpTransport.sendMail({
            from: config.gmx.user,
            to: to,
            subject: subject,
            text: body,
        });
    }

    async sendReply(to: string, subject: string, body: string): Promise<void> {
        await this.smtpTransport.sendMail({
            from: config.gmx.user,
            to: to,
            subject: subject.startsWith('Re:') ? subject : `Re: ${subject}`,
            text: body,
        });
    }

    async listFolders(): Promise<string[]> {
        const connection = await this.getImapConnection();
        try {
            const boxes = await connection.getBoxes();
            // Filter logic: Only allow INBOX, Spam/Junk, and the configured target folder
            const allowed = ['INBOX', 'Spam', 'Junk', 'Gelöscht', 'Trash', config.gmx.moveTargetFolder];

            // Helper to recurse or just list top level? IMAP returns a tree.
            // imap-simple returns an object where keys are folder names.
            // We just map keys.
            const allFolders = Object.keys(boxes);

            return allFolders.filter(f => {
                // Check if allowed (case insensitive or exact?) configuration is usually exact.
                // But INBOX is standard.
                return allowed.some(a => f.toUpperCase().includes(a.toUpperCase()) || f === config.gmx.moveTargetFolder);
            });
        } finally {
            connection.end();
        }
    }

    async moveEmailToSafeFolder(uid: number): Promise<void> {
        const connection = await this.getImapConnection();
        try {
            await connection.openBox('INBOX');
            const target = config.gmx.moveTargetFolder;

            // Move string usually expects the folder path or sequence
            // imap-simple moveMessage takes (uids: string | string[], boxTo: string)
            await connection.moveMessage(String(uid), target);
        } catch (error) {
            throw new Error(`Failed to move email to ${config.gmx.moveTargetFolder}. Ensure the folder exists in your GMX account! Error: ${error}`);
        } finally {
            connection.end();
        }
    }
}
