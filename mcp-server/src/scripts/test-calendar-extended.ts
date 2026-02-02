/**
 * DIESES SKRIPT TESTET ERWEITERTE KALENDER-FUNKTIONEN.
 * 1. Auflistung aller verfügbaren Kalender des Benutzers.
 * 2. Erstellung eines Ereignisses mit Teilnehmern und mehreren Erinnerungen (15 und 60 Min vorher).
 * ERWARTETE REAKTION: Liste der Kalender sowie Bestätigung des erstellten Ereignisses inkl. Teilnehmer- und Erinnerungs-Metadaten.
 */
import { CalendarService } from '../services/calendar.js';

async function main() {
    const service = new CalendarService();
    console.log('--- Testing Extended Calendar Features ---');

    try {
        // 1. List all calendars
        console.log('\n[1] Listing calendars...');
        const calendars = await service.listCalendars();
        console.log(`Found ${calendars.length} calendars:`);
        calendars.forEach(c => console.log(` - ${c.summary} (${c.id}) Rolle: ${c.accessRole}`));

        // 2. Create event with attendees and multiple reminders
        console.log('\n[2] Creating extended event...');
        const now = new Date();
        const start = new Date(now.getTime() + 60 * 60 * 1000).toISOString(); // In 1 hour
        const end = new Date(now.getTime() + 2 * 60 * 60 * 1000).toISOString(); // In 2 hours

        const event = await service.createEvent(
            'Test Event with Reminders & Attendees',
            start,
            end,
            'Testing new MCP server features',
            ['example@gmail.com'], // Invite one test attendee
            [15, 60] // Reminders at 15 and 60 minutes before
        );
        console.log(`Event created: ${event.htmlLink}`);
        console.log(`Attendees: ${JSON.stringify(event.attendees)}`);
        console.log(`Reminders: ${JSON.stringify(event.reminders)}`);

    } catch (error) {
        console.error('Error during test:', error);
    }
}

main();
