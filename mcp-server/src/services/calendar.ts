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

    async listEvents(timeMin?: string, timeMax?: string): Promise<calendar_v3.Schema$Event[]> {
        // Default to next 7 days if no range provided
        const min = timeMin || new Date().toISOString();
        const max = timeMax || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

        const res = await this.calendar.events.list({
            calendarId: 'primary',
            timeMin: min,
            timeMax: max,
            singleEvents: true,
            orderBy: 'startTime',
        });

        return res.data.items || [];
    }

    async createEvent(summary: string, startTime: string, endTime: string, description?: string): Promise<calendar_v3.Schema$Event> {
        const event = {
            summary,
            description,
            start: { dateTime: startTime },
            end: { dateTime: endTime },
        };

        const res = await this.calendar.events.insert({
            calendarId: 'primary',
            requestBody: event,
        });

        return res.data;
    }

    async updateEvent(eventId: string, updates: { summary?: string, description?: string, start?: string, end?: string }): Promise<calendar_v3.Schema$Event> {
        // First get the event to merge? Or just patch
        // patch is better for partial updates
        const patchBody: any = {};
        if (updates.summary) patchBody.summary = updates.summary;
        if (updates.description) patchBody.description = updates.description;
        if (updates.start) patchBody.start = { dateTime: updates.start };
        if (updates.end) patchBody.end = { dateTime: updates.end };

        const res = await this.calendar.events.patch({
            calendarId: 'primary',
            eventId: eventId,
            requestBody: patchBody,
        });

        return res.data;
    }

    async deleteEvent(eventId: string): Promise<void> {
        await this.calendar.events.delete({
            calendarId: 'primary',
            eventId: eventId,
        });
    }
}
