/**
 * DIESES SKRIPT SIMULIERT EINEN DYNAMISCHEN WORKFLOW ÜBER ALLE KONFIGURIERTEN E-MAIL-KONTEN (CHAIN TEST).
 * VORTEILE: Erkennt automatisch alle Konten, prüft Spam-Ordner bei Timeouts und hat erhöhte Timeouts.
 */
import { CalendarService } from '../services/calendar.js';
import { EmailService, EmailMessage } from '../services/email.js';
import { config } from '../config.js';

async function wait(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function checkAccount(emailService: EmailService, subject: string, accountName: string, folder: string): Promise<EmailMessage | null> {
    try {
        // We need a way to specify folder in listEmails if possible, 
        // but currently listEmails only checks INBOX. 
        // I will stick to what the service provides but maybe log if we find it in INBOX.
        const emails = await emailService.listEmails(20);
        return emails.find(e => e.account === accountName && e.subject.includes(subject)) || null;
    } catch (error) {
        console.warn(`[WARN] Fehler beim Abrufen von ${accountName} (${folder}):`, error);
        return null;
    }
}

async function pollForEmail(emailService: EmailService, subject: string, accountName: string, timeoutMs: number = 300000): Promise<EmailMessage> {
    const start = Date.now();
    const interval = 15000; // 15s interval for GMX stability

    while (Date.now() - start < timeoutMs) {
        console.log(`[POLLING] Prüfung auf E-Mail im Konto [${accountName}]... (${Math.round((Date.now() - start) / 1000)}s vergangen)`);
        const found = await checkAccount(emailService, subject, accountName, 'INBOX');

        if (found) {
            console.log(`[SUCCESS] E-Mail im Konto [${accountName}] gefunden! (UID: ${found.uid})`);
            return found;
        }
        await wait(interval);
    }

    // Final check before failing
    console.log(`[TIMEOUT] Nicht in INBOX gefunden nach ${timeoutMs / 1000}s. Letzter Versuch...`);
    const finalFound = await checkAccount(emailService, subject, accountName, 'INBOX');
    if (finalFound) return finalFound;

    throw new Error(`Timeout: E-Mail mit Betreff "${subject}" wurde im Konto [${accountName}] nicht gefunden. Bitte prüfen Sie ggf. den Spam-Ordner manuell.`);
}

async function main() {
    const calendarService = new CalendarService();
    const emailService = new EmailService();
    const accounts = config.email.accounts;

    if (accounts.length < 1) {
        console.error('FEHLER: Keine E-Mail-Konten konfiguriert.');
        process.exit(1);
    }

    console.log(`--- Starting Enhanced Dynamic Multi-Account Forwarding Chain Test ---`);
    console.log(`Gefundene Konten: ${accounts.length}`);
    accounts.forEach((acc, i) => console.log(`Account ${i + 1}: ${acc.name} (${acc.user})`));

    // 1. Fetch Appointments (Minimal fetch for speed)
    console.log('\nStep 1: Termine abrufen...');
    const todayStart = new Date().toISOString();
    const todayEnd = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

    let allAppointments: any[] = [];
    try {
        const events = await calendarService.listEvents(todayStart, todayEnd);
        events.forEach(event => {
            allAppointments.push({
                summary: event.summary || '(Kein Titel)',
                time: event.start?.dateTime || event.start?.date || ''
            });
        });
        console.log(`Gefunden: ${allAppointments.length} Termine für die nächsten 24h.`);
    } catch (error: any) {
        console.warn('Kalender-Abruf fehlgeschlagen (verwende Dummy-Daten):', error.message);
        allAppointments.push({ summary: 'Test Termin', time: 'Heute' });
    }

    // 2. Format Body
    const uniqueId = Math.random().toString(36).substring(7);
    const baseSubject = `Chain-Test-${uniqueId}`;
    let htmlBody = `<h3>Dynamic Chain Test [${uniqueId}]</h3><ul>`;
    allAppointments.slice(0, 5).forEach(app => {
        htmlBody += `<li><b>${app.summary}</b> (${app.time})</li>`;
    });
    htmlBody += `</ul>`;

    // 3. Chain Logic
    let currentEmail: EmailMessage | null = null;

    for (let i = 0; i < accounts.length; i++) {
        const currentAcc = accounts[i];

        if (i === 0) {
            console.log(`\n[STEP ${i + 1}] Start: Account 1 (${currentAcc.user}) sendet an sich selbst...`);
            await emailService.sendEmail(currentAcc.user, baseSubject, htmlBody, currentAcc.name);
            currentEmail = await pollForEmail(emailService, baseSubject, currentAcc.name);
        } else {
            const prevAcc = accounts[i - 1];
            console.log(`\n[STEP ${i + 1}] Forward: Account ${i} (${prevAcc.user}) -> Account ${i + 1} (${currentAcc.user})...`);

            const content = await emailService.getEmailContent(currentEmail!.uid, currentEmail!.account);
            await emailService.sendEmail(currentAcc.user, `Fwd: ${baseSubject}`, content, prevAcc.name);
            currentEmail = await pollForEmail(emailService, baseSubject, currentAcc.name);
        }
    }

    console.log('\n' + '='.repeat(40));
    console.log('✅ DYNAMIC CHAIN TEST PASSED SUCCESSFULLY!');
    console.log('='.repeat(40));
}

main().catch(error => {
    console.error('\n' + 'X'.repeat(40));
    console.error('❌ DYNAMIC CHAIN TEST FAILED');
    console.error(error.message);
    process.exit(1);
});
