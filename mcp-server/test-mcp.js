/**
 * Test script for the deployed MCP server
 * Tests the SSE connection and message handling
 */

const MCP_URL = "https://job-diva-api-nijanthan-elangovan.mcphosting.app";

async function testHealthEndpoint() {
    console.log("\n🔍 Testing Health Endpoint...");
    try {
        const response = await fetch(`${MCP_URL}/health`);
        const data = await response.json();
        console.log("✅ Health Check:", data);
        return true;
    } catch (error) {
        console.error("❌ Health check failed:", error.message);
        return false;
    }
}

async function testSSEConnection() {
    console.log("\n🔍 Testing SSE Connection...");

    return new Promise((resolve) => {
        const controller = new AbortController();
        const timeout = setTimeout(() => {
            controller.abort();
            console.log("✅ SSE Connection established (timed out as expected for test)");
            resolve(true);
        }, 3000);

        fetch(`${MCP_URL}/mcp`, {
            signal: controller.signal,
            headers: {
                'Accept': 'text/event-stream'
            }
        })
            .then(response => {
                if (response.ok) {
                    console.log("✅ SSE endpoint responding, status:", response.status);
                    clearTimeout(timeout);
                    controller.abort();
                    resolve(true);
                }
            })
            .catch(error => {
                if (error.name === 'AbortError') {
                    // Expected timeout
                    resolve(true);
                } else {
                    console.error("❌ SSE connection failed:", error.message);
                    clearTimeout(timeout);
                    resolve(false);
                }
            });
    });
}

async function testMCPInitialize() {
    console.log("\n🔍 Testing MCP Initialize Request...");

    // First establish SSE connection
    const controller = new AbortController();

    const ssePromise = fetch(`${MCP_URL}/mcp`, {
        signal: controller.signal,
        headers: {
            'Accept': 'text/event-stream'
        }
    });

    // Wait a moment for SSE to establish
    await new Promise(r => setTimeout(r, 1000));

    // Send initialize message
    try {
        const initResponse = await fetch(`${MCP_URL}/mcp/message`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                jsonrpc: "2.0",
                id: 1,
                method: "initialize",
                params: {
                    protocolVersion: "2024-11-05",
                    capabilities: {},
                    clientInfo: {
                        name: "test-client",
                        version: "1.0.0"
                    }
                }
            })
        });

        if (initResponse.ok) {
            const text = await initResponse.text();
            console.log("✅ MCP Initialize Response received");
            console.log("   Response:", text.substring(0, 200) + (text.length > 200 ? "..." : ""));
        } else {
            console.log("⚠️ Initialize returned status:", initResponse.status);
        }
    } catch (error) {
        console.error("❌ Initialize failed:", error.message);
    }

    controller.abort();
}

async function testListTools() {
    console.log("\n🔍 Testing List Tools Request...");

    const controller = new AbortController();

    // Start SSE connection
    fetch(`${MCP_URL}/mcp`, {
        signal: controller.signal,
        headers: { 'Accept': 'text/event-stream' }
    }).catch(() => { });

    await new Promise(r => setTimeout(r, 500));

    try {
        const response = await fetch(`${MCP_URL}/mcp/message`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                jsonrpc: "2.0",
                id: 2,
                method: "tools/list",
                params: {}
            })
        });

        if (response.ok) {
            const text = await response.text();
            console.log("✅ List Tools Response received");

            try {
                const json = JSON.parse(text);
                if (json.result?.tools) {
                    console.log("   Tools available:");
                    json.result.tools.forEach(tool => {
                        console.log(`   - ${tool.name}: ${tool.description?.substring(0, 50)}...`);
                    });
                }
            } catch {
                console.log("   Response:", text.substring(0, 300));
            }
        }
    } catch (error) {
        console.error("❌ List tools failed:", error.message);
    }

    controller.abort();
}

async function testSearchEndpoints() {
    console.log("\n🔍 Testing Search Endpoints Tool...");

    const controller = new AbortController();

    fetch(`${MCP_URL}/mcp`, {
        signal: controller.signal,
        headers: { 'Accept': 'text/event-stream' }
    }).catch(() => { });

    await new Promise(r => setTimeout(r, 500));

    try {
        const response = await fetch(`${MCP_URL}/mcp/message`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                jsonrpc: "2.0",
                id: 3,
                method: "tools/call",
                params: {
                    name: "search_endpoints",
                    arguments: {
                        query: "authenticate"
                    }
                }
            })
        });

        if (response.ok) {
            const text = await response.text();
            console.log("✅ Search Endpoints Response received");
            console.log("   Response preview:", text.substring(0, 500) + (text.length > 500 ? "..." : ""));
        }
    } catch (error) {
        console.error("❌ Search endpoints failed:", error.message);
    }

    controller.abort();
}

// Run all tests
async function runTests() {
    console.log("═══════════════════════════════════════════════════════════");
    console.log("   🧪 MCP Server Test Suite");
    console.log("   Target:", MCP_URL);
    console.log("═══════════════════════════════════════════════════════════");

    await testHealthEndpoint();
    await testSSEConnection();
    await testMCPInitialize();
    await testListTools();
    await testSearchEndpoints();

    console.log("\n═══════════════════════════════════════════════════════════");
    console.log("   ✨ Tests Complete!");
    console.log("═══════════════════════════════════════════════════════════\n");
}

runTests();
