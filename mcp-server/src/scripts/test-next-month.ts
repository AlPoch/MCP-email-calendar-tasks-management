import { CalendarService } from '../services/calendar.js';

async function main() {
    console.log('--- Calendar Events for Next Month (February 2026) ---');
    const service = new CalendarService();

    // Calculate next month: February 2026
    const start = '2026-02-01T00:00:00Z';
    const end = '2026-02-28T23:59:59Z';

    try {
        const events = await service.listEvents(start, end);

        if (events.length === 0) {
            console.log('No events found for next month.');
        } else {
            console.log(`Found ${events.length} event(s):`);
            events.forEach((event, index) => {
                const startTime = event.start?.dateTime || event.start?.date;
                const endTime = event.end?.dateTime || event.end?.date;
                console.log(`${index + 1}. ${event.summary}`);
                console.log(`   Time: ${startTime} - ${endTime}`);
                if (event.description) console.log(`   Description: ${event.description}`);
                if (event.location) console.log(`   Location: ${event.location}`);
                console.log('---');
            });
        }
    } catch (error) {
        console.error('[FAILED] Error listing events:', error);
    }
}

main();
