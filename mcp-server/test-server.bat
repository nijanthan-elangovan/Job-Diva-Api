@echo off
echo Testing Job Diva MCP Server...
echo.
cd "C:\Users\202211578\Job Diva Api\mcp-server"
echo {"jsonrpc":"2.0","id":1,"method":"tools/list","params":{}} | node dist/index.js
