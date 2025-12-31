import http from 'http';
import { URL } from 'url';

const MCP_URL = "http://localhost:8000";

function postMessage(path, body) {
    return new Promise((resolve, reject) => {
        const url = new URL(`${MCP_URL}${path}`);
        const options = {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        };

        const req = http.request(url, options, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                if (res.statusCode >= 200 && res.statusCode < 300) {
                    resolve(data);
                } else {
                    console.log(`POST Error Status: ${res.statusCode}`, data);
                    // resolve(null);
                    // If we get 400/404 here it means our session logic is failing or succeeding (if expected)
                    resolve(data);
                }
            });
        });

        req.on('error', (e) => reject(e));
        req.write(JSON.stringify(body));
        req.end();
    });
}

console.log("Starting Local Test...");
const req = http.request(`${MCP_URL}/mcp`, {
    headers: { 'Accept': 'text/event-stream' }
}, (res) => {
    console.log(`SSE Connected: ${res.statusCode}`);

    res.on('data', async (chunk) => {
        const text = chunk.toString();

        // Extract connection URL from event: endpoint\ndata: /mcp/message?sessionId=...\n\n
        const match = text.match(/event: endpoint\s+data: (\S+)/);
        if (match) {
            const endpoint = match[1];
            console.log(`✅ Received Endpoint: ${endpoint}`);

            // Now we can Initialize using this SPECIFIC endpoint
            console.log("Sending Initialize...");
            await postMessage(endpoint, {
                jsonrpc: "2.0",
                id: 1,
                method: "initialize",
                params: {
                    protocolVersion: "2024-11-05",
                    capabilities: {},
                    clientInfo: { name: "test", version: "1.0" }
                }
            });

            console.log("Sending Tools List...");
            const toolsRes = await postMessage(endpoint, {
                jsonrpc: "2.0",
                id: 2,
                method: "tools/list",
                params: {}
            });

            if (toolsRes) {
                console.log("✅ Tools received!");
                console.log(toolsRes.substring(0, 100) + "...");
                process.exit(0);
            }
        }
    });
});

req.on('error', (e) => {
    console.log("Connection Error:", e.message);
    process.exit(1);
});

req.end();

setTimeout(() => { console.log("Timeout"); process.exit(1); }, 5000);
