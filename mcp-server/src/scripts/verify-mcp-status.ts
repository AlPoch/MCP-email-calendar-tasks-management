import { config } from '../config.js';
import { EmailService } from '../services/email.js';

async function main() {
    console.log('--- MCP Server Internal Status Check ---');
    console.log('Accounts loaded:', config.email.accounts.length);
    config.email.accounts.forEach((acc, i) => {
        console.log(`  [${i + 1}] Name: ${acc.name}, User: ${acc.user}, IMAP: ${acc.imapHost}:${acc.imapPort}`);
    });

    const emailService = new EmailService();
    try {
        console.log('\nTesting listEmails(1)...');
        const emails = await emailService.listEmails(1);
        console.log('Result length:', emails.length);
        if (emails.length > 0) {
            console.log('Top email:', JSON.stringify(emails[0], null, 2));
        } else {
            console.warn('WARNING: listEmails returned 0 results.');
        }
    } catch (err) {
        console.error('CRITICAL: listEmails threw error:', err);
    }
}

main();
