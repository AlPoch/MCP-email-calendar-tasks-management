import { CalendarService } from '../services/calendar.js';
import { EmailService } from '../services/email.js';
import { config } from '../config.js';

async function main() {
    const calendarService = new CalendarService();
    const emailService = new EmailService();
    const targetEmail = 'pochivalov@gmx.de';
    const subject = 'Termine für heute';

    console.log(`--- Starting Full Workflow Test ---`);
    console.log(`Target: ${targetEmail}`);

    // 1. Fetch today's appointments (2026-01-31)
    console.log('Step 1: Fetching today\'s appointments...');
    const todayStart = '2026-01-31T00:00:00Z';
    const todayEnd = '2026-01-31T23:59:59Z';

    let appointments;
    try {
        appointments = await calendarService.listEvents(todayStart, todayEnd);
        console.log(`Found ${appointments.length} appointments.`);
    } catch (error) {
        console.error('Failed to fetch appointments:', error);
        return;
    }

    // 2. Format HTML Body
    console.log('Step 2: Formatting email body...');
    let htmlBody = '<h3>Deine Termine für heute:</h3><ul>';
    if (appointments.length === 0) {
        htmlBody += '<li>Keine Termine für heute gefunden.</li>';
    } else {
        appointments.forEach(app => {
            const time = app.start?.dateTime || app.start?.date;
            htmlBody += `<li><b>${app.summary}</b> - ${time}</li>`;
        });
    }
    htmlBody += '</ul>';

    // 3. Send Email
    console.log('Step 3: Sending email...');
    try {
        await emailService.sendEmail(targetEmail, subject, htmlBody);
        console.log('Email sent successfully.');
    } catch (error) {
        console.error('Failed to send email:', error);
        return;
    }

    // 4. Polling for receipt
    console.log('Step 4: Polling for email receipt (every 10s, max 3m)...');
    const startPolling = Date.now();
    const timeout = 3 * 60 * 1000; // 3 minutes
    const interval = 10 * 1000;   // 10 seconds

    let foundEmail = null;
    while (Date.now() - startPolling < timeout) {
        try {
            console.log(`Checking for email... (${Math.round((Date.now() - startPolling) / 1000)}s elapsed)`);
            const emails = await emailService.listEmails(5);
            foundEmail = emails.find(e => e.subject === subject);

            if (foundEmail) {
                console.log('SUCCESS: Email found in inbox!');
                break;
            }
        } catch (error) {
            console.warn('Polling error (will retry):', error);
        }
        await new Promise(resolve => setTimeout(resolve, interval));
    }

    // 5. Report Results
    if (foundEmail) {
        console.log('\n--- Email Content ---');
        try {
            const content = await emailService.getEmailContent(foundEmail.uid);
            console.log('Subject:', foundEmail.subject);
            console.log('From:', foundEmail.from);
            console.log('Content:\n', content);
        } catch (error) {
            console.error('Could not read email content:', error);
        }
    } else {
        console.error('\nERROR: Das E-Mail ist noch nicht angekommen.');
        process.exit(1);
    }
}

main().catch(console.error);
