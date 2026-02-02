/**
 * DIESES SKRIPT TESTET DIE INTEGRATION VON GOOGLE TASKS UND STANDORT-BASIERTEN EREIGNISSEN.
 * 1. Erstellung eines Kalender-Ereignisses mit einem spezifischen Standort.
 * 2. Erstellung einer neuen Aufgabe in Google Tasks.
 * 3. Auflistung der aktuellen Aufgaben.
 * ERWARTETE REAKTION: Bestätigung der Event-Erstellung mit Standort, Bestätigung der Task-Erstellung und Liste der Aufgaben.
 */
import { CalendarService } from '../services/calendar.js';
import { TasksService } from '../services/tasks.js';

async function main() {
    console.log('--- Testing Location & Google Tasks ---');

    try {
        const calService = new CalendarService();
        const tasksService = new TasksService();

        // 1. Test Location
        console.log('\n[1] Creating event with location...');
        const now = new Date();
        const start = new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString();
        const end = new Date(now.getTime() + 25 * 60 * 60 * 1000).toISOString();

        const event = await calService.createEvent(
            'Meeting with Location Test',
            start,
            end,
            'Testing location field',
            undefined,
            undefined,
            'Munich, Germany'
        );
        console.log(`Event with location created: ${event.htmlLink}`);
        console.log(`Location: ${event.location}`);

        // 2. Test Tasks
        console.log('\n[2] Listing task lists...');
        const lists = await tasksService.listTaskLists();
        console.log(`Found ${lists.length} task lists.`);

        if (lists.length > 0) {
            console.log('\n[3] Creating a test task...');
            const task = await tasksService.createTask(lists[0].id!, 'Buy milk', 'Don\'t forget the milk!');
            console.log(`Task created: ${task.title} (ID: ${task.id})`);

            console.log('\n[4] Listing tasks...');
            const tasks = await tasksService.listTasks(lists[0].id!);
            console.log(`Found ${tasks.length} tasks in the list.`);
        }

    } catch (error) {
        console.error('Error during test:', error);
    }
}

main();
