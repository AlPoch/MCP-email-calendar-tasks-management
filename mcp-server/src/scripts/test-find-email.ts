import { EmailService } from '../services/email.js';

async function main() {
    console.log('--- Finding Email from HNOmedic ---');
    const service = new EmailService();

    try {
        // IMAP search criteria: https://github.com/mscdex/node-imap#connection-search
        // Filter by header 'FROM' containing 'HNOmedic' (case insensitive mostly)
        // Note: IMAP search is usually case-insensitive for headers
        console.log('Searching INBOX...');
        const emails = await service.listEmails(5, 'HNOmedic'); // Search for string

        if (emails.length === 0) {
            console.log('No emails found from "HNOmedic".');
            return;
        }

        const email = emails[0]; // Take the newest one
        console.log(`\n[FOUND]`);
        console.log(`From: ${email.from}`);
        console.log(`Subject: ${email.subject}`);
        console.log(`Date: ${email.date}`);
        console.log(`UID: ${email.uid}`);

        console.log('\n--- Content ---');
        const content = await service.getEmailContent(email.uid);
        console.log(content);
        console.log('--- End of Content ---');

    } catch (error) {
        console.error('Error:', error);
    }
}

main();
