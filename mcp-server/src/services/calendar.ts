import { google, calendar_v3 } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';
import { config } from '../config.js';

export class CalendarService {
    private calendar: calendar_v3.Calendar;
    private auth: OAuth2Client;

    constructor() {
        this.auth = new google.auth.OAuth2(
            config.google.clientId,
            config.google.clientSecret,
            config.google.redirectUri
        );

        if (config.google.refreshToken) {
            this.auth.setCredentials({
                refresh_token: config.google.refreshToken
            });
        }

        // Note: In a real app, we would load saved tokens here.
        // For this implementation, we assume tokens are passed via env or user interaction flows.
        // For now, let's allow setting credentials manually if needed, or rely on ADC if configured.

        this.calendar = google.calendar({ version: 'v3', auth: this.auth });
    }

    // Helper to set credentials content dynamically if needed
    setCredentials(tokens: any) {
        this.auth.setCredentials(tokens);
    }

    async listCalendars(): Promise<calendar_v3.Schema$CalendarListEntry[]> {
        const res = await this.calendar.calendarList.list();
        return res.data.items || [];
    }

    async listEvents(timeMin?: string, timeMax?: string, calendarId: string = 'primary'): Promise<calendar_v3.Schema$Event[]> {
        // Default to next 7 days if no range provided
        const min = timeMin || new Date().toISOString();
        const max = timeMax || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

        const res = await this.calendar.events.list({
            calendarId,
            timeMin: min,
            timeMax: max,
            singleEvents: true,
            orderBy: 'startTime',
        });

        return res.data.items || [];
    }

    async createEvent(
        summary: string,
        startTime: string,
        endTime: string,
        description?: string,
        attendees?: string[],
        reminders?: number[],
        location?: string
    ): Promise<calendar_v3.Schema$Event> {
        const event: calendar_v3.Schema$Event = {
            summary,
            description,
            location,
            start: { dateTime: startTime },
            end: { dateTime: endTime },
        };

        if (attendees && attendees.length > 0) {
            event.attendees = attendees.map(email => ({ email }));
        }

        if (reminders && reminders.length > 0) {
            event.reminders = {
                useDefault: false,
                overrides: reminders.map(minutes => ({ method: 'popup', minutes }))
            };
        }

        const res = await this.calendar.events.insert({
            calendarId: 'primary',
            requestBody: event,
            sendUpdates: 'all', // Send invitations to attendees
        });

        return res.data;
    }

    async updateEvent(eventId: string, updates: {
        summary?: string,
        description?: string,
        location?: string,
        start?: string,
        end?: string,
        attendees?: string[],
        reminders?: number[]
    }, calendarId: string = 'primary'): Promise<calendar_v3.Schema$Event> {
        const patchBody: any = {};
        if (updates.summary) patchBody.summary = updates.summary;
        if (updates.description) patchBody.description = updates.description;
        if (updates.location) patchBody.location = updates.location;
        if (updates.start) patchBody.start = { dateTime: updates.start };
        if (updates.end) patchBody.end = { dateTime: updates.end };

        if (updates.attendees) {
            patchBody.attendees = updates.attendees.map(email => ({ email }));
        }

        if (updates.reminders) {
            patchBody.reminders = {
                useDefault: false,
                overrides: updates.reminders.map(minutes => ({ method: 'popup', minutes }))
            };
        }

        const res = await this.calendar.events.patch({
            calendarId,
            eventId: eventId,
            requestBody: patchBody,
            sendUpdates: 'all',
        });

        return res.data;
    }

    async deleteEvent(eventId: string, calendarId: string = 'primary'): Promise<void> {
        await this.calendar.events.delete({
            calendarId,
            eventId: eventId,
            sendUpdates: 'all',
        });
    }
}
