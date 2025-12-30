#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import {
    CallToolRequestSchema,
    ListResourcesRequestSchema,
    ListToolsRequestSchema,
    ReadResourceRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { readFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import express, { Request, Response } from "express";

// Get the directory of this file
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load the endpoints.json file
// For deployment: endpoints.json should be in the same directory as the build output
const endpointsPath = join(__dirname, "endpoints.json");
let apiData: SwaggerSpec;

interface SwaggerSpec {
    swagger: string;
    info: object;
    host: string;
    basePath: string;
    tags: Array<{ name: string; description: string }>;
    paths: Record<string, Record<string, EndpointDetails>>;
    definitions?: Record<string, object>;
}

interface EndpointDetails {
    tags?: string[];
    summary?: string;
    description?: string;
    operationId?: string;
    parameters?: Array<{
        name: string;
        in: string;
        description?: string;
        required?: boolean;
        type?: string;
        format?: string;
        schema?: object;
    }>;
    responses?: Record<string, { description: string; schema?: object }>;
    security?: Array<Record<string, string[]>>;
    deprecated?: boolean;
}

interface ProcessedEndpoint {
    path: string;
    method: string;
    tag: string;
    summary: string;
    description: string;
    details: EndpointDetails;
}

try {
    const rawData = readFileSync(endpointsPath, "utf-8");
    apiData = JSON.parse(rawData);
    console.log(`[MCP] Loaded ${Object.keys(apiData.paths).length} API paths from endpoints.json`);
} catch (error) {
    console.error(`[MCP] Error loading endpoints.json: ${error}`);
    process.exit(1);
}

// Process endpoints into a flat array for easier querying
function getAllEndpoints(): ProcessedEndpoint[] {
    const endpoints: ProcessedEndpoint[] = [];
    const paths = apiData.paths || {};

    for (const [path, methods] of Object.entries(paths)) {
        for (const [method, details] of Object.entries(methods)) {
            endpoints.push({
                path,
                method: method.toUpperCase(),
                tag: details.tags?.[0] || "Other",
                summary: details.summary || "",
                description: details.description || "",
                details,
            });
        }
    }
    return endpoints;
}

// Create the MCP server
const server = new Server(
    {
        name: "jobdiva-api-docs",
        version: "1.0.0",
    },
    {
        capabilities: {
            resources: {},
            tools: {},
        },
    }
);

// List available resources
server.setRequestHandler(ListResourcesRequestSchema, async () => {
    const tags = apiData.tags || [];

    const resources = [
        {
            uri: "jobdiva://api/tags",
            name: "API Tags/Categories",
            description: "List all available API categories (tags)",
            mimeType: "application/json",
        },
        {
            uri: "jobdiva://api/endpoints",
            name: "All Endpoints Summary",
            description: "Summary of all API endpoints",
            mimeType: "application/json",
        },
    ];

    // Add a resource for each tag
    for (const tag of tags) {
        resources.push({
            uri: `jobdiva://api/endpoints/${encodeURIComponent(tag.name)}`,
            name: `${tag.name} Endpoints`,
            description: tag.description || `Endpoints for ${tag.name}`,
            mimeType: "application/json",
        });
    }

    return { resources };
});

// Read resource content
server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
    const uri = request.params.uri;

    if (uri === "jobdiva://api/tags") {
        const tags = apiData.tags || [];
        const tagSummary = tags.map((t) => ({
            name: t.name,
            description: t.description,
            endpointCount: getAllEndpoints().filter((e) => e.tag === t.name).length,
        }));

        return {
            contents: [
                {
                    uri,
                    mimeType: "application/json",
                    text: JSON.stringify(tagSummary, null, 2),
                },
            ],
        };
    }

    if (uri === "jobdiva://api/endpoints") {
        const endpoints = getAllEndpoints();
        const summary = endpoints.map((e) => ({
            method: e.method,
            path: e.path,
            tag: e.tag,
            summary: e.summary,
        }));

        return {
            contents: [
                {
                    uri,
                    mimeType: "application/json",
                    text: JSON.stringify(summary, null, 2),
                },
            ],
        };
    }

    // Handle tag-specific endpoints
    const tagMatch = uri.match(/^jobdiva:\/\/api\/endpoints\/(.+)$/);
    if (tagMatch) {
        const tagName = decodeURIComponent(tagMatch[1]);
        const endpoints = getAllEndpoints().filter((e) => e.tag === tagName);

        const tagEndpoints = endpoints.map((e) => ({
            method: e.method,
            path: e.path,
            summary: e.summary,
            description: e.description,
            parameters: e.details.parameters?.map((p) => ({
                name: p.name,
                in: p.in,
                type: p.type,
                required: p.required,
                description: p.description,
            })),
        }));

        return {
            contents: [
                {
                    uri,
                    mimeType: "application/json",
                    text: JSON.stringify(tagEndpoints, null, 2),
                },
            ],
        };
    }

    throw new Error(`Unknown resource: ${uri}`);
});

