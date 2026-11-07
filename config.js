/**
 * Configuration for Outlook MCP Server
 */
const path = require('path');
const os = require('os');

// Load env file (server-folder .env by default, M365_ENV_FILE to override),
// before reading any process.env below.
const { loadServerEnv } = require('./env');
loadServerEnv();

// Ensure we have a home directory path even if process.env.HOME is undefined
const homeDir = process.env.HOME || process.env.USERPROFILE || os.homedir() || '/tmp';

module.exports = {
  // Server information
  SERVER_NAME: "m365-assistant",
  SERVER_VERSION: "2.2.1",
  
  // Test mode setting
  USE_TEST_MODE: process.env.USE_TEST_MODE === 'true',
  
  // Authentication configuration
  AUTH_CONFIG: {
    // MS_* is the canonical prefix; OUTLOOK_* kept as legacy synonyms (INF-127)
    clientId: process.env.MS_CLIENT_ID || process.env.OUTLOOK_CLIENT_ID || '',
    clientSecret: process.env.MS_CLIENT_SECRET || process.env.OUTLOOK_CLIENT_SECRET || '',
    redirectUri: 'http://localhost:3333/auth/callback',
    scopes: [
      'offline_access',
      'User.Read',
      'Mail.Read', 'Mail.ReadWrite', 'Mail.Send',
      'Calendars.Read', 'Calendars.ReadWrite',
      'Contacts.Read',
      'Files.Read', 'Files.ReadWrite',
      'Tasks.ReadWrite'
    ],
    tokenStorePath: path.join(homeDir, '.outlook-mcp-tokens.json'),
    authServerUrl: 'http://localhost:3333'
  },
  
  // Microsoft Graph API
  GRAPH_API_ENDPOINT: 'https://graph.microsoft.com/v1.0/',
  
  // Calendar constants
  CALENDAR_SELECT_FIELDS: 'id,subject,bodyPreview,start,end,location,organizer,attendees,isAllDay,isCancelled,recurrence',

  // Email constants
  EMAIL_SELECT_FIELDS: 'id,subject,from,toRecipients,ccRecipients,receivedDateTime,bodyPreview,hasAttachments,importance,isRead',
  EMAIL_DETAIL_FIELDS: 'id,subject,from,toRecipients,ccRecipients,bccRecipients,receivedDateTime,bodyPreview,body,hasAttachments,importance,isRead,internetMessageHeaders',

  // Microsoft To Do constants
  TODO_LIST_SELECT_FIELDS: 'id,displayName,isOwner,wellknownListName',
  TODO_TASK_SELECT_FIELDS: 'id,title,status,importance,body,dueDateTime,completedDateTime,createdDateTime,lastModifiedDateTime,isReminderOn',

  // Calendar constants (duplicate key removed 2026-11-06: union of both upstream variants,
  // the second one was the effective value before the fix)
  
  // Pagination
  DEFAULT_PAGE_SIZE: 25,
  MAX_RESULT_COUNT: 50,

  // Timezone
  DEFAULT_TIMEZONE: "Russian Standard Time",

  // OneDrive constants
  ONEDRIVE_SELECT_FIELDS: 'id,name,size,lastModifiedDateTime,webUrl,folder,file,parentReference',
  ONEDRIVE_UPLOAD_THRESHOLD: 4 * 1024 * 1024, // 4MB - files larger than this need chunked upload

  // Power Automate / Flow constants
  FLOW_API_ENDPOINT: 'https://api.flow.microsoft.com',
  FLOW_SCOPE: 'https://service.flow.microsoft.com/.default',
};
