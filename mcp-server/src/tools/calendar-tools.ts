import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { CalendarService } from '../services/calendar.js';

export function registerCalendarTools(server: McpServer, calendarService: CalendarService) {
    server.tool(
        'calendar_list',
        {
            timeMin: z.string().optional().describe('Start time in ISO format (default: now)'),
            timeMax: z.string().optional().describe('End time in ISO format (default: 7 days from now)'),
        },
        async ({ timeMin, timeMax }: { timeMin?: string; timeMax?: string }) => {
            try {
                const events = await calendarService.listEvents(timeMin, timeMax);
                // Simplify output
                const simplified = events.map(e => ({
                    id: e.id,
                    summary: e.summary,
                    start: e.start?.dateTime || e.start?.date,
                    end: e.end?.dateTime || e.end?.date,
                    status: e.status
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
        'calendar_create',
        {
            summary: z.string().describe('Event title'),
            startTime: z.string().describe('Start time in ISO format'),
            endTime: z.string().describe('End time in ISO format'),
            description: z.string().optional().describe('Event description'),
        },
        async ({ summary, startTime, endTime, description }: { summary: string; startTime: string; endTime: string; description?: string }) => {
            try {
                const event = await calendarService.createEvent(summary, startTime, endTime, description);
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
            startTime: z.string().optional(),
            endTime: z.string().optional(),
        },
        async ({ eventId, summary, description, startTime, endTime }: { eventId: string; summary?: string; description?: string; startTime?: string; endTime?: string }) => {
            try {
                const event = await calendarService.updateEvent(eventId, { summary, description, start: startTime, end: endTime });
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
