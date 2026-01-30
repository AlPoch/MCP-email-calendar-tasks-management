import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { CalendarService } from '../services/calendar.js';

export function registerCalendarTools(server: McpServer, calendarService: CalendarService) {
    server.tool(
        'calendar_list',
        {
            timeMin: z.string().optional().describe('Start time in ISO format (default: now)'),
            timeMax: z.string().optional().describe('End time in ISO format (default: 7 days from now)'),
            calendarId: z.string().optional().describe('Calendar ID to fetch from (default: primary)'),
        },
        async ({ timeMin, timeMax, calendarId }: { timeMin?: string; timeMax?: string; calendarId?: string }) => {
            try {
                const events = await calendarService.listEvents(timeMin, timeMax, calendarId);
                // Simplify output
                const simplified = events.map(e => ({
                    id: e.id,
                    summary: e.summary,
                    start: e.start?.dateTime || e.start?.date,
                    end: e.end?.dateTime || e.end?.date,
                    status: e.status,
                    attendees: e.attendees?.map(a => a.email)
                }));
                return {
                    content: [{ type: 'text', text: JSON.stringify(simplified, null, 2) }],
                };
            } catch (error) {
                return {
                    content: [{ type: 'text', text: `Error listing events: ${error}` }],
                    isError: true,
                };
            }
        }
    );

    server.tool(
        'calendar_get_list',
        {},
        async () => {
            try {
                const calendars = await calendarService.listCalendars();
                const simplified = calendars.map(c => ({
                    id: c.id,
                    summary: c.summary,
                    description: c.description,
                    accessRole: c.accessRole
                }));
                return {
                    content: [{ type: 'text', text: JSON.stringify(simplified, null, 2) }],
                };
            } catch (error) {
                return {
                    content: [{ type: 'text', text: `Error listing calendars: ${error}` }],
                    isError: true,
                };
            }
        }
    );

    server.tool(
        'calendar_create',
        {
            summary: z.string().describe('Event title'),
            startTime: z.string().describe('Start time in ISO format'),
            endTime: z.string().describe('End time in ISO format'),
            description: z.string().optional().describe('Event description'),
            location: z.string().optional().describe('Event location'),
            attendees: z.array(z.string()).optional().describe('List of email addresses to invite'),
            reminders: z.array(z.number()).optional().describe('Minutes before event for reminders (e.g. [15, 60])'),
            recurrence: z.array(z.string()).optional().describe('Recurrence rules (e.g. ["RRULE:FREQ=DAILY;COUNT=10"])'),
        },
        async ({ summary, startTime, endTime, description, attendees, reminders, location, recurrence }: {
            summary: string;
            startTime: string;
            endTime: string;
            description?: string;
            attendees?: string[];
            reminders?: number[];
            location?: string;
            recurrence?: string[];
        }) => {
            try {
                const event = await calendarService.createEvent(summary, startTime, endTime, description, attendees, reminders, location, recurrence);
                return {
                    content: [{ type: 'text', text: `Event created: ${event.htmlLink}` }],
                };
            } catch (error) {
                return {
                    content: [{ type: 'text', text: `Error creating event: ${error}` }],
                    isError: true,
                };
            }
        }
    );

    server.tool(
        'calendar_update',
        {
            eventId: z.string().describe('ID of the event to update'),
            summary: z.string().optional(),
            description: z.string().optional(),
            location: z.string().optional(),
            startTime: z.string().optional(),
            endTime: z.string().optional(),
            recurrence: z.array(z.string()).optional().describe('Recurrence rules'),
        },
        async ({ eventId, summary, description, location, startTime, endTime, recurrence }: {
            eventId: string;
            summary?: string;
            description?: string;
            location?: string;
            startTime?: string;
            endTime?: string;
            recurrence?: string[];
        }) => {
            try {
                const event = await calendarService.updateEvent(eventId, { summary, description, location, start: startTime, end: endTime, recurrence });
                return {
                    content: [{ type: 'text', text: `Event updated: ${event.htmlLink}` }],
                };
            } catch (error) {
                return {
                    content: [{ type: 'text', text: `Error updating event: ${error}` }],
                    isError: true,
                };
            }
        }
    );

    server.tool(
        'calendar_delete',
        {
            eventId: z.string().describe('ID of the event to delete'),
        },
        async ({ eventId }: { eventId: string }) => {
            try {
                await calendarService.deleteEvent(eventId);
                return {
                    content: [{ type: 'text', text: `Event ${eventId} deleted successfully` }],
                };
            } catch (error) {
                return {
                    content: [{ type: 'text', text: `Error deleting event: ${error}` }],
                    isError: true,
                };
            }
        }
    );
}
