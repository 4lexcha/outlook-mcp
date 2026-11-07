/**
 * Shared MCP server factory for the M365 Assistant server.
 *
 * Single source of the tool registry and request handling. Used by:
 * - index.js        — stdio transport (per-session, legacy / inspector)
 * - http-server.js  — Streamable HTTP service (long-lived, ADR-061)
 * - tests
 */
const { Server } = require("@modelcontextprotocol/sdk/server/index.js");
const config = require('./config');

// Import module tools
const { authTools } = require('./auth');
const { calendarTools } = require('./calendar');
const { emailTools } = require('./email');
const { folderTools } = require('./folder');
const { rulesTools } = require('./rules');
const { onedriveTools } = require('./onedrive');
const { todoTools } = require('./todo');
const { powerAutomateTools } = require('./power-automate');

// Combine all tools
const TOOLS = [
  ...authTools,
  ...calendarTools,
  ...emailTools,
  ...folderTools,
  ...rulesTools,
  ...onedriveTools,
  ...todoTools,
  ...powerAutomateTools
];

/**
 * Create a configured MCP Server instance (not yet connected to a transport).
 * @returns {Server}
 */
function createMcpServer() {
  const server = new Server(
    { name: config.SERVER_NAME, version: config.SERVER_VERSION },
    {
      capabilities: {
        tools: {}
      }
    }
  );

  // Handle all requests
  server.fallbackRequestHandler = async (request) => {
    try {
      const { method, params, id } = request;
      console.error(`REQUEST: ${method} [${id}]`);

      // Initialize handler
      if (method === "initialize") {
        console.error(`INITIALIZE REQUEST: ID [${id}]`);
        return {
          protocolVersion: "2025-11-25",
          capabilities: {
            tools: {}
          },
          serverInfo: { name: config.SERVER_NAME, version: config.SERVER_VERSION }
        };
      }

      // Tools list handler
      if (method === "tools/list") {
        console.error(`TOOLS LIST REQUEST: ID [${id}]`);
        console.error(`TOOLS COUNT: ${TOOLS.length}`);

        return {
          tools: TOOLS.map(tool => ({
            name: tool.name,
            description: tool.description,
            inputSchema: tool.inputSchema
          }))
        };
      }

      // Required empty responses for other capabilities
      if (method === "resources/list") return { resources: [] };
      if (method === "prompts/list") return { prompts: [] };

      // Tool call handler
      if (method === "tools/call") {
        try {
          const { name, arguments: args = {} } = params || {};

          console.error(`TOOL CALL: ${name}`);

          // Find the tool handler
          const tool = TOOLS.find(t => t.name === name);

          if (tool && tool.handler) {
            return await tool.handler(args);
          }

          // Tool not found
          return {
            error: {
              code: -32601,
              message: `Tool not found: ${name}`
            }
          };
        } catch (error) {
          console.error(`Error in tools/call:`, error);
          return {
            error: {
              code: -32603,
              message: `Error processing tool call: ${error.message}`
            }
          };
        }
      }

      // For any other method, return method not found
      return {
        error: {
          code: -32601,
          message: `Method not found: ${method}`
        }
      };
    } catch (error) {
      console.error(`Error in fallbackRequestHandler:`, error);
      return {
        error: {
          code: -32603,
          message: `Error processing request: ${error.message}`
        }
      };
    }
  };

  return server;
}

module.exports = { createMcpServer, TOOLS };
