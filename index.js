#!/usr/bin/env node
/**
 * M365 Assistant MCP Server - stdio entry point
 *
 * A Model Context Protocol server that provides access to
 * Microsoft 365 services (Outlook, To Do, OneDrive, Power Automate)
 * through the Microsoft Graph API and Flow API.
 *
 * Server construction lives in mcp-server.js so the same registry serves
 * the long-lived HTTP service (http-server.js, ADR-061).
 */
const { StdioServerTransport } = require("@modelcontextprotocol/sdk/server/stdio.js");
const config = require('./config');
const { createMcpServer } = require('./mcp-server');

// Log startup information
console.error(`STARTING ${config.SERVER_NAME.toUpperCase()} MCP SERVER (stdio)`);
console.error(`Test mode is ${config.USE_TEST_MODE ? 'enabled' : 'disabled'}`);

// Make the script executable
process.on('SIGTERM', () => {
  console.error('SIGTERM received but staying alive');
});

// Start the server
const server = createMcpServer();
const transport = new StdioServerTransport();
server.connect(transport)
  .then(() => console.error(`${config.SERVER_NAME} connected and listening`))
  .catch(error => {
    console.error(`Connection error: ${error.message}`);
    process.exit(1);
  });
