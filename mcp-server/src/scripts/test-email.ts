import { EmailService } from '../services/email.js';

async function main() {
    console.log('--- Testing Email Service (Fetch Last Email) ---');
    const service = new EmailService();

    try {
        // List 1 email
        const emails = await service.listEmails(1);

        if (emails.length === 0) {
            console.log('Result: No emails found in INBOX.');
            return;
        }

        const lastEmail = emails[0];
        console.log(`\n[SUCCESS] Found latest email:`);
        console.log(`UID: ${lastEmail.uid}`);
        console.log(`Date: ${lastEmail.date}`);
        console.log(`From: ${lastEmail.from}`);
        console.log(`Subject: ${lastEmail.subject}`);

        console.log('\n--- Fetching Full Content ---');
        const content = await service.getEmailContent(lastEmail.uid, lastEmail.account);
        console.log('Content Snippet (first 200 chars):');
        console.log(content.substring(0, 200) + (content.length > 200 ? '...' : ''));

    } catch (error) {
        console.error('[FAILED] Error testing email service:', error);
    }
}

main();