// List available tools
server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
        tools: [
            {
                name: "search_endpoints",
                description:
                    "Search Job Diva API endpoints by keyword. Searches in path, summary, description, and parameter names.",
                inputSchema: {
                    type: "object",
                    properties: {
                        query: {
                            type: "string",
                            description: "Search term to find in endpoints",
                        },
                        tag: {
                            type: "string",
                            description: "Optional: filter by API tag/category",
                        },
                    },
                    required: ["query"],
                },
            },
            {
                name: "get_endpoint_details",
                description:
                    "Get full details of a specific API endpoint including all parameters, responses, and schemas.",
                inputSchema: {
                    type: "object",
                    properties: {
                        path: {
                            type: "string",
                            description: "The API endpoint path (e.g., /apiv2/authenticate)",
                        },
                        method: {
                            type: "string",
                            description: "HTTP method (GET, POST, PUT, DELETE)",
                            enum: ["GET", "POST", "PUT", "DELETE", "PATCH"],
                        },
                    },
                    required: ["path", "method"],
                },
            },
            {
                name: "list_endpoints_by_tag",
                description: "List all endpoints for a specific API category/tag.",
                inputSchema: {
                    type: "object",
                    properties: {
                        tag: {
                            type: "string",
                            description: "The API tag/category name (e.g., CandidateV2, JobV2, AuthenticationV2)",
                        },
                    },
                    required: ["tag"],
                },
            },
        ],
    };
});

// Handle tool calls
server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;

    if (name === "search_endpoints") {
        const query = (args?.query as string || "").toLowerCase();
        const tagFilter = args?.tag as string | undefined;

        let endpoints = getAllEndpoints();

        if (tagFilter) {
            endpoints = endpoints.filter((e) => e.tag.toLowerCase() === tagFilter.toLowerCase());
        }

        const results = endpoints.filter((e) => {
            const searchIn = [
                e.path,
                e.summary,
                e.description,
                ...(e.details.parameters?.map((p) => p.name) || []),
                ...(e.details.parameters?.map((p) => p.description || "") || []),
            ]
                .join(" ")
                .toLowerCase();
            return searchIn.includes(query);
        });

        const output = results.slice(0, 20).map((e) => ({
            method: e.method,
            path: e.path,
            tag: e.tag,
            summary: e.summary,
            description: e.description,
        }));

        return {
            content: [
                {
                    type: "text",
                    text: `Found ${results.length} endpoints matching "${query}"${tagFilter ? ` in ${tagFilter}` : ""}:\n\n${JSON.stringify(output, null, 2)}`,
                },
            ],
        };
    }

    if (name === "get_endpoint_details") {
        const path = args?.path as string;
        const method = (args?.method as string || "").toUpperCase();

        const endpoint = getAllEndpoints().find(
            (e) => e.path === path && e.method === method
        );

        if (!endpoint) {
            return {
                content: [
                    {
                        type: "text",
                        text: `Endpoint not found: ${method} ${path}`,
                    },
                ],
            };
        }

        const details = {
            method: endpoint.method,
            path: endpoint.path,
            tag: endpoint.tag,
            summary: endpoint.summary,
            description: endpoint.description,
            parameters: endpoint.details.parameters,
            responses: endpoint.details.responses,
            deprecated: endpoint.details.deprecated,
        };

        return {
            content: [
                {
                    type: "text",
                    text: JSON.stringify(details, null, 2),
                },
            ],
        };
    }

    if (name === "list_endpoints_by_tag") {
        const tag = args?.tag as string;
        const endpoints = getAllEndpoints().filter(
            (e) => e.tag.toLowerCase() === tag.toLowerCase()
        );

        if (endpoints.length === 0) {
            const availableTags = apiData.tags?.map((t) => t.name).join(", ");
            return {
                content: [
                    {
                        type: "text",
                        text: `No endpoints found for tag "${tag}". Available tags: ${availableTags}`,
                    },
                ],
            };
        }

        const output = endpoints.map((e) => ({
            method: e.method,
            path: e.path,
            summary: e.summary,
        }));

        return {
            content: [
                {
                    type: "text",
                    text: `${endpoints.length} endpoints in ${tag}:\n\n${JSON.stringify(output, null, 2)}`,
                },
            ],
        };
    }

    throw new Error(`Unknown tool: ${name}`);
});

