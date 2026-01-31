import { CalendarService } from '../services/calendar.js';
import { EmailService } from '../services/email.js';
import { config } from '../config.js';

async function main() {
    const calendarService = new CalendarService();
    const emailService = new EmailService();
    const targetEmail = 'pochivalov@gmx.de';
    const subject = 'Termine für diesen Monat';

    console.log(`--- Starting Full Workflow Test (Monthly) ---`);
    console.log(`Target: ${targetEmail}`);

    // 1. Fetch Monthly Date Range (February 2026)
    console.log('Step 1: Setting up monthly date range...');
    const todayStart = '2026-02-01T00:00:00Z';
    const todayEnd = '2026-02-28T23:59:59Z';

    // 2. List All Calendars
    console.log('Step 1: Listing all available calendars...');
    let calendars;
    try {
        calendars = await calendarService.listCalendars();
        console.log(`Found ${calendars.length} calendars.`);
    } catch (error) {
        console.error('Failed to list calendars:', error);
        return;
    }

    // 3. Fetch Appointments from Every Calendar
    console.log('Step 2: Fetching appointments from all calendars...');
    let allAppointments: { summary: string, time: string, calendarName: string, isPrimary: boolean }[] = [];

    for (const cal of calendars) {
        try {
            const calId = cal.id || 'primary';
            const calName = cal.summary || calId;
            const isPrimary = cal.primary || false;

            console.log(`Checking calendar: ${calName} (${calId})...`);
            const events = await calendarService.listEvents(todayStart, todayEnd, calId);

            events.forEach(event => {
                const time = event.start?.dateTime || event.start?.date || '';
                allAppointments.push({
                    summary: event.summary || '(Kein Titel)',
                    time: time,
                    calendarName: calName,
                    isPrimary: isPrimary
                });
            });
        } catch (error) {
            console.warn(`Could not fetch events for calendar ${cal.summary}:`, error);
        }
    }
    console.log(`Total appointments found across all calendars: ${allAppointments.length}`);

    // 4. Format HTML Body
    console.log('Step 3: Formatting email body...');
    let htmlBody = '<h3>Deine Termine für diesen Monat:</h3><ul>';

    if (allAppointments.length === 0) {
        htmlBody += '<li>Keine Termine für diesen Monat gefunden.</li>';
    } else {
        // Sort appointments by time (optional but better)
        allAppointments.sort((a, b) => a.time.localeCompare(b.time));

        allAppointments.forEach(app => {
            const prefix = app.isPrimary ? '' : `(${app.calendarName}): `;
            htmlBody += `<li>${prefix}<b>${app.summary}</b> - ${app.time}</li>`;
        });
    }
    htmlBody += '</ul>';

    // 5. Send Email
    console.log('Step 4: Sending email...');
    try {
        await emailService.sendEmail(targetEmail, subject, htmlBody, config.email.accounts[0].name);
        console.log('Email sent successfully.');
    } catch (error) {
        console.error('Failed to send email:', error);
        return;
    }

    // 6. Polling for receipt
    console.log('Step 5: Polling for email receipt (every 10s, max 3m)...');
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

    // 7. Report Results
    if (foundEmail) {
        console.log('\n--- Email Content (as seen in inbox) ---');
        try {
            const content = await emailService.getEmailContent(foundEmail.uid, foundEmail.account);
            console.log('Subject:', foundEmail.subject);
            console.log('From:', foundEmail.from);
            console.log('Account:', foundEmail.account);
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
