import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { CalendarService } from '../services/calendar.js';

export function registerCalendarToolsV2(server: McpServer, calendarService: CalendarService) {
    server.tool(
        'calendar_list_v2',
        {
            calendarId: z.string().optional().describe('Calendar ID (default: primary)'),
            timeMin: z.string().optional().describe('ISO Start time'),
            timeMax: z.string().optional().describe('ISO End time'),
            pageToken: z.string().optional().describe('Pagination token'),
            maxResults: z.number().optional().describe('Max results (default: 250)'),
            showDeleted: z.boolean().optional().describe('Show deleted events')
        },
        async (args) => {
            try {
                const result = await calendarService.listEventsV2(
                    args.calendarId,
                    args.timeMin,
                    args.timeMax,
                    args.pageToken,
                    args.maxResults,
                    args.showDeleted
                );
                return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
            } catch (err: any) {
                return { isError: true, content: [{ type: 'text', text: `Error: ${err.message}` }] };
            }
        }
    );

    server.tool(
        'calendar_get_event',
        {
            calendarId: z.string(),
            eventId: z.string()
        },
        async ({ calendarId, eventId }) => {
            try {
                const event = await calendarService.getEvent(calendarId, eventId);
                return { content: [{ type: 'text', text: JSON.stringify(event, null, 2) }] };
            } catch (err: any) {
                return { isError: true, content: [{ type: 'text', text: `Error: ${err.message}` }] };
            }
        }
    );

    server.tool(
        'calendar_freebusy',
        {
            timeMin: z.string(),
            timeMax: z.string(),
            calendarIds: z.array(z.string())
        },
        async ({ timeMin, timeMax, calendarIds }) => {
            try {
                const result = await calendarService.getFreeBusy(timeMin, timeMax, calendarIds);
                return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
            } catch (err: any) {
                return { isError: true, content: [{ type: 'text', text: `Error: ${err.message}` }] };
            }
        }
    );

    server.tool(
        'calendar_create_v2',
        {
            summary: z.string(),
            startTime: z.string(),
            endTime: z.string(),
            description: z.string().optional(),
            attendees: z.array(z.string()).optional(),
            location: z.string().optional(),
            sendUpdates: z.enum(['all', 'none', 'externalOnly']).optional()
        },
        async ({ summary, startTime, endTime, description, attendees, location, sendUpdates }) => {
            try {
                const event = await calendarService.createEvent(summary, startTime, endTime, description, attendees, [], location, [], sendUpdates);
                return { content: [{ type: 'text', text: `Created event: ${event.htmlLink}` }] };
            } catch (err: any) {
                return { isError: true, content: [{ type: 'text', text: `Error: ${err.message}` }] };
            }
        }
    );

    server.tool(
        'calendar_update_v2',
        {
            eventId: z.string(),
            calendarId: z.string().optional(),
            summary: z.string().optional(),
            description: z.string().optional(),
            startTime: z.string().optional(),
            endTime: z.string().optional(),
            attendees: z.array(z.string()).optional(),
            location: z.string().optional(),
            sendUpdates: z.enum(['all', 'none', 'externalOnly']).optional()
        },
        async ({ eventId, calendarId, summary, description, startTime, endTime, attendees, location, sendUpdates }) => {
            try {
                const event = await calendarService.updateEvent(eventId, {
                    summary, description, start: startTime, end: endTime, attendees, location, sendUpdates
                }, calendarId);
                return { content: [{ type: 'text', text: `Updated event: ${event.htmlLink}` }] };
            } catch (err: any) {
                return { isError: true, content: [{ type: 'text', text: `Error: ${err.message}` }] };
            }
        }
    );

    server.tool(
        'calendar_delete_v2',
        {
            eventId: z.string(),
            calendarId: z.string().optional(),
            sendUpdates: z.enum(['all', 'none', 'externalOnly']).optional()
        },
        async ({ eventId, calendarId, sendUpdates }) => {
            try {
                await calendarService.deleteEvent(eventId, calendarId, sendUpdates);
                return { content: [{ type: 'text', text: `Deleted event ${eventId}` }] };
            } catch (err: any) {
                return { isError: true, content: [{ type: 'text', text: `Error: ${err.message}` }] };
            }
        }
    );
}
