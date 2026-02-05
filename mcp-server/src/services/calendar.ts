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
        this.calendar = google.calendar({ version: 'v3', auth: this.auth });
    }

    async listCalendars(): Promise<calendar_v3.Schema$CalendarListEntry[]> {
        const res = await this.calendar.calendarList.list();
        return res.data.items || [];
    }

    // V2 List with Pagination
    async listEventsV2(
        calendarId: string = 'primary',
        timeMin?: string,
        timeMax?: string,
        pageToken?: string,
        maxResults: number = 250,
        showDeleted: boolean = false
    ): Promise<{ events: calendar_v3.Schema$Event[], nextPageToken?: string }> {

        const min = timeMin || new Date().toISOString();
        const max = timeMax || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

        const res = await this.calendar.events.list({
            calendarId,
            timeMin: min,
            timeMax: max,
            singleEvents: true,
            orderBy: 'startTime',
            pageToken,
            maxResults,
            showDeleted
        });

        return {
            events: res.data.items || [],
            nextPageToken: res.data.nextPageToken || undefined
        };
    }

    // Backward compat V1
    async listEvents(timeMin?: string, timeMax?: string, calendarId: string = 'primary'): Promise<calendar_v3.Schema$Event[]> {
        const res = await this.listEventsV2(calendarId, timeMin, timeMax);
        return res.events;
    }

    async getEvent(calendarId: string, eventId: string): Promise<calendar_v3.Schema$Event> {
        const res = await this.calendar.events.get({
            calendarId,
            eventId
        });
        return res.data;
    }

    async getFreeBusy(timeMin: string, timeMax: string, calendarIds: string[]): Promise<calendar_v3.Schema$FreeBusyCalendar> {
        const res = await this.calendar.freebusy.query({
            requestBody: {
                timeMin,
                timeMax,
                items: calendarIds.map(id => ({ id }))
            }
        });
        // Returns generic map of calendarId -> busy[]
        return res.data.calendars || {};
    }

    async createEvent(
        summary: string,
        startTime: string,
        endTime: string,
        description?: string,
        attendees?: string[],
        reminders?: number[],
        location?: string,
        recurrence?: string[],
        sendUpdates: 'all' | 'none' | 'externalOnly' = 'all'
    ): Promise<calendar_v3.Schema$Event> {
        const event: calendar_v3.Schema$Event = {
            summary,
            description,
            location,
            start: { dateTime: startTime },
            end: { dateTime: endTime },
            recurrence: recurrence,
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
            sendUpdates: sendUpdates,
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
        reminders?: number[],
        recurrence?: string[],
        sendUpdates?: 'all' | 'none' | 'externalOnly'
    }, calendarId: string = 'primary'): Promise<calendar_v3.Schema$Event> {
        const patchBody: any = {};
        if (updates.summary) patchBody.summary = updates.summary;
        if (updates.description) patchBody.description = updates.description;
        if (updates.location) patchBody.location = updates.location;
        if (updates.start) patchBody.start = { dateTime: updates.start };
        if (updates.end) patchBody.end = { dateTime: updates.end };
        if (updates.recurrence) patchBody.recurrence = updates.recurrence;

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
            sendUpdates: updates.sendUpdates || 'all',
        });

        return res.data;
    }

    async deleteEvent(eventId: string, calendarId: string = 'primary', sendUpdates: 'all' | 'none' | 'externalOnly' = 'all'): Promise<void> {
        await this.calendar.events.delete({
            calendarId,
            eventId: eventId,
            sendUpdates: sendUpdates,
        });
    }

    async listAllEvents(timeMin?: string, timeMax?: string): Promise<{ event: calendar_v3.Schema$Event, calendarName: string, isPrimary: boolean }[]> {
        const calendars = await this.listCalendars();
        const allEvents: { event: calendar_v3.Schema$Event, calendarName: string, isPrimary: boolean }[] = [];

        for (const cal of calendars) {
            try {
                const calId = cal.id || 'primary';
                const events = await this.listEvents(timeMin, timeMax, calId);
                events.forEach(e => {
                    allEvents.push({
                        event: e,
                        calendarName: cal.summary || calId,
                        isPrimary: cal.primary || false
                    });
                });
            } catch (err) {
                console.warn(`Could not list events for calendar ${cal.summary}:`, err);
            }
        }
        return allEvents;
    }
}
