/**
 * DIESES SKRIPT DIENT DEM EINFACHEN TEST DES KALENDER-SERVICES.
 * Es versucht, ein Test-Ereignis ('Test Meeting via MCP') in 2 Stunden zu planen.
 * ERWARTETE REAKTION: Erfolgsmeldung mit dem Link zum Ereignis oder Fehlermeldung (z.B. Authentifizierung erforderlich).
 */
import { CalendarService } from '../services/calendar.js';

async function main() {
    console.log('--- Testing Calendar Service ---');
    const service = new CalendarService();

    // Calculate time: 2 hours from now
    const now = new Date();
    const startTime = new Date(now.getTime() + 2 * 60 * 60 * 1000); // +2h
    const endTime = new Date(startTime.getTime() + 1 * 60 * 60 * 1000);   // +1h duration

    console.log(`Scheduling event for: ${startTime.toISOString()}`);

    try {
        const event = await service.createEvent(
            'Test Meeting via MCP',
            startTime.toISOString(),
            endTime.toISOString(),
            'This event was created automatically by the verification script.'
        );

        console.log('Event created successfully!');
        console.log(`Link: ${event.htmlLink}`);
        console.log(`ID: ${event.id}`);

    } catch (error) {
        console.error('Error creating event:', error);
        console.log('\nNOTE: If this failed with "Login Required" or 401, you need to authenticate.');
        console.log('For a Service Account, ensure GOOGLE_APPLICATION_CREDENTIALS is set.');
        console.log('For OAuth2, valid tokens must be set on the OAuth2Client.');
    }
}

main();
