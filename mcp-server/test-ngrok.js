import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '.env') });

// Configuration
// Use the NGROK URL from the logs or override via env var
const NGROK_URL = process.env.NGROK_URL || 'https://unpalsied-shirlene-onward.ngrok-free.dev';
// Static token as defined in the server config
const AUTH_TOKEN = process.env.MCP_STATIC_TOKEN || 'mcp-static-token-123';

console.log(`\n=== MCP NGROK CONNECTION TEST (Fixed) ===`);
console.log(`Target: ${NGROK_URL}`);
console.log(`Token:  ${AUTH_TOKEN ? '***' : 'MISSING'}`);

async function runTest() {
    let controller;
    let endpoint = '';
    let sessionId = '';

    // 1. Establish SSE Connection
    try {
        console.log(`\n[1/6] Connecting to SSE Stream...`);
        controller = new AbortController();
        const res = await fetch(`${NGROK_URL}/sse`, {
            headers: {
                'Accept': 'text/event-stream',
            },
            signal: controller.signal
        });

        if (!res.ok) throw new Error(`SSE Connection Failed: ${res.status} ${res.statusText}`);

        // Read the stream strictly to get the 'endpoint' event
        const reader = res.body.getReader();
        const decoder = new TextDecoder();

        console.log(`Waiting for endpoint event...`);
        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            const chunk = decoder.decode(value, { stream: true });

            // Simple parsing for 'data: ...'
            const lines = chunk.split('\n');
            for (const line of lines) {
                if (line.startsWith('data: ')) {
                    const data = line.substring(6).trim();
                    // The SDK might return a relative path or absolute URL
                    // We need to handle both.
                    console.log(`Received Data: ${data}`);

                    if (data.startsWith('http')) {
                        endpoint = data;
                    } else if (data.startsWith('/')) {
                        endpoint = `${NGROK_URL}${data}`;
                    } else {
                        continue; // skip unknown data
                    }

                    console.log(`Resolved Endpoint: ${endpoint}`);
                    const url = new URL(endpoint);
                    sessionId = url.searchParams.get('sessionId');
                    console.log(`Session ID: ${sessionId}`);
                    break;
                }
            }
            if (endpoint) break;
        }
    } catch (err) {
        console.error(`ERROR Connecting:`, err.message);
        process.exit(1);
    }

    if (!endpoint) {
        console.error(`Failed to obtain endpoint from SSE stream.`);
        process.exit(1);
    }

    // Helper for POST requests
    async function sendRequest(payload) {
        const res = await fetch(endpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${AUTH_TOKEN}`
            },
            body: JSON.stringify(payload)
        });

        if (!res.ok) {
            const text = await res.text();
            throw new Error(`HTTP ${res.status}: ${text}`);
        }

        // Handle "Accepted" or empty bodies vs JSON
        const text = await res.text();
        if (text === 'Accepted') return { result: 'Accepted' };
        try {
            return JSON.parse(text);
        } catch (e) {
            return { raw: text };
        }
    }

    // 2. Initialize
    console.log(`\n[2/6] Sending Initialize Request...`);
    try {
        const initPayload = {
            jsonrpc: "2.0",
            id: 1,
            method: "initialize",
            params: {
                protocolVersion: "2024-11-05",
                capabilities: {},
                clientInfo: { name: "test-script", version: "1.0.0" }
            }
        };
        const initRes = await sendRequest(initPayload);
        console.log(`Initialize Response:`, JSON.stringify(initRes, null, 2));

        // Send 'notifications/initialized'
        console.log(`Sending initialized notification...`);
        await sendRequest({
            jsonrpc: "2.0",
            method: "notifications/initialized",
            params: {}
        });

    } catch (err) {
        console.error(`ERROR Initializing:`, err.message);
        process.exit(1);
    }

    // Helper for Tools
    async function callTool(name, args = {}) {
        console.log(`\n[...] Calling tool: ${name}...`);
        try {
            const payload = {
                jsonrpc: "2.0",
                id: Math.floor(Math.random() * 1000) + 10,
                method: "tools/call",
                params: {
                    name: name,
                    arguments: args
                }
            };

            const json = await sendRequest(payload);

            if (json.error) {
                throw new Error(`MCP Error: ${JSON.stringify(json.error)}`);
            }
            return json.result;
        } catch (err) {
            console.error(`FAILED to call ${name}:`, err.message);
            return null;
        }
    }

    // 3. Emails
    console.log(`\n[3/6] Fetching Emails (Limit 100, Filtering for Today)...`);
    const emailsResult = await callTool('email_list', { limit: 100 });
    if (emailsResult) {
        try {
            const emails = JSON.parse(emailsResult.content[0].text);
            const today = new Date().toISOString().split('T')[0];
            const todaysEmails = emails.filter(e => {
                if (!e.date) return false;
                const eDate = new Date(e.date).toISOString().split('T')[0];
                return eDate === today;
            });

            console.log(`\n>>> EMAILS FROM TODAY (${today}) [Count: ${todaysEmails.length}/${emails.length}] <<<`);
            if (todaysEmails.length > 0) {
                console.log(JSON.stringify(todaysEmails, null, 2));
            } else {
                console.log("No emails found for today.");
            }
        } catch (e) {
            console.error("Error parsing email response");
        }
    }

    // 4. Appointments
    console.log(`\n[4/6] Fetching Appointments (Next 7 Days)...`);
    const now = new Date();
    const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    const calendarResult = await callTool('calendar_list', {
        timeMin: now.toISOString(),
        timeMax: nextWeek.toISOString()
    });

    if (calendarResult) {
        try {
            const events = JSON.parse(calendarResult.content[0].text);
            console.log(`\n>>> APPOINTMENTS (${now.toISOString().split('T')[0]} to ${nextWeek.toISOString().split('T')[0]}) <<<`);
            console.log(JSON.stringify(events, null, 2));
        } catch (e) {
            console.error("Error parsing calendar response");
        }
    }

    // 5. Tasks
    console.log(`\n[5/6] Fetching All Tasks...`);
    const tasksResult = await callTool('tasks_list', {});
    if (tasksResult) {
        try {
            const tasks = JSON.parse(tasksResult.content[0].text);
            console.log(`\n>>> ALL TASKS [Count: ${tasks.length}] <<<`);
            console.log(JSON.stringify(tasks, null, 2));
        } catch (e) {
            console.error("Error parsing tasks response");
        }
    }

    // 6. Cleanup
    console.log(`\n[6/6] Test Complete.`);
    controller.abort();
    process.exit(0);
}

runTest();
