import { CalendarService } from '../services/calendar.js';

async function main() {
    console.log('--- Testing Calendar Service (Verify Event) ---');
    const service = new CalendarService();

    // List events for the next 24 hours
    const now = new Date();
    const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    try {
        const events = await service.listEvents(now.toISOString(), tomorrow.toISOString());

        console.log(`Found ${events.length} events in the next 24 hours.`);

        const testEvent = events.find(e => e.summary === 'MCP Test Event');

        if (testEvent) {
            console.log('\n[SUCCESS] Verified: "MCP Test Event" exists.');
            console.log(`ID: ${testEvent.id}`);
            console.log(`Start: ${testEvent.start?.dateTime}`);
        } else {
            console.log('\n[WARNING] "MCP Test Event" NOT found in the list.');
        }

    } catch (error) {
        console.error('[FAILED] Error listing events:', error);
    }
}

main();
