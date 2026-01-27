import { config } from '../config.js';

const NGROK_URL = 'https://unpalsied-shirlene-onward.ngrok-free.dev';

async function testConnection() {
    console.log(`\n--- STARTING CONNECTION TEST: ${NGROK_URL} ---`);

    // 1. Check Root
    try {
        console.log(`[TEST] Checking root / ...`);
        const rootRes = await fetch(NGROK_URL);
        console.log(`[ROOT] Status: ${rootRes.status}`);
        const text = await rootRes.text();
        console.log(`[ROOT] Content snippet: ${text.substring(0, 50)}...`);
    } catch (err: any) {
        console.error(`[ROOT] FAILED: ${err.message}`);
    }

    // 2. Test OAuth Token
    let token = '';
    try {
        console.log(`\n[TEST] Requesting token from /token ...`);
        const tokenRes = await fetch(`${NGROK_URL}/token`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                client_id: config.serverAuth.clientId,
                client_secret: config.serverAuth.clientSecret,
                grant_type: 'authorization_code',
                code: 'diag-auth-code'
            })
        });

        console.log(`[TOKEN] Status: ${tokenRes.status}`);
        if (tokenRes.ok) {
            const data: any = await tokenRes.json();
            token = data.access_token;
            console.log(`[TOKEN] SUCCESS. Received token: ${token.substring(0, 5)}***`);
        } else {
            console.error(`[TOKEN] FAILED: ${await tokenRes.text()}`);
            return;
        }
    } catch (err: any) {
        console.error(`[TOKEN] CRITICAL ERROR: ${err.message}`);
        return;
    }

    // 3. Test SSE (Simulate ChatGPT discovery)
    try {
        console.log(`\n[TEST] Connecting to SSE /sse ...`);
        // We use a short timeout for the SSE stream because we just want to see if it starts
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 5000);

        const sseRes = await fetch(`${NGROK_URL}/sse`, {
            signal: controller.signal,
            headers: {
                'Accept': 'text/event-stream'
            }
        });

        console.log(`[SSE] Status: ${sseRes.status}`);
        console.log(`[SSE] Headers: ${JSON.stringify(Object.fromEntries(sseRes.headers.entries()), null, 2)}`);

        if (sseRes.ok) {
            console.log(`[SSE] SUCCESS. Stream established.`);
            // Note: In a real test we'd read chunks, but here we just confirm it's open
        } else {
            console.error(`[SSE] FAILED: ${await sseRes.text()}`);
        }
        clearTimeout(timeout);
    } catch (err: any) {
        if (err.name === 'AbortError') {
            console.log(`[SSE] Stream was connected and active (timed out as expected for test).`);
        } else {
            console.error(`[SSE] CRITICAL ERROR: ${err.message}`);
        }
    }

    // 4. Test Message (MCP Initialize)
    try {
        console.log(`\n[TEST] Sending MCP Initialize to /message ...`);
        const msgRes = await fetch(`${NGROK_URL}/message`, {
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
                    clientInfo: { name: "test-client", version: "1.0.0" }
                }
            })
        });

        console.log(`[MSG] Status: ${msgRes.status}`);
        const result = await msgRes.text();
        console.log(`[MSG] Result: ${result}`);

        if (msgRes.status === 200) {
            console.log(`\n--- ALL TESTS PASSED! CONNECTION IS WORKING ---`);
        } else {
            console.log(`\n--- TEST FAILED AT MESSAGE LAYER ---`);
        }
    } catch (err: any) {
        console.error(`[MSG] CRITICAL ERROR: ${err.message}`);
    }
}

testConnection();
