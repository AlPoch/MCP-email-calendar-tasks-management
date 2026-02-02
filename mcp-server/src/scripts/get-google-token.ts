/**
 * DIESES SKRIPT DIENT DER AUTHENTIFIZIERUNG BEI GOOGLE.
 * Es generiert eine URL für die OAuth2-Autorisierung.
 * NACH DER AUSFÜHRUNG: Öffnen Sie die URL im Browser, erlauben Sie den Zugriff.
 * Das Skript gibt einen REFRESH_TOKEN aus, den Sie in die .env Datei kopieren müssen.
 */
import { google } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';
import http from 'http';
import url from 'url';
import { config } from '../config.js';
import destroyer from 'server-destroy';

// Check if credentials are set
if (!config.google.clientId || !config.google.clientSecret) {
    console.error('Error: GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET must be set in .env');
    process.exit(1);
}

const oauth2Client = new google.auth.OAuth2(
    config.google.clientId,
    config.google.clientSecret,
    config.google.redirectUri || 'http://localhost:3000/oauth2callback'
);

const SCOPES = [
    'https://www.googleapis.com/auth/calendar',
    'https://www.googleapis.com/auth/tasks'
];

async function getAccessToken(oAuth2Client: OAuth2Client) {
    return new Promise((resolve, reject) => {
        const authorizeUrl = oAuth2Client.generateAuthUrl({
            access_type: 'offline',
            scope: SCOPES,
        });

        // Open a temp server to accept the callback
        const server = http.createServer(async (req, res) => {
            try {
                if (req.url!.indexOf('/oauth2callback') > -1) {
                    const qs = new url.URL(req.url!, 'http://localhost:3000').searchParams;
                    const code = qs.get('code');
                    res.end('Authentication successful! You can check the terminal now.');
                    server.destroy();

                    const { tokens } = await oAuth2Client.getToken(code!);
                    console.log('\n--- TOKENS GENERATED ---');
                    console.log('Add this REFRESH TOKEN to your .env file as GOOGLE_REFRESH_TOKEN:');
                    console.log(tokens.refresh_token);
                    console.log('\n(Access tokens expire, but the refresh token allows us to get new ones automatically)');
                    resolve(tokens);
                }
            } catch (e) {
                reject(e);
            }
        });

        destroyer(server);

        server.listen(3000, () => {
            console.log(`\nOpen this URL in your browser to authorize:\n${authorizeUrl}`);
            console.log('\nWaiting for callback on port 3000...');
        });
    });
}

getAccessToken(oauth2Client).catch(console.error);
