# Job Diva API MCP Server

An MCP (Model Context Protocol) server that exposes the Job Diva API documentation to AI assistants like Gemini Code Assist, Claude, and others.

## Features

### Resources
- **jobdiva://api/tags** - List all API categories with endpoint counts
- **jobdiva://api/endpoints** - Summary of all endpoints
- **jobdiva://api/endpoints/{tag}** - Endpoints for a specific category

### Tools
- **search_endpoints** - Search endpoints by keyword
- **get_endpoint_details** - Get full details of a specific endpoint
- **list_endpoints_by_tag** - List all endpoints for a tag/category

## Installation

```bash
cd mcp-server
npm install
npm run build
```

## Configuration

### For Gemini Code Assist / VS Code

Add to your `settings.json` or workspace settings:

```json
{
  "gemini.mcp.servers": {
    "jobdiva-api-docs": {
      "command": "node",
      "args": ["c:/Users/202211578/Job Diva Api/mcp-server/dist/index.js"]
    }
  }
}
```

### For Claude Desktop

Add to `%APPDATA%\Claude\claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "jobdiva-api-docs": {
      "command": "node",
      "args": ["c:/Users/202211578/Job Diva Api/mcp-server/dist/index.js"]
    }
  }
}
```

## Usage Examples

Once configured, you can ask your AI assistant:

- "What endpoints are available for Candidates in Job Diva?"
- "How do I authenticate with Job Diva API?"
- "Search for endpoints related to billing"
- "Show me the details for the CandidateDetail endpoint"

## Development

```bash
# Build and run
npm run dev

# Build only
npm run build

# Run built server
npm start
```
