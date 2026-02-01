import dotenv from 'dotenv';
import path from 'path';

import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from .env file
dotenv.config({ path: path.resolve(__dirname, '../.env') });

export interface EmailAccountConfig {
    name: string;
    user: string;
    password: string;
    imapHost: string;
    imapPort: number;
    smtpHost: string;
    smtpPort: number;
    smtpSecure?: boolean;
}

function loadEmailAccounts(): EmailAccountConfig[] {
    const accounts: EmailAccountConfig[] = [];
    let i = 1;

    while (true) {
        const name = process.env[`EMAIL_${i}_NAME`];
        const user = process.env[`EMAIL_${i}_USER`];
        const password = process.env[`EMAIL_${i}_PASSWORD`];

        if (!user) break; // Stop if no more users are found

        accounts.push({
            name: name || `Account_${i}`,
            user: user,
            password: password || '',
            imapHost: process.env[`EMAIL_${i}_IMAP_HOST`] || 'imap.gmx.net',
            imapPort: parseInt(process.env[`EMAIL_${i}_IMAP_PORT`] || '993'),
            smtpHost: process.env[`EMAIL_${i}_SMTP_HOST`] || 'mail.gmx.net',
            smtpPort: parseInt(process.env[`EMAIL_${i}_SMTP_PORT`] || '587'),
            smtpSecure: process.env[`EMAIL_${i}_SMTP_SECURE`] === 'true'
        });
        i++;
    }

    return accounts;
}

export const config = {
    port: process.env.PORT || 3000,
    email: {
        accounts: loadEmailAccounts(),
        moveTargetFolder: process.env.EMAIL_UNEMPOTANT_ORDER || 'GPTAussortiert',
    },
    google: {
        clientId: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        redirectUri: process.env.GOOGLE_REDIRECT_URI,
        refreshToken: process.env.GOOGLE_REFRESH_TOKEN,
    },
    serverAuth: {
        clientId: process.env.MCP_CLIENT_ID || 'mcp-client',
        clientSecret: process.env.MCP_CLIENT_SECRET || 'mcp-secret',
        staticToken: process.env.MCP_STATIC_TOKEN || 'mcp-static-token-123',
    }
};
