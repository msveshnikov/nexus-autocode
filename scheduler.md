# Scheduler Module Documentation

## Overview

The `scheduler.js` file is a core component of the task management system. It handles task
scheduling, execution, and various automated processes. This module integrates with other parts of
the system, such as task models, user models, and various AI services for task execution.

## Key Features

-   Task scheduling using cron jobs
-   Task execution with support for multiple AI models
-   Subtask creation
-   Task queue processing
-   Overdue task handling
-   Daily report generation
-   Parallel task execution

## Functions

### scheduleTask(taskId, schedule)

Schedules a task to run at specified intervals.

**Parameters:**

-   `taskId` (String): The ID of the task to schedule
-   `schedule` (String): A cron expression defining the schedule

**Returns:** A promise that resolves to a string confirming the scheduling

**Usage Example:**

```javascript
const result = await scheduleTask('123456', '0 9 * * *');
console.log(result); // Task "Daily Report" scheduled to run 0 9 * * *
```

### stopScheduledTask(taskId)

Stops a previously scheduled task.

**Parameters:**

-   `taskId` (String): The ID of the scheduled task to stop

**Returns:** A promise that resolves to a string indicating the result

**Usage Example:**

```javascript
const result = await stopScheduledTask('123456');
console.log(result); // Scheduled task stopped
```

### getScheduledTasks(userId)

Retrieves all scheduled tasks for a specific user.

**Parameters:**

-   `userId` (String): The ID of the user

**Returns:** A promise that resolves to an array of scheduled Task objects

**Usage Example:**

```javascript
const scheduledTasks = await getScheduledTasks('user123');
console.log(scheduledTasks);
```

### createSubTask(parentTaskId, subTaskData)

Creates a subtask for an existing task.

**Parameters:**

-   `parentTaskId` (String): The ID of the parent task
-   `subTaskData` (Object): Data for the new subtask

**Returns:** A promise that resolves to the created subtask object

**Usage Example:**

```javascript
const subTask = await createSubTask('parentTask123', {
    title: 'Subtask 1',
    description: 'Do something'
});
console.log(subTask);
```

### executeTask(task)

Executes a given task, including AI model interaction and tool usage.

**Parameters:**

-   `task` (Object): The task object to execute

**Returns:** A promise that resolves to the task execution result

**Usage Example:**

```javascript
const result = await executeTask(taskObject);
console.log(result);
```

### processTaskQueue()

Processes all pending tasks in the queue.

**Returns:** A promise that resolves when all pending tasks have been processed

**Usage Example:**

```javascript
await processTaskQueue();
```

### initializeScheduler()

Initializes the scheduler with predefined cron jobs for task queue processing, overdue task
handling, and daily report generation.

**Usage Example:**

```javascript
initializeScheduler();
```

### processOverdueTasks()

Increases the priority of overdue tasks.

**Returns:** A promise that resolves when all overdue tasks have been processed

**Usage Example:**

```javascript
await processOverdueTasks();
```

### generateDailyReport()

Generates and sends daily reports to all users.

**Returns:** A promise that resolves when all reports have been generated and sent

**Usage Example:**

```javascript
await generateDailyReport();
```

### parallelTaskExecution()

Executes multiple tasks in parallel.

**Returns:** A promise that resolves when all parallel tasks have been executed

**Usage Example:**

```javascript
await parallelTaskExecution();
```

## Helper Functions

### extractImagePrompt(text)

Extracts an image generation prompt from the given text.

**Parameters:**

-   `text` (String): The text to extract the image prompt from

**Returns:** The extracted image prompt or null if not found

## Project Context

This scheduler module is a crucial part of the task management system. It interacts with:

-   Task and User models (`./model/Task.js` and `./model/User.js`)
-   Email sending functionality (`./tools.js`)
-   AI services (`./openai.js`, `./gemini.js`, `./claude.js`, `./together.js`)
-   Utility functions (`./utils.js`)

The scheduler ensures that tasks are executed on time, handles overdue tasks, and generates reports.
It's designed to work with various AI models and includes tools like Python script execution and
image generation.

## Notes

-   The module uses the `node-cron` library for scheduling tasks.
-   It supports multiple AI models (GPT, Gemini, Claude, Together) based on user preferences.
-   The module includes error handling and logging for task execution.
-   It integrates with email functionality to send task results and daily reports to users.

This documentation provides a comprehensive overview of the `scheduler.js` module, its functions,
and its role in the larger project structure. Developers working on this project should refer to
this documentation for understanding and utilizing the scheduler functionality.
