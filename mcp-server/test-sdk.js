import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { SSEClientTransport } from "@modelcontextprotocol/sdk/client/sse.js";

const MCP_URL = "https://job-diva-api-nijanthan-elangovan.mcphosting.app";

async function testMCPWithSDK() {
    console.log("🔍 Testing MCP Server with Official SDK...\n");

    try {
        const transport = new SSEClientTransport(new URL(`${MCP_URL}/mcp`));
        const client = new Client({
            name: "test-client",
            version: "1.0.0"
        }, {
            capabilities: {}
        });

        await client.connect(transport);
        console.log("✅ Connected to MCP server\n");

        // List tools
        console.log("🔍 Listing available tools...");
        const tools = await client.listTools();
        console.log(`✅ Found ${tools.tools.length} tools:`);
        tools.tools.forEach(tool => {
            console.log(`   - ${tool.name}: ${tool.description.substring(0, 60)}...`);
        });

        // List resources
        console.log("\n🔍 Listing available resources...");
        const resources = await client.listResources();
        console.log(`✅ Found ${resources.resources.length} resources:`);
        resources.resources.slice(0, 5).forEach(resource => {
            console.log(`   - ${resource.name}`);
        });

        // Call search_endpoints tool
        console.log("\n🔍 Testing search_endpoints tool...");
        const result = await client.callTool({
            name: "search_endpoints",
            arguments: { query: "authenticate" }
        });

        console.log("✅ Tool call successful!");
        if (result.content && result.content[0]) {
            const text = result.content[0].text;
            const preview = text.substring(0, 400);
            console.log("Response preview:", preview + "...");
        }

        await client.close();
        console.log("\n✅ All tests passed!");

    } catch (error) {
        console.error("❌ Error:", error.message);
        console.error(error);
    }
}

testMCPWithSDK();
