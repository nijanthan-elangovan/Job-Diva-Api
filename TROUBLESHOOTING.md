# MCP Server Troubleshooting Guide

## Error: "No such tool available: mcp__jobdiva-api__*"

This error means the MCP server isn't properly connected to Claude Code. Here's how to fix it:

### Step 1: Verify the Server Works

Run this command to test the server directly:

```bash
cd "C:\Users\202211578\Job Diva Api\mcp-server"
echo '{"jsonrpc":"2.0","id":1,"method":"tools/list","params":{}}' | node dist/index.js
```

You should see JSON output with 4 tools. If this works, the server is fine.

### Step 2: Check Your Claude Code Settings

The configuration needs to be in your **VS Code User Settings** (not workspace settings).

1. **Open VS Code**
2. **Press** `Ctrl+Shift+P`
3. **Type** "Preferences: Open User Settings (JSON)"
4. **Add or update** the MCP configuration:

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

**IMPORTANT:**
- Use forward slashes `/` even on Windows
- The path must be absolute (full path)
- No trailing commas

### Step 3: Restart VS Code Completely

1. **Close ALL VS Code windows**
2. **Wait 5 seconds**
3. **Reopen VS Code**

### Step 4: Verify Connection

After restarting, check if the MCP server is connected:

1. Open the **Output panel** (View → Output)
2. Select **"MCP"** or **"Claude Code"** from the dropdown
3. Look for a message like: `[JobDiva MCP] Server started and ready for connections`

### Step 5: Test the Connection

Try these commands in Claude Code chat:

```
Can you list the Job Diva API categories?
```

or

```
Search for authentication endpoints in Job Diva
```

## Alternative: Claude Desktop Configuration

If you're using Claude Desktop instead of VS Code:

1. **Open File Explorer**
2. **Navigate to:** `%APPDATA%\Claude\`
3. **Edit** `claude_desktop_config.json` (create if it doesn't exist)
4. **Add:**

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

5. **Completely quit and restart Claude Desktop**
6. **Look for the 🔌 icon** showing connected MCP servers

## Common Issues

### Issue: "command not found: node"

**Solution:** Make sure Node.js is installed and in your PATH

```bash
node --version
```

Should show `v20.x.x` or higher.

### Issue: "Cannot find module"

**Solution:** Rebuild the server

```bash
cd "C:\Users\202211578\Job Diva Api\mcp-server"
npm install
npm run build
```

### Issue: Server connects but no tools available

**Solution:** Check that endpoints.json is in the dist folder

```bash
ls "C:\Users\202211578\Job Diva Api\mcp-server\dist\endpoints.json"
```

Should be ~1.1MB. If missing, run `npm run build` again.

### Issue: JSON parse errors

**Solution:** Check your config file syntax
- No trailing commas
- All strings in double quotes
- Proper bracket matching

### Issue: Permission denied

**Solution:** Make sure index.js is executable

```bash
chmod +x "C:\Users\202211578\Job Diva Api\mcp-server\dist\index.js"
```

## Verify Your Configuration

Run the test script:

```bash
cd "C:\Users\202211578\Job Diva Api\mcp-server"
test-server.bat
```

## Still Having Issues?

1. **Check VS Code Extension:** Make sure you have the Claude Code or Gemini extension installed
2. **Check Node Version:** `node --version` should be v18 or higher
3. **Check Logs:** Look in VS Code Output panel for error messages
4. **Try Different Path Format:** Some systems need `C:\\Users\\...` instead of `C:/Users/...`

## Working Configuration Example

Here's a complete working VS Code settings.json:

```json
{
  "editor.fontSize": 14,
  "workbench.colorTheme": "Default Dark+",
  "mcp.servers": {
    "jobdiva-api": {
      "command": "node",
      "args": ["C:/Users/202211578/Job Diva Api/mcp-server/dist/index.js"]
    }
  }
}
```

## Contact

If none of these solutions work, check:
- Claude Code documentation
- VS Code Extension settings
- MCP SDK documentation at https://modelcontextprotocol.io/
