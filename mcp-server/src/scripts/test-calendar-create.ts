/**
 * DIESES SKRIPT TESTET DAS ERSTELLEN EINES EINFACHEN KALENDER-EREIGNISSES.
 * Es erstellt ein Ereignis in 2 Stunden für eine Dauer von 1 Stunde.
 * ERWARTETE REAKTION: Eine Bestätigung mit der Event-ID und einem HTML-Link zum Google Kalender.
 */
import { CalendarService } from '../services/calendar.js';

async function main() {
    console.log('--- Testing Calendar Service (Create Event) ---');
    const service = new CalendarService();

    // 2 hours from now
    const now = new Date();
    const startTime = new Date(now.getTime() + 2 * 60 * 60 * 1000);
    const endTime = new Date(startTime.getTime() + 60 * 60 * 1000);

    console.log(`Attempting to create event at: ${startTime.toISOString()}`);

    try {
        const event = await service.createEvent(
            'MCP Test Event',
            startTime.toISOString(),
            endTime.toISOString(),
            'Created by automated test script'
        );

        console.log('[SUCCESS] Event created!');
        console.log(`ID: ${event.id}`);
        console.log(`Link: ${event.htmlLink}`);

    } catch (error) {
        console.error('[FAILED] Error creating event:', error);
    }
}

main();
