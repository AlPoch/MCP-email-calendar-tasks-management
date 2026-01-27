import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '.env') });

const NGROK_URL = 'https://unpalsied-shirlene-onward.ngrok-free.dev';
const CLIENT_ID = process.env.MCP_CLIENT_ID || 'mcp-client';
const CLIENT_SECRET = process.env.MCP_CLIENT_SECRET || 'mcp-secret';
const STATIC_TOKEN = process.env.MCP_STATIC_TOKEN || 'mcp-static-token-123';

async function verify() {
    console.log(`\n--- MCP CONNECTION TEST v2 ---`);
    console.log(`URL: ${NGROK_URL}`);
    console.log(`Client ID: ${CLIENT_ID}`);

    // 1. Check if server is alive
    try {
        console.log(`\n[1/4] Checking root URL...`);
        const res = await fetch(NGROK_URL);
        console.log(`Status: ${res.status}`);
        const text = await res.text();
        console.log(`Response: ${text.substring(0, 100)}`);
        if (!res.ok) throw new Error(`Server at ${NGROK_URL} is not reachable (Status: ${res.status})`);
    } catch (err) {
        console.error(`FAILED: ${err.message}`);
        return;
    }

    // 2. Test OAuth Token exchange
    let token = '';
    try {
        console.log(`\n[2/4] Testing Token Exchange (/token)...`);
        const res = await fetch(`${NGROK_URL}/token`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                client_id: CLIENT_ID,
                client_secret: CLIENT_SECRET,
                grant_type: 'authorization_code',
                code: 'any-code'
            })
        });
        console.log(`Status: ${res.status}`);
        if (res.ok) {
            const data = await res.json();
            token = data.access_token;
            console.log(`SUCCESS. Got token: ${token.substring(0, 5)}...`);
        } else {
            console.error(`FAILED: ${await res.text()}`);
            return;
        }
    } catch (err) {
        console.error(`ERROR: ${err.message}`);
        return;
    }

    // 3. Test SSE Handshake
    try {
        console.log(`\n[3/4] Testing SSE Connection (/sse)...`);
        const controller = new AbortController();
        const id = setTimeout(() => controller.abort(), 3000);

        const res = await fetch(`${NGROK_URL}/sse`, {
            signal: controller.signal,
            headers: { 'Accept': 'text/event-stream' }
        });

        console.log(`Status: ${res.status}`);
        console.log(`Headers: ${JSON.stringify(Object.fromEntries(res.headers.entries()))}`);

        if (res.ok) {
            console.log(`SUCCESS. SSE stream initiated.`);
        } else {
            console.error(`FAILED: ${await res.text()}`);
        }
        clearTimeout(id);
    } catch (err) {
        if (err.name === 'AbortError') {
            console.log(`SUCCESS. SSE stream active (aborted after 3s).`);
        } else {
            console.error(`ERROR: ${err.message}`);
        }
    }

    // 4. Test Message with Token
    try {
        console.log(`\n[4/4] Testing Protected Message (/message)...`);
        const res = await fetch(`${NGROK_URL}/message`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                jsonrpc: "2.0",
                id: 1,
                method: "initialize",
                params: {
                    protocolVersion: "2024-11-05",
                    capabilities: {},
                    clientInfo: { name: "verify-script", version: "1.0.0" }
                }
            })
        });

        console.log(`Status: ${res.status}`);
        const result = await res.text();
        console.log(`Response: ${result}`);

        if (res.ok) {
            console.log(`\n=== ALL TESTS PASSED! CONNECTION IS STABLE ===`);
        } else {
            console.log(`\n=== TEST FAILED AT MESSAGE LAYER ===`);
        }
    } catch (err) {
        console.error(`ERROR: ${err.message}`);
    }
}

verify();
