# tools.js Documentation

## Overview

This file is a central component of the project, defining and managing various tools and functions
that can be used across the application. It includes functionality for interacting with external
services, managing tasks, sending messages, and performing various utility operations.

The file exports an array of tool definitions (`tools`) and a function to handle tool calls
(`handleToolCall`). It integrates with other parts of the project such as search functionality, user
management, task scheduling, and various utility functions.

## Imported Modules and Dependencies

-   `nodemailer`: For sending emails
-   `TelegramBot`: For sending Telegram messages
-   Various custom modules: `search.js`, `youtube.js`, `utils.js`, `scheduler.js`, `email.js`
-   Models: `User.js`

## Exported Objects and Functions

### `tools` Array

An array of tool definitions, each with the following structure:

-   `name`: String identifier for the tool
-   `description`: Brief description of the tool's functionality
-   `input_schema`: JSON schema defining the expected input for the tool

### `handleToolCall(name, args, userId)`

Handles the execution of a specific tool based on its name and provided arguments.

**Parameters:**

-   `name`: String - The name of the tool to execute
-   `args`: Object - Arguments required for the tool execution
-   `userId`: String - ID of the user making the tool call

**Returns:** Promise - Resolves with the result of the tool execution

## Key Functions

### `sendTelegramMessage(chatId, message)`

Sends a message to a Telegram chat.

### `sendEmail(to, subject, content, userId, attachments = [])`

Sends an email using the configured SMTP transporter.

### `getCurrentTimeUTC()`

Returns the current time in UTC format.

### `getLatestNews(lang)`

Fetches and returns the latest news for a given language.

### `searchWebContent(query)`

Performs a web search and returns content from the top results.

## Usage Examples

```javascript
// Example: Sending a Telegram message
await handleToolCall(
    'send_telegram_message',
    {
        chatId: '123456789',
        message: 'Hello from the AI assistant!'
    },
    'user123'
);

// Example: Getting stock price
const stockPrice = await handleToolCall(
    'get_stock_price',
    {
        ticker: 'AAPL'
    },
    'user123'
);

// Example: Scheduling a task
await handleToolCall(
    'schedule_task',
    {
        taskId: 'task123',
        schedule: '0 9 * * *'
    },
    'user123'
);
```

## Project Context

This file plays a crucial role in the project by:

1. Defining a standardized set of tools that can be used across different AI models or interfaces.
2. Providing a centralized way to handle various operations like sending messages, managing tasks,
   and interacting with external services.
3. Integrating with other parts of the project such as user management, task scheduling, and utility
   functions.

It serves as a bridge between the AI's capabilities and the actual execution of tasks in the system.

## Notes

-   The file relies heavily on environment variables for sensitive information (e.g., API keys).
-   It integrates with various custom modules, indicating a modular project structure.
-   The tool definitions follow a consistent schema, making it easy to add new tools or modify
    existing ones.

This documentation provides an overview of the `tools.js` file. For more detailed information on
specific functions or tools, refer to the inline comments and the documentation of the imported
modules.
