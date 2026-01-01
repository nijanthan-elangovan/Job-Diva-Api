# Quick Setup Guide

## For VS Code Users

### 1. Build the Server
```bash
cd "C:\Users\202211578\Job Diva Api\mcp-server"
npm install
npm run build
```

### 2. Add to VS Code Settings

Open VS Code Settings (JSON) and add:

**For Claude Code:**
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

**For Gemini Code Assist:**
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

**For GitHub Copilot (with MCP support):**
```json
{
  "github.copilot.chat.mcp.servers": {
    "jobdiva-api": {
      "command": "node",
      "args": ["C:/Users/202211578/Job Diva Api/mcp-server/dist/index.js"]
    }
  }
}
```

### 3. Restart VS Code

Completely close and reopen VS Code for the changes to take effect.

### 4. Test It

Open chat with your AI assistant and try:
```
Search for Job Diva authentication endpoints
```

The AI should now be able to query the Job Diva API documentation!

---

## For Claude Desktop Users

### 1. Build the Server (same as above)
```bash
cd "C:\Users\202211578\Job Diva Api\mcp-server"
npm install
npm run build
```

### 2. Edit Claude Config

Open: `%APPDATA%\Claude\claude_desktop_config.json`

If the file doesn't exist, create it with:
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

If it already exists, add the `jobdiva-api` entry to the `mcpServers` object.

### 3. Restart Claude Desktop

Completely quit and restart Claude Desktop.

### 4. Verify Connection

Look for a 🔌 icon in Claude Desktop showing connected MCP servers.

---

## Testing the Server

You can test the server directly from command line:

```bash
cd mcp-server
echo '{"jsonrpc":"2.0","id":1,"method":"tools/list","params":{}}' | node dist/index.js
```

You should see JSON output listing the available tools.

---

## What You Can Ask

Once configured, your AI can:

**Search & Explore:**
- "Search for candidate-related Job Diva endpoints"
- "What authentication methods does Job Diva API support?"
- "List all Job Diva API categories"

**Get Details:**
- "Show me how to authenticate with Job Diva"
- "What parameters does the candidate detail endpoint need?"
- "Get details for the job search endpoint"

**Generate Code:**
- "Write a function to authenticate with Job Diva API"
- "Create a script to fetch all active candidates"
- "Help me build a Job Diva API client in Python"

The AI will use the MCP server to fetch accurate, up-to-date information about the API!

---

## Troubleshooting

**"MCP server not found" in VS Code:**
1. Check the file path is correct
2. Make sure you ran `npm run build`
3. Verify `dist/index.js` exists
4. Restart VS Code completely

**Claude Desktop shows connection error:**
1. Check JSON syntax in config file (no trailing commas!)
2. Use forward slashes (/) in paths, even on Windows
3. Make sure Node.js is in your PATH
4. Check Claude Desktop logs: Help → View Logs

**Server starts but AI can't find endpoints:**
1. Make sure `endpoints.json` was copied to `dist/` folder
2. Check file size - it should be ~1MB
3. Try running `npm run build` again
