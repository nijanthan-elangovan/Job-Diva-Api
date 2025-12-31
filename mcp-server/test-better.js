import https from 'https';
import { URL } from 'url';

const MCP_URL = "https://job-diva-api-nijanthan-elangovan.mcphosting.app";

function testHealth() {
    return new Promise((resolve, reject) => {
        console.log("Testing Health...");
        https.get(`${MCP_URL}/health`, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                console.log(`Health Status: ${res.statusCode}`);
                console.log(`Body: ${data}`);
                resolve();
            });
        }).on('error', (e) => {
            console.log(`Health Error: ${e.message}`);
            resolve();
        });
    });
}

function postMessage(body) {
    return new Promise((resolve, reject) => {
        const url = new URL(`${MCP_URL}/mcp/message`);
        const options = {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            }
        };

        const req = https.request(url, options, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                console.log(`POST Status: ${res.statusCode}`);
                console.log(`POST Response: ${data}`);
                resolve(res.statusCode);
            });
        });

        req.on('error', (e) => {
            console.log(`POST Error: ${e.message}`);
            resolve(500);
        });

        req.write(JSON.stringify(body));
        req.end();
    });
}

async function runTest() {
    await testHealth();

    console.log("Starting SSE connection...");
    const url = new URL(`${MCP_URL}/mcp`);

    const req = https.request(url, {
        method: 'GET',
        headers: {
            'Accept': 'text/event-stream',
            'Connection': 'keep-alive'
        }
    }, (res) => {
        console.log(`SSE Status: ${res.statusCode}`);

        res.on('data', async (chunk) => {
            const text = chunk.toString();
            console.log(`SSE Data received: ${text.trim()}`);

            // Once we receive data, it means connection is open.
            // In a real scenario we wait for the endpoint event, but let's try assuming it's ready.
            if (!runTest.initialized) {
                runTest.initialized = true;

                console.log("First data received, sending Initialize...");

                // Wait a tiny bit to ensure server state is consistent
                setTimeout(async () => {
                    await postMessage({
                        jsonrpc: "2.0",
                        id: 1,
                        method: "initialize",
                        params: {
                            protocolVersion: "2024-11-05",
                            capabilities: {},
                            clientInfo: { name: "test-client", version: "1.0.0" }
                        }
                    });

                    // Initialized, now try to list tools
                    await postMessage({
                        jsonrpc: "2.0",
                        id: 2,
                        method: "tools/list",
                        params: {}
                    });

                    console.log("Test finished.");
                    process.exit(0);
                }, 1000);
            }
        });
    });

    req.on('error', (e) => {
        console.error(`SSE Error: ${e.message}`);
    });

    req.end();

    // Timeout
    setTimeout(() => {
        console.log("Timeout reached");
        process.exit(1);
    }, 15000);
}

runTest.initialized = false;
