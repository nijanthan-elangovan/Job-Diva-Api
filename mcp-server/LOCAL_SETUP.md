# Local Setup Guide - Job Diva API MCP Server

## Quick Start

### 1. Navigate to the MCP server directory

```bash
cd mcp-server
```

### 2. Install dependencies (if not already done)

```bash
npm install
```

### 3. Build the server

```bash
npm run build
```

### 4. Start the server

```bash
npm start
```

You should see:
```
[MCP] Loaded 386 API paths from endpoints.json
[MCP] Job Diva API Documentation server running on http://0.0.0.0:8000
[MCP] SSE endpoint: /mcp
[MCP] Health check: /health
```

### 5. Test it works

Open a new terminal and run:

```bash
curl http://localhost:8000/health
```

You should get: `{"status":"ok","endpoints":386}`

Or open http://localhost:8000 in your browser to see the landing page.

## Using with Claude Desktop

### Option 1: As a Subprocess (Recommended)

1. Make sure the server is **NOT** running manually
2. Add to your Claude Desktop config file:

**Windows:** `%APPDATA%\Claude\claude_desktop_config.json`
**macOS:** `~/Library/Application Support/Claude/claude_desktop_config.json`

```json
{
  "mcpServers": {
    "jobdiva-api": {
      "command": "node",
      "args": [
        "C:/Users/202211578/Job Diva Api/trusting-pascal/mcp-server/build/index.js"
      ]
    }
  }
}
```

**Important:** Update the path to match your actual directory:
- Replace `C:/Users/202211578/Job Diva Api/trusting-pascal/` with your path
- Use forward slashes `/` even on Windows
- Use the **absolute path** to the `build/index.js` file

3. Restart Claude Desktop
4. Claude will automatically start/stop the server as needed

### Option 2: Connect to Running Server (via SSE)

If you prefer to run the server manually:

1. Start the server: `npm start` (from mcp-server directory)
2. Add to Claude Desktop config:

```json
{
  "mcpServers": {
    "jobdiva-api": {
      "url": "http://localhost:8000/mcp"
    }
  }
}
```

3. Restart Claude Desktop

## Testing the MCP Connection

Once configured in Claude Desktop, you can ask Claude:

- "Search for authentication endpoints in Job Diva API"
- "Show me all candidate-related endpoints"
- "Get details for the /apiv2/authenticate endpoint"

## Available MCP Tools

When connected, Claude has access to these tools:

### 1. **search_endpoints** - Search by keyword
```
Example: "Search for endpoints related to jobs"
```

### 2. **get_endpoint_details** - Get full endpoint info
```
Example: "Get details for POST /apiv2/authenticate"
```

### 3. **list_endpoints_by_tag** - Browse by category
```
Example: "List all CandidateV2 endpoints"
```

## Verification Steps

### 1. Check if server is running
```bash
curl http://localhost:8000/health
```
Should return: `{"status":"ok","endpoints":386}`

### 2. Check SSE endpoint
```bash
curl -N -H "Accept: text/event-stream" http://localhost:8000/mcp
```
Should return session information

### 3. View in browser
Open: http://localhost:8000

You should see a nice landing page with:
- Server status
- 386 endpoints loaded
- 13 categories
- Available routes

## Troubleshooting

### "Port 8000 is already in use"

Either:
- Kill the existing process on port 8000
- Or use a different port:
  ```bash
  PORT=8080 npm start
  ```
  Then update your Claude config to use `http://localhost:8080/mcp`

### "Module not found"

Run:
```bash
npm install
npm run build
```

### Claude Desktop can't connect

1. Make sure the path in the config is correct (absolute path)
2. Use forward slashes `/` even on Windows
3. Make sure you've run `npm run build` first
4. Check the path points to `build/index.js` not `src/index.ts`
5. Restart Claude Desktop after config changes

### Want to see server logs?

When running via Claude Desktop subprocess, check the Claude Desktop logs for MCP server output.

## API Categories Available

Once connected, you can browse these Job Diva API categories:

- **ActivityV2** - Activity endpoints
- **AuthenticationV2** - Authentication endpoints
- **CandidateV2** - Candidate management
- **CompanyV2** - Company management
- **ContactV2** - Contact management
- **CustomFieldV2** - Custom field operations
- **JobV2** - Job management
- **NoteV2** - Notes
- **PlacementV2** - Placements
- **ReferenceV2** - References
- **ResumeUploadV2** - Resume uploads
- **SubmissionV2** - Submissions
- **TaskV2** - Tasks

## Example Usage in Claude

Once set up, try asking Claude:

> "What Job Diva API endpoints are available for managing candidates?"

> "Show me how to authenticate with the Job Diva API"

> "Find endpoints related to resume upload"

Claude will use the MCP tools to search and retrieve the exact API documentation for you!
