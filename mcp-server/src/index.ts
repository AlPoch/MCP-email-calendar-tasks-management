import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
import { config } from './config.js';

// Initialize Express
const app = express();

// --- LOGGING ---
app.use((req, res, next) => {
    const now = new Date().toISOString();
    console.log(`[REQ] ${now} ${req.method} ${req.url}`);
    next();
});

app.use(cors());
app.use(cookieParser()); // Enable cookie parsing
// Selective body parsing is handled at the route level to avoid breaking SSEServerTransport

// --- MCP SERVER ---
const server = new McpServer({
    name: 'email-calendar-tasks-mcp',
    version: '1.0.7',
});

// Import and register all tools
import { EmailService } from './services/email.js';
import { registerEmailTools } from './tools/email-tools.js';
import { CalendarService } from './services/calendar.js';
import { registerCalendarTools } from './tools/calendar-tools.js';
import { TasksService } from './services/tasks.js';
import { registerTasksTools } from './tools/tasks-tools.js';

const emailService = new EmailService();
const calendarService = new CalendarService();
const tasksService = new TasksService();

registerEmailTools(server, emailService, () => transports.size);
registerCalendarTools(server, calendarService);
registerTasksTools(server, tasksService);

// --- SESSION MANAGEMENT ---
const transports = new Map<string, SSEServerTransport>();

const getBaseUrl = (req: express.Request) => {
    const host = req.headers['x-forwarded-host'] || req.headers.host || 'localhost:3000';
    if (host.includes('ngrok')) return `https://${host}`;
    const proto = req.headers['x-forwarded-proto'] || req.protocol;
    return `${proto}://${host}`;
};

// --- ROUTES ---

// Diagnostic
app.get('/', (req, res) => {
    res.json({
        status: 'running',
        mcp: 'active',
        sessions: transports.size,
        time: new Date().toISOString(),
        version: '1.0.7'
    });
});

// SSE Entrance
app.get('/sse', async (req, res) => {
    // FIX: Allow client to specify sessionId (via Query or Headers) to support reconnection/persistence
    const sessionId = (req.query.sessionId as string) ||
        (req.headers['x-mcp-session-id'] as string) ||
        (req.headers['x-session-id'] as string) ||
        Math.random().toString(36).substring(2, 12);
    const baseUrl = getBaseUrl(req);
    const endpoint = `${baseUrl}/message?sessionId=${sessionId}`;

    console.log(`[SSE] Session ${sessionId} starting. Endpoint: ${endpoint}`);

    try {
        const transport = new SSEServerTransport(endpoint, res);
        // Use the transport's generated session ID if available, otherwise use our manual one
        const finalSessionId = (transport as any).sessionId || sessionId;
        console.log(`[SSE] Transport registered with Session ID: ${finalSessionId}`);
        transports.set(finalSessionId, transport);

        res.on('close', () => {
            console.log(`[SSE] Session ${sessionId} closed`);
            transports.delete(finalSessionId);
        });

        await server.connect(transport);

        // REMOVED manual res.write to avoid duplicate 'data:' events (SDK handles it)
        // res.write(`data: ${endpoint}\n\n`);
    } catch (err) {
        console.error(`[SSE] Critical failure in session ${sessionId}:`, err);
        if (!res.headersSent) res.status(500).send('SSE Init Error');
    }
});

// Message Routing
app.post(['/message', '/sse', '/message/:sessionId'], async (req, res) => {
    // 1. Auth Check (Bearer or Query)
    const authHeader = req.headers.authorization;
    const token = authHeader?.split(' ')[1] || req.query.token;

    if (token !== config.serverAuth.staticToken) {
        console.warn(`[AUTH] 401 Unauthorized for ${req.url}`);
        console.log(`[AUTH] Received Token: ${token ? '***' : 'None'} vs Expected: ***`);
        return res.status(401).send('Unauthorized');
    }

    // 2. Transport lookup - SEARCH EVERYWHERE (Robustness++)
    let sessionId = req.params.sessionId ||
        req.query.sessionId as string ||
        req.headers['x-mcp-session-id'] as string ||
        req.headers['mcp-session-id'] as string ||
        req.headers['x-session-id'] as string ||
        req.cookies?.sessionId ||
        req.cookies?.mcp_session_id;

    // Fallback: If only one transport exists, use it (extreme robustness for simple tools)
    if (!sessionId && transports.size === 1) {
        sessionId = Array.from(transports.keys())[0];
        console.log(`[MSG] No sessionId provided, falling back to only active session: ${sessionId}`);
    }

    if (!sessionId) {
        console.warn(`[MSG] 400 Missing Session Identification for ${req.url}`);
        console.log(`[MSG] Params: ${JSON.stringify(req.params)} | Query: ${JSON.stringify(req.query)}`);
        console.log(`[MSG] Headers: ${JSON.stringify(req.headers)}`);
        return res.status(400).send('Missing Session Identification');
    }

    const transport = transports.get(sessionId);
    if (!transport) {
        console.warn(`[MSG] 404 No transport for session ${sessionId} @ ${req.url}`);
        console.log(`[MSG] Available sessions: ${Array.from(transports.keys()).join(', ') || 'None'}`);
        // DEBUG: Log headers/query to help diagnose client mismatch issues
        console.log(`[MSG] Debug - Headers: ${JSON.stringify(req.headers)}`);
        console.log(`[MSG] Debug - Query: ${JSON.stringify(req.query)}`);
        return res.status(404).send('Session Expired or Not Found');
    }

    // 3. Delegation
    try {
        await transport.handlePostMessage(req, res);
    } catch (err) {
        console.error(`[MSG] Error handling message for ${sessionId}:`, err);
        if (!res.headersSent) res.status(500).send('Internal Error');
    }
});

// OAuth Flow
app.get('/authorize', (req, res) => {
    const { redirect_uri, state } = req.query;
    if (!redirect_uri) return res.status(400).send('Missing redirect_uri');
    const url = new URL(redirect_uri as string);
    url.searchParams.append('code', 'active-auth-code');
    if (state) url.searchParams.append('state', state as string);
    res.redirect(url.toString());
});

app.post('/token', express.json(), express.urlencoded({ extended: true }), (req, res) => {
    const { client_id, client_secret } = req.body;
    if (client_id === config.serverAuth.clientId && client_secret === config.serverAuth.clientSecret) {
        res.json({
            access_token: config.serverAuth.staticToken,
            token_type: 'Bearer',
            expires_in: 3600
        });
    } else {
        res.status(401).json({ error: 'invalid_client' });
    }
});

// Metadata Discovery
app.get(['/.well-known/oauth-authorization-server', '/.well-known/openid-configuration'], (req, res) => {
    const baseUrl = getBaseUrl(req);
    res.json({
        issuer: baseUrl,
        authorization_endpoint: `${baseUrl}/authorize`,
        token_endpoint: `${baseUrl}/token`,
        response_types_supported: ['code'],
        grant_types_supported: ['authorization_code'],
        token_endpoint_auth_methods_supported: ['client_secret_post', 'client_secret_basic'],
    });
});

// Process Protection
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error(`[FATAL] CRASH PREVENTION:`, err);
    if (!res.headersSent) res.status(500).send('Fatal System Error');
});

// Final Binding
const port = Number(config.port) || 3000;
app.listen(port, '0.0.0.0', () => {
    console.log(`\n--- MCP SERVER v1.0.7 READY ---`);
    console.log(`Internal: http://0.0.0.0:${port}`);
    console.log(`External: https://unpalsied-shirlene-onward.ngrok-free.dev/sse`);
    console.log(`-------------------------------\n`);
});
