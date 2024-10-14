# utils.js Documentation

## Overview

`utils.js` is a core utility file in the Nexus project, providing a wide range of helper functions
and services. It handles email sending, file processing, external API interactions, task management,
and various other utility operations. This file integrates with multiple models and services across
the project.

## Dependencies

-   `path`, `fs`: Node.js built-in modules for file system operations
-   `nodemailer`, `nodemailer-express-handlebars`: For email sending and templating
-   `dotenv`: For environment variable management
-   `axios`: For making HTTP requests
-   User, Task, Artifact models: Custom MongoDB models
-   Various project-specific modules (search.js, image.js, etc.)

## Email Configuration

The file sets up a nodemailer transporter for sending emails via Gmail, using environment variables
for authentication.

## Functions

### sendEmail(options)

Sends an email using the configured transporter.

**Parameters:**

-   `options`: Object containing email details (to, from, subject, template, context)

**Returns:** Promise resolving to the email send response

### sendWelcomeEmail(user)

Sends a welcome email to a new user.

**Parameters:**

-   `user`: User object containing email address

**Returns:** Promise resolving to the email send response

### sendResetEmail(user, resetUrl)

Sends a password reset email to a user.

**Parameters:**

-   `user`: User object containing email address
-   `resetUrl`: URL for password reset

**Returns:** Promise resolving to the email send response

### processFile(fileBytesBase64, fileType, userInput)

Processes various file types (PDF, Word, Excel) and extracts text content.

**Parameters:**

-   `fileBytesBase64`: Base64 encoded file content
-   `fileType`: MIME type of the file
-   `userInput`: Additional user input text

**Returns:** Promise resolving to the extracted text content

### processUrlContent(userInput)

Extracts content from a URL present in the user input.

**Parameters:**

-   `userInput`: User input text potentially containing a URL

**Returns:** Promise resolving to the processed text with URL content

### executePython(code)

Executes Python code on a separate Python server.

**Parameters:**

-   `code`: Python code to execute

**Returns:** Promise resolving to the execution output and any generated files

### getStockPrice(ticker)

Fetches stock prices for a given ticker symbol.

**Parameters:**

-   `ticker`: Stock ticker symbol

**Returns:** Promise resolving to a string with last week's stock prices

### getFxRate(baseCurrency, quoteCurrency)

Fetches current exchange rate for a currency pair.

**Parameters:**

-   `baseCurrency`: Base currency code
-   `quoteCurrency`: Quote currency code

**Returns:** Promise resolving to a string with the current exchange rate

### saveArtifact(artifactName, content, type, userId)

Saves or updates an artifact in the database.

**Parameters:**

-   `artifactName`: Name of the artifact
-   `content`: Content of the artifact
-   `type`: Type of the artifact
-   `userId`: ID of the user owning the artifact

**Returns:** Promise resolving to a success message

### generateImage(description)

Generates an image based on a text description.

**Parameters:**

-   `description`: Text description of the image to generate

**Returns:** Promise resolving to a string with the generated image URL

### initiateTask(taskDescription, userId)

Creates a new task for a user.

**Parameters:**

-   `taskDescription`: Description of the task
-   `userId`: ID of the user creating the task

**Returns:** Promise resolving to a success message

### updateTaskStatus(taskId, newStatus)

Updates the status of a task.

**Parameters:**

-   `taskId`: ID of the task to update
-   `newStatus`: New status for the task

**Returns:** Promise resolving to a success message

### addSubTask(parentTaskId, subTaskDescription)

Adds a sub-task to an existing task.

**Parameters:**

-   `parentTaskId`: ID of the parent task
-   `subTaskDescription`: Description of the sub-task

**Returns:** Promise resolving to a success message

### assignAgentToTask(taskId, agentId)

Assigns an agent to a task.

**Parameters:**

-   `taskId`: ID of the task
-   `agentId`: ID of the agent to assign

**Returns:** Promise resolving to a success message

### addToolToTask(taskId, toolName)

Adds a tool to a task.

**Parameters:**

-   `taskId`: ID of the task
-   `toolName`: Name of the tool to add

**Returns:** Promise resolving to a success message

### addArtifactToTask(taskId, artifactId)

Associates an artifact with a task.

**Parameters:**

-   `taskId`: ID of the task
-   `artifactId`: ID of the artifact to add

**Returns:** Promise resolving to a success message

### addExecutionLogToTask(taskId, log)

Adds an execution log entry to a task.

**Parameters:**

-   `taskId`: ID of the task
-   `log`: Log entry to add

**Returns:** Promise resolving to a success message

### setTaskMetadata(taskId, key, value)

Sets metadata for a task.

**Parameters:**

-   `taskId`: ID of the task
-   `key`: Metadata key
-   `value`: Metadata value

**Returns:** Promise resolving to a success message

### findPendingTasks(userId)

Finds pending tasks for a user.

**Parameters:**

-   `userId`: ID of the user

**Returns:** Promise resolving to an array of pending tasks

### findTasksByPriority(userId, minPriority)

Finds tasks for a user with a minimum priority level.

**Parameters:**

-   `userId`: ID of the user
-   `minPriority`: Minimum priority level

**Returns:** Promise resolving to an array of tasks

### findOverdueTasks(userId)

Finds overdue tasks for a user.

**Parameters:**

-   `userId`: ID of the user

**Returns:** Promise resolving to an array of overdue tasks

### findTasksForParallelExecution(userId)

Finds tasks suitable for parallel execution for a user.

**Parameters:**

-   `userId`: ID of the user

**Returns:** Promise resolving to an array of tasks

### findCompletedTasksInDateRange(userId, startDate, endDate)

Finds completed tasks for a user within a specified date range.

**Parameters:**

-   `userId`: ID of the user
-   `startDate`: Start date of the range
-   `endDate`: End date of the range

**Returns:** Promise resolving to an array of completed tasks

## Usage Examples

```javascript
// Sending a welcome email
const user = { email: 'newuser@example.com' };
await sendWelcomeEmail(user);

// Processing a PDF file
const fileContent = 'base64encodedcontent';
const extractedText = await processFile(fileContent, 'pdf', 'Additional user input');

// Fetching stock price
const stockInfo = await getStockPrice('AAPL');

// Initiating a task
const taskDescription = 'Analyze market trends';
const userId = 'user123';
await initiateTask(taskDescription, userId);

// Finding overdue tasks
const overdueTasks = await findOverdueTasks(userId);
```

## Notes

-   This file is central to many operations in the Nexus project, handling various utility functions
    and integrating with multiple services.
-   Error handling is implemented for most functions, with errors being logged to the console.
-   The file interacts with external APIs (AlphaVantage for financial data, custom Python server for
    code execution) and should be configured with appropriate API keys and endpoints.
-   Many functions are asynchronous and return Promises, reflecting the asynchronous nature of
    database operations and external API calls.
