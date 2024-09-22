# tools.js Documentation

## Overview

The `tools.js` file is a central component of the project, defining and implementing various tools
and functionalities that can be used throughout the application. It integrates with external APIs,
handles user interactions, and provides utility functions for tasks such as sending emails,
generating images, and managing user data.

## Imports

The file imports various dependencies and modules:

-   External libraries: `nodemailer`, `TelegramBot`, `ical`, `axios`
-   Internal modules: `search.js`, `User.js`, `Artifact.js`, `scheduler.js`, `index.js`,
    `youtube.js`, `email.js`, `image.js`, `utils.js`

## Constants

-   `bot`: An instance of TelegramBot for sending messages.
-   `transporter`: A nodemailer transporter for sending emails.

## Main Exports

### `tools` Array

An array of tool definitions, each containing:

-   `name`: The tool's identifier
-   `description`: A brief description of the tool's functionality
-   `input_schema`: Defines the expected input structure for the tool

### `handleToolCall` Function

```javascript
async function handleToolCall(name, args, userId)
```

This function dispatches tool calls to their respective implementations based on the tool name.

**Parameters:**

-   `name`: The name of the tool to be called
-   `args`: Arguments for the tool
-   `userId`: The ID of the user making the call

**Returns:** The result of the tool execution

## Tool Implementations

The file contains implementations for various tools, including:

1. `getWeather`: Fetches weather data for a given location
2. `getStockPrice`: Retrieves stock price information
3. `getFxRate`: Gets foreign exchange rates
4. `sendTelegramMessage`: Sends a message via Telegram
5. `sendEmail`: Sends an email
6. `getCurrentTimeUTC`: Returns the current UTC time
7. `getLatestNews`: Fetches the latest news articles
8. `searchWebContent`: Performs a web search and fetches content
9. `persistUserInfo`: Saves user information
10. `removeUserInfo`: Removes user information and artifacts
11. `addCalendarEvent`: Adds an event to the user's calendar
12. `getUserSubscriptionInfo`: Retrieves user subscription details
13. `awardAchievement`: Awards an achievement to a user
14. `sendUserFeedback`: Sends user feedback to developers
15. `saveArtifact`: Saves or updates an artifact
16. `generateImage`: Generates an image based on a description
17. `initiateTask`: Initiates a new task for a user

## Usage Example

```javascript
import { handleToolCall } from './tools.js';

// Example: Get weather information
const weatherResult = await handleToolCall('get_weather', { location: 'New York, NY' }, 'user123');
console.log(weatherResult);

// Example: Send an email
const emailResult = await handleToolCall(
    'send_email',
    {
        to: 'user@example.com',
        subject: 'Test Email',
        content: 'This is a test email'
    },
    'user123'
);
console.log(emailResult);
```

## Project Context

This file plays a crucial role in the project by:

1. Defining a set of tools that can be used across the application
2. Providing a unified interface for calling these tools
3. Integrating with various external services and APIs
4. Handling user-related operations and data management

It interacts closely with other modules like `User.js`, `Artifact.js`, and various API-specific
files to provide a comprehensive set of functionalities for the application.
