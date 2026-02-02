/**
 * DIESES SKRIPT TESTET DIE E-MAIL-LISTE ÜBER DAS MCP-HTTP-PROTOKOLL (JSON-RPC) VIA NGROK.
 * Robustere Version: Extrahiert Endpoint-URL auch wenn sie kein JSON ist.
 */
import { config } from '../config.js';

const BASE_URL = 'https://unpalsied-shirlene-onward.ngrok-free.dev';

async function main() {
    console.log(`--- Starting Robust MCP HTTP Email Test (via NGROK) ---`);

    try {
        // 1. Authenticate
        const tokenRes = await fetch(`${BASE_URL}/token`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                client_id: config.serverAuth.clientId,
                client_secret: config.serverAuth.clientSecret
            })
        });
        const tokenData: any = await tokenRes.json();
        const token = tokenData.access_token;
        console.log(`[AUTH] Token obtained.`);

        // 2. SSE Connection
        const controller = new AbortController();
        const sseRes = await fetch(`${BASE_URL}/sse`, {
            headers: { 'Accept': 'text/event-stream' },
            signal: controller.signal
        });
        const reader = sseRes.body?.getReader();
        if (!reader) throw new Error('No SSE reader');

        console.log('[SSE] Connection established. Waiting for endpoint/results...');

        let messageEndpoint = `${BASE_URL}/message`;
        const responsePromise = new Promise((resolve, reject) => {
            const timeout = setTimeout(() => reject(new Error('SSE Timeout waiting for result')), 40000);
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

                                // Try to parse as JSON first
                                let data;
                                try {
                                    data = JSON.parse(rawData);
                                } catch (e) {
                                    // Not JSON - check if it looks like a URL/Endpoint
                                    if (rawData.startsWith('/')) {
                                        messageEndpoint = `${BASE_URL}${rawData}`;
                                        console.log(`[SSE] Endpoint string received: ${messageEndpoint}`);
                                        continue;
                                    }
                                    continue;
                                }

                                // If JSON
                                if (data.type === 'endpoint' || data.url) {
                                    const url = data.url.startsWith('http') ? data.url : `${BASE_URL}${data.url}`;
                                    messageEndpoint = url;
                                    console.log(`[SSE] Endpoint JSON received: ${messageEndpoint}`);
                                } else if (data.id === 303) {
                                    clearTimeout(timeout);
                                    resolve(data);
                                    return;
                                }
                            }
                        }
                    }
                } catch (err) { reject(err); }
            }
            read();
        });

        // Small delay
        await new Promise(resolve => setTimeout(resolve, 3000));

        // 3. Send Tool Call
        console.log(`[MSG] Sending email_list to ${messageEndpoint}...`);
        const msgRes = await fetch(messageEndpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                jsonrpc: "2.0",
                id: 303,
                method: "tools/call",
                params: {
                    name: "email_list",
                    arguments: { limit: 10 }
                }
            })
        });
        console.log(`[MSG] POST status: ${msgRes.status}`);

        // 4. Wait for result
        const mcpResponse: any = await responsePromise;
        console.log('\n--- SUCCESS: FINAL RESULT ---');

        const rawText = mcpResponse.result.content[0].text;
        const emails = JSON.parse(rawText);
        console.log(`Emails found: ${emails.length}`);
        emails.slice(0, 10).forEach((mail: any) => {
            console.log(`📧 [${mail.account}] ${mail.from}: ${mail.subject}`);
        });

        controller.abort();
        process.exit(0);
    } catch (error: any) {
        console.error('\n❌ TEST FAILED:', error.message);
        process.exit(1);
    }
}

main();
