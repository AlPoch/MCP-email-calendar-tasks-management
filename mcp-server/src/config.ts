import dotenv from 'dotenv';
import path from 'path';

import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from .env file
dotenv.config({ path: path.resolve(__dirname, '../.env') });

export const config = {
    port: process.env.PORT || 3000,
    gmx: {
        user: process.env.GMX_USER || '',
        password: process.env.GMX_PASSWORD || '',
        imapHost: process.env.GMX_IMAP_HOST || 'imap.gmx.net',
        imapPort: parseInt(process.env.GMX_IMAP_PORT || '993'),
        smtpHost: process.env.GMX_SMTP_HOST || 'mail.gmx.net',
        smtpPort: parseInt(process.env.GMX_SMTP_PORT || '587'),
        moveTargetFolder: process.env.GMX_MOVE_TARGET_FOLDER || 'GPTAussortiert',
    },
    google: {
        clientId: process.env.GOOGLE_CLIENT_ID || '',
        clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
        redirectUri: process.env.GOOGLE_REDIRECT_URI || '',
        refreshToken: process.env.GOOGLE_REFRESH_TOKEN || '',
    }
};
