console.log("Starting debug script...");

const MCP_URL = "https://job-diva-api-nijanthan-elangovan.mcphosting.app";

try {
    console.log(`Fetching ${MCP_URL}/health`);
    const res = await fetch(`${MCP_URL}/health`);
    console.log("Health Status:", res.status);
    const txt = await res.text();
    console.log("Health Body:", txt);

    // Now try SSE connection
    console.log("\nConnecting to SSE...");
    const controller = new AbortController();

    // We can't easily read SSE with fetch in a simple script without a loop, 
    // but let's just see if it connects.
    const sseResponse = await fetch(`${MCP_URL}/mcp`, {
        headers: { 'Accept': 'text/event-stream' },
        signal: controller.signal
    });

    console.log("SSE Status:", sseResponse.status);

    if (sseResponse.ok) {
        // Just try to read first chunk
        const reader = sseResponse.body.getReader();
        const { value, done } = await reader.read();
        if (value) {
            console.log("SSE Chunk:", new TextDecoder().decode(value));
        }

        // Try to POST
        console.log("Attempting POST to /mcp/message...");
        const postRes = await fetch(`${MCP_URL}/mcp/message`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                jsonrpc: "2.0",
                id: 1,
                method: "initialize",
                params: {
                    protocolVersion: "2024-11-05",
                    capabilities: {},
                    clientInfo: { name: "test", version: "1.0" }
                }
            })
        });

        console.log("POST Status:", postRes.status);
        const postText = await postRes.text();
        console.log("POST Body:", postText);
    }

    controller.abort();

} catch (e) {
    console.error("Error:", e);
}
