/**
 * DIESES SKRIPT TESTET DIE E-MAIL-LISTE ÜBER DAS MCP-HTTP-PROTOKOLL (JSON-RPC).
 * Unterstützt nun --local Flag für Tests gegen localhost:3000.
 */
import { config } from '../config.js';

const isLocal = process.argv.includes('--local');
const BASE_URL = isLocal
    ? 'http://localhost:3000'
    : 'https://unpalsied-shirlene-onward.ngrok-free.dev';

async function main() {
    console.log(`--- Starting MCP HTTP Email Test ---`);
    console.log(`Target URL: ${BASE_URL}${isLocal ? ' (LOCAL)' : ' (EXTERNAL)'}\n`);

    try {
        // 1. Authenticate
        console.log(`[AUTH] Fetching token from ${BASE_URL}/token...`);
        const tokenRes = await fetch(`${BASE_URL}/token`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                client_id: config.serverAuth.clientId,
                client_secret: config.serverAuth.clientSecret
            })
        });

        if (!tokenRes.ok) throw new Error(`Auth failed with status ${tokenRes.status}`);
        const tokenData: any = await tokenRes.json();
        const token = tokenData.access_token;
        console.log(`[AUTH] Token successfully obtained.`);

        // 2. SSE Connection
        console.log(`[SSE] Opening stream at ${BASE_URL}/sse...`);
        const controller = new AbortController();
        const sseRes = await fetch(`${BASE_URL}/sse`, {
            headers: { 'Accept': 'text/event-stream' },
            signal: controller.signal
        });

        if (!sseRes.ok) throw new Error(`SSE initiate failed with status ${sseRes.status}`);
        const reader = sseRes.body?.getReader();
        if (!reader) throw new Error('No SSE reader available');

        console.log('[SSE] Stream open. Waiting for session identification...');

        let messageEndpoint = `${BASE_URL}/message`;
        const responsePromise = new Promise((resolve, reject) => {
            const timeout = setTimeout(() => reject(new Error('SSE Timeout waiting for result (120s reached)')), 120000);
            let buffer = '';

            async function read() {
                try {
                    while (true) {
                        const { done, value } = await reader!.read();
                        if (done) break;
                        buffer += new TextDecoder().decode(value);
                        const lines = buffer.split('\n');
                        buffer = lines.pop() || '';

                        for (const line of lines) {
                            if (line.startsWith('data:')) {
                                const rawData = line.substring(5).trim();
                                if (!rawData) continue;
                                console.log(`[SSE-DATA] Msg: ${rawData.substring(0, 60)}...`);

                                // Try to parse as JSON first
                                let data;
                                try {
                                    data = JSON.parse(rawData);
                                } catch (e) {
                                    // Not JSON - check if it looks like a URL/Endpoint
                                    if (rawData.startsWith('/')) {
                                        messageEndpoint = `${BASE_URL}${rawData}`;
                                        console.log(`[SSE] NEW Endpoint: ${messageEndpoint}`);
                                        continue;
                                    }
                                    continue;
                                }

                                // If JSON
                                if (data.type === 'endpoint' || data.url) {
                                    const url = data.url.startsWith('http') ? data.url : `${BASE_URL}${data.url}`;
                                    messageEndpoint = url;
                                    console.log(`[SSE] NEW Endpoint (JSON): ${messageEndpoint}`);
                                } else if (data.id === 505) {
                                    clearTimeout(timeout);
                                    resolve(data);
                                    return;
                                }
                            }
                        }
                    }
                } catch (err: any) {
                    if (err.name !== 'AbortError') reject(err);
                }
            }
            read();
        });

        // Small delay to ensure SSE is fully primed
        await new Promise(resolve => setTimeout(resolve, 3000));

        // 3. Send Tool Call
        console.log(`[MSG] Sending email_list (limit: 2) to ${messageEndpoint}...`);
        const msgRes = await fetch(messageEndpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                jsonrpc: "2.0",
                id: 505,
                method: "tools/call",
                params: {
                    name: "email_list",
                    arguments: { limit: 2 }
                }
            })
        });
        console.log(`[MSG] Tool Call Response Status: ${msgRes.status}`);

        if (msgRes.status !== 202 && msgRes.status !== 200) {
            const errBody = await msgRes.text();
            console.error(`[MSG] Tool Call Error: ${errBody}`);
        }

        // 4. Wait for result
        const mcpResponse: any = await responsePromise;
        console.log('\n--- SUCCESS: FINAL RESULT ---');

        const rawText = mcpResponse.result.content[0].text;
        const emails = JSON.parse(rawText);
        console.log(`Emails found: ${emails.length}`);
        emails.forEach((mail: any) => {
            console.log(`📧 [${mail.account}] ${mail.from}: ${mail.subject}`);
        });

        controller.abort();
        process.exit(0);
    } catch (error: any) {
        console.error('\n❌ TEST ERROR:', error.message);
        process.exit(1);
    }
}

main();
