import dotenv from 'dotenv';
import path from 'path';

import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from .env file
dotenv.config({ path: path.resolve(__dirname, '../.env') });

export const config = {
    port: process.env.PORT || 3000,
    email: {
        accounts: [
            {
                name: process.env.GMX_1_NAME || 'GMX_Haupt',
                user: process.env.GMX_USER || '',
                password: process.env.GMX_PASSWORD || '',
                imapHost: 'imap.gmx.net',
                imapPort: 993,
                smtpHost: 'mail.gmx.net',
                smtpPort: 587,
            },
            {
                name: process.env.GMX_2_NAME || 'GMX_Privat',
                user: process.env.GMX_2_USER || '',
                password: process.env.GMX_2_PASSWORD || '',
                imapHost: 'imap.gmx.net',
                imapPort: 993,
                smtpHost: 'mail.gmx.net',
                smtpPort: 587,
            },
            {
                name: process.env.GOOGLE_EMAIL_NAME || 'Google_Work',
                user: process.env.GOOGLE_EMAIL_USER || '',
                password: process.env.GOOGLE_EMAIL_PASSWORD || '',
                imapHost: 'imap.gmail.com',
                imapPort: 993,
                smtpHost: 'smtp.gmail.com',
                smtpPort: 465, // Gmail SMTP usually 465 or 587
            }
        ],
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
