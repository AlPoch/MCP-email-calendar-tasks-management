import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '.env') });

const NGROK_URL = process.env.NGROK_URL || 'https://unpalsied-shirlene-onward.ngrok-free.dev';
const AUTH_TOKEN = process.env.MCP_STATIC_TOKEN || 'mcp-static-token-123';

console.log(`\n=== MCP V2 INTEGRATION TEST ===`);

async function runTest() {
    let controller;
    let endpoint = '';

    // 1. Establish SSE Connection (Simplified, reused from previous test logic)
    try {
        console.log(`\n[1/7] Connecting...`);
        controller = new AbortController();
        const res = await fetch(`${NGROK_URL}/sse`, {
            headers: { 'Accept': 'text/event-stream' },
            signal: controller.signal
        });
        if (!res.ok) throw new Error(`SSE Failed: ${res.status}`);
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            const chunk = decoder.decode(value, { stream: true });
            const lines = chunk.split('\n');
            for (const line of lines) {
                if (line.startsWith('data: ') && line.length > 6) {
                    const data = line.substring(6).trim();
                    if (data.startsWith('http')) endpoint = data;
                    else if (data.startsWith('/')) endpoint = `${NGROK_URL}${data}`;
                    if (endpoint) break;
                }
            }
            if (endpoint) break;
        }
    } catch (err) { console.error(err.message); process.exit(1); }

    if (!endpoint) { console.error("No endpoint"); process.exit(1); }

    // Helper
    async function call(name, args = {}) {
        console.log(`\n> Calling ${name}...`);
        const res = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${AUTH_TOKEN}` },
            body: JSON.stringify({ jsonrpc: "2.0", id: Date.now(), method: "tools/call", params: { name, arguments: args } })
        });
        const json = await res.json();
        if (json.error) throw new Error(JSON.stringify(json.error));
        return JSON.parse(json.result.content[0].text);
    }

    // Init handshake
    await fetch(endpoint, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${AUTH_TOKEN}` },
        body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "initialize", params: { protocolVersion: "2024-11-05", capabilities: {}, clientInfo: { name: "test", version: "1.0" } } })
    });
    await fetch(endpoint, { method: 'POST', headers: { 'Authorization': `Bearer ${AUTH_TOKEN}` }, body: JSON.stringify({ jsonrpc: "2.0", method: "notifications/initialized", params: {} }) });

    try {
        // [2] Capabilities
        const caps = await call('capabilities', {});
        console.log("Capabilities:", caps);

        // [3] Email V2 List (Limit 5)
        const emails = await call('email_list_v2', { limit: 5, unreadOnly: false });
        console.log(`Fetched ${emails.emails.length} emails. Next Cursor: ${emails.nextCursor}`);

        if (emails.emails.length > 0) {
            // [4] Read V2
            const detail = await call('email_read_v2', { uid: emails.emails[0].uid, account: emails.emails[0].account });
            console.log(`Read Email: ${detail.subject} (Attachments: ${detail.attachments?.length})`);
        }

        // [5] Calendar V2 List
        const events = await call('calendar_list_v2', { maxResults: 5 });
        console.log(`Fetched ${events.events.length} events.`);

        // [6] Tasks V2
        const lists = await call('tasks_list_v2', { maxResults: 5 });
        console.log(`Fetched ${lists.tasks.length} tasks.`);

        // [7] Health
        const health = await call('healthcheck', {});
        console.log("Health:", health);

    } catch (e) {
        console.error("TEST FAILED:", e.message);
    }

    controller.abort();
    process.exit(0);
}

runTest();