// Create Express app for SSE transport
const app = express();
const PORT = parseInt(process.env.PORT || "8000");

// Store active transports
const transports: Map<string, SSEServerTransport> = new Map();

// Root route - landing page
app.get("/", (_req: Request, res: Response) => {
    const tags = apiData.tags || [];
    const endpointCount = getAllEndpoints().length;

    res.send(`
<!DOCTYPE html>
<html>
<head>
    <title>Job Diva API MCP Server</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 800px; margin: 50px auto; padding: 20px; background: #1a1a2e; color: #eee; }
        h1 { color: #60a5fa; }
        .status { background: #16213e; padding: 20px; border-radius: 8px; margin: 20px 0; }
        .status h2 { margin-top: 0; color: #a78bfa; }
        code { background: #0f3460; padding: 4px 8px; border-radius: 4px; }
        ul { list-style: none; padding: 0; }
        li { padding: 8px 0; border-bottom: 1px solid #333; }
        .tag { background: #16213e; padding: 4px 12px; border-radius: 16px; font-size: 0.9em; }
        a { color: #60a5fa; }
    </style>
</head>
<body>
    <h1>🚀 Job Diva API MCP Server</h1>
    <p>This is a Model Context Protocol (MCP) server exposing Job Diva API documentation to AI assistants.</p>
    
    <div class="status">
        <h2>✅ Server Status</h2>
        <ul>
            <li><strong>Status:</strong> Running</li>
            <li><strong>Endpoints Loaded:</strong> ${endpointCount}</li>
            <li><strong>Categories:</strong> ${tags.length}</li>
        </ul>
    </div>
    
    <div class="status">
        <h2>📡 Available Routes</h2>
        <ul>
            <li><code>GET /</code> - This page</li>
            <li><code>GET /health</code> - <a href="/health">Health check (JSON)</a></li>
            <li><code>GET /mcp</code> - SSE endpoint for MCP clients</li>
            <li><code>POST /mcp/message</code> - Message endpoint for MCP</li>
        </ul>
    </div>
    
    <div class="status">
        <h2>🏷️ API Categories</h2>
        <ul>
            ${tags.map(t => `<li><span class="tag">${t.name}</span> - ${t.description}</li>`).join('')}
        </ul>
    </div>
    
    <div class="status">
        <h2>🔧 MCP Tools Available</h2>
        <ul>
            <li><code>search_endpoints</code> - Search endpoints by keyword</li>
            <li><code>get_endpoint_details</code> - Get full endpoint details</li>
            <li><code>list_endpoints_by_tag</code> - List endpoints by category</li>
        </ul>
    </div>
</body>
</html>
    `);
});

// Health check endpoint
app.get("/health", (_req: Request, res: Response) => {
    res.json({ status: "ok", endpoints: Object.keys(apiData.paths).length });
});

// SSE endpoint for MCP
app.get("/mcp", async (req: Request, res: Response) => {
    console.log("[MCP] New SSE connection");

    const transport = new SSEServerTransport("/mcp/message", res);
    const sessionId = Date.now().toString();
    transports.set(sessionId, transport);

    res.on("close", () => {
        console.log("[MCP] SSE connection closed");
        transports.delete(sessionId);
    });

    await server.connect(transport);
});

// Message endpoint for MCP
app.post("/mcp/message", express.json(), async (req: Request, res: Response) => {
    // Find the transport and send the message
    const transportsArray = Array.from(transports.values());
    if (transportsArray.length > 0) {
        const transport = transportsArray[transportsArray.length - 1];
        await transport.handlePostMessage(req, res);
    } else {
        res.status(400).json({ error: "No active SSE connection" });
    }
});

// Start the server
app.listen(PORT, "0.0.0.0", () => {
    console.log(`[MCP] Job Diva API Documentation server running on http://0.0.0.0:${PORT}`);
    console.log(`[MCP] SSE endpoint: /mcp`);
    console.log(`[MCP] Health check: /health`);
});
