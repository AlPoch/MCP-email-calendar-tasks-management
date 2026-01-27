import express from 'express';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
import { config } from './config.js';

// Initialize Express app
const app = express();

// Initialize MCP Server
const server = new McpServer({
    name: 'email-calendar-mcp',
    version: '1.0.0',
});

// Create tools
import { EmailService } from './services/email.js';
import { registerEmailTools } from './tools/email-tools.js';

const emailService = new EmailService();
registerEmailTools(server, emailService);

import { CalendarService } from './services/calendar.js';
import { registerCalendarTools } from './tools/calendar-tools.js';

const calendarService = new CalendarService();
registerCalendarTools(server, calendarService);

import { TasksService } from './services/tasks.js';
import { registerTasksTools } from './tools/tasks-tools.js';

const tasksService = new TasksService();
registerTasksTools(server, tasksService);


server.tool(
    'ping',
    {},
    async () => {
        return {
            content: [{ type: 'text', text: 'pong' }],
        };
    }
);

let transport: SSEServerTransport;

// SSE Endpoint
app.get('/sse', async (req, res) => {
    transport = new SSEServerTransport('/message', res);
    await server.connect(transport);
});

// Message Endpoint for POST requests
app.post('/message', async (req, res) => {
    if (!transport) {
        res.sendStatus(400);
        return;
    }
    await transport.handlePostMessage(req, res);
});

// Start the HTTP server
app.listen(config.port, () => {
    console.log(`MCP Server running on http://localhost:${config.port}`);
    console.log(`SSE Endpoint: http://localhost:${config.port}/sse`);
});
