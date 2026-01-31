import { EmailService, EmailMessage } from '../services/email.js';
import { config } from '../config.js';

async function main() {
    const emailService = new EmailService();

    console.log('--- Testing Multi-Email Listing ---');
    console.log(`Configured accounts: ${config.email.accounts.map(a => a.name).join(', ')}`);

    try {
        const emails = await emailService.listEmails(15);
        console.log(`\nFound ${emails.length} emails across all accounts:`);

        emails.forEach((e: EmailMessage, i: number) => {
            console.log(`${i + 1}. [${e.account}] ${e.subject}`);
            console.log(`   From: ${e.from} | Date: ${e.date}`);
            console.log(`   UID: ${e.uid}`);
            console.log('---');
        });

        if (emails.length > 0) {
            console.log('\n--- Testing Account-aware Content Fetching ---');
            const firstEmail = emails[0];
            console.log(`Fetching content for first email from account: ${firstEmail.account}...`);
            const content = await emailService.getEmailContent(firstEmail.uid, firstEmail.account);
            console.log('Content Preview:', content.substring(0, 100) + '...');
        }

    } catch (error) {
        console.error('Test failed:', error);
    }
}

main().catch(console.error);
