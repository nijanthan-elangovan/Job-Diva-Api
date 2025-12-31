
const MCP_URL = "https://job-diva-api-nijanthan-elangovan.mcphosting.app";

console.log("Starting debug script...");
console.log(`Target: ${MCP_URL}`);

async function main() {
    let controller;
    try {
        // 1. Health Check
        console.log(`\n1. Fetching ${MCP_URL}/health`);
        const res = await fetch(`${MCP_URL}/health`);
        console.log("Health Status:", res.status);
        console.log("Health Body:", await res.text());

        // 2. SSE Connection
        console.log("\n2. Connecting to SSE...");
        controller = new AbortController();

        const sseResponse = await fetch(`${MCP_URL}/mcp`, {
            headers: { 'Accept': 'text/event-stream' },
            signal: controller.signal
        });

        console.log("SSE Status:", sseResponse.status);

        if (sseResponse.ok) {
            const reader = sseResponse.body.getReader();
            const decoder = new TextDecoder();
            let buffer = "";
            let postEndpoint = null;
            let postComplete = false;

            // Read loop
            while (true) {
                const { value, done } = await reader.read();
                if (done) break;

                const chunk = decoder.decode(value, { stream: true });
                buffer += chunk;
                // console.log("Received Chunk:", chunk);

                if (!postEndpoint && buffer.includes("event: endpoint")) {
                    const lines = buffer.split('\n');
                    for (const line of lines) {
                        if (line.startsWith('data:')) {
                            const data = line.substring(5).trim();
                            if (data.includes('/message')) {
                                postEndpoint = data;
                                console.log("\n3. Found POST endpoint:", postEndpoint);

                                // POST immediately while keeping loop running
                                const fullPostUrl = postEndpoint.startsWith('http')
                                    ? postEndpoint
                                    : `${MCP_URL}${postEndpoint}`;

                                console.log("Attempting POST to:", fullPostUrl);

                                fetch(fullPostUrl, {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({
                                        jsonrpc: "2.0",
                                        id: 1,
                                        method: "initialize",
                                        params: {
                                            protocolVersion: "2024-11-05",
                                            capabilities: {},
                                            clientInfo: { name: "test-client", version: "1.0" }
                                        }
                                    })
                                }).then(async (postRes) => {
                                    console.log("POST Status:", postRes.status);
                                    const postText = await postRes.text();
                                    console.log("POST Body:", postText);
                                    postComplete = true;
                                    // Now we can close
                                    controller.abort();
                                }).catch(err => {
                                    console.error("POST Error:", err);
                                    controller.abort();
                                });
                            }
                        }
                    }
                }
            }
        }

    } catch (e) {
        if (e.name === 'AbortError') {
            console.log("Test completed (Aborted SSE connection).");
        } else {
            console.error("Error:", e);
        }
    }
}

main();
