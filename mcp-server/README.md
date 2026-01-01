# Job Diva API MCP Server

A Model Context Protocol (MCP) server that exposes the complete Job Diva API documentation to AI assistants (Claude, ChatGPT, and others) in VS Code and other MCP-compatible environments.

## What Does This Do?

This MCP server makes it incredibly easy for AI assistants to understand and help you work with the Job Diva API. Instead of manually searching through documentation or copying endpoint details, the AI can:

- Search for relevant endpoints instantly
- Get complete parameter and response details
- Understand API structure and categories
- Help you write correct API calls with proper authentication

## Features

### Resources
- `jobdiva://api/overview` - Complete API overview with all categories
- `jobdiva://api/tags` - List all API categories with endpoint counts
- `jobdiva://api/endpoints` - Summary of all endpoints
- `jobdiva://api/category/{name}` - All endpoints for a specific category

### Tools (What AI Can Do)
1. **search_jobdiva_endpoints** - Search endpoints by keyword across paths, descriptions, parameters
2. **get_jobdiva_endpoint** - Get complete details for a specific endpoint
3. **list_jobdiva_categories** - List all API categories (CandidateV2, JobV2, etc.)
4. **get_jobdiva_category** - Get all endpoints in a category with full details

## Installation

### Step 1: Build the Server

```bash
cd "C:\Users\202211578\Job Diva Api\mcp-server"
npm install
npm run build
```

### Step 2: Configure for VS Code (Claude Code / Gemini)

Add this to your VS Code settings (`.vscode/settings.json` or User Settings):

```json
{
  "mcp.servers": {
    "jobdiva-api": {
      "command": "node",
      "args": ["C:/Users/202211578/Job Diva Api/mcp-server/dist/index.js"]
    }
  }
}
```

Or for Gemini Code Assist:

```json
{
  "gemini.mcp.servers": {
    "jobdiva-api": {
      "command": "node",
      "args": ["C:/Users/202211578/Job Diva Api/mcp-server/dist/index.js"]
    }
  }
}
```

### Step 3: Configure for Claude Desktop

Edit `%APPDATA%\Claude\claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "jobdiva-api": {
      "command": "node",
      "args": ["C:/Users/202211578/Job Diva Api/mcp-server/dist/index.js"]
    }
  }
}
```

Then restart Claude Desktop.

## Usage Examples

Once configured, you can ask your AI assistant:

**Finding Endpoints:**
- "Search for Job Diva endpoints related to candidates"
- "Find all authentication endpoints"
- "What endpoints are available for billing?"

**Getting Details:**
- "Show me the details for the authenticate endpoint"
- "What parameters does the candidate detail endpoint need?"
- "How do I call the job search API?"

**Understanding Structure:**
- "What categories are in the Job Diva API?"
- "Show me all CandidateV2 endpoints"
- "List all endpoints in the JobV2 category"

**Building Code:**
- "Write a function to authenticate with Job Diva API"
- "Create a script to fetch candidate details"
- "Help me build a job search query"

## API Categories

The Job Diva API is organized into these categories:

- **ActivityV2** - Activity management
- **AuthenticationV2** - Authentication and tokens
- **CandidateV2** - Candidate management
- **CompanyV2** - Company data
- **ContactV2** - Contact management
- **DivisionV2** - Division operations
- **FinancialV2** - Financial/billing operations
- **JobDivaV2** - General Job Diva operations
- **JobV2** - Job listings and management
- **LeadV2** - Lead management
- **OpportunityV2** - Opportunity tracking
- **StartV2** - Start operations
- **UserV2** - User management

## Development

```bash
# Build the server
npm run build

# Run the server directly (for testing)
npm start

# Rebuild and run
npm run dev
```

## How It Works

1. The server loads `endpoints.json` (Swagger/OpenAPI spec) containing all Job Diva API endpoints
2. It exposes this data through the Model Context Protocol
3. AI assistants can query this data using MCP resources and tools
4. The AI gets structured, up-to-date information about the API

## Troubleshooting

**Server not showing in VS Code:**
- Make sure you've restarted VS Code after updating settings
- Check that the path in settings.json is correct
- Look for MCP server logs in VS Code Output panel

**Claude Desktop not connecting:**
- Verify the JSON syntax in `claude_desktop_config.json`
- Make sure to use forward slashes (/) in Windows paths
- Restart Claude Desktop completely

**Build errors:**
- Run `npm install` again
- Make sure TypeScript is installed: `npm list typescript`
- Check that `endpoints.json` exists in the parent directory

## File Structure

```
mcp-server/
├── src/
│   └── index.ts          # MCP server implementation
├── dist/                 # Built output (generated)
│   ├── index.js         # Compiled JavaScript
│   └── endpoints.json   # API data (copied)
├── package.json         # Dependencies
├── tsconfig.json        # TypeScript config
└── README.md           # This file
```

## Base URL

All Job Diva API endpoints use:
- Base URL: `https://api.jobdiva.com/`
- All endpoints start with `/apiv2/`

## License

MIT
