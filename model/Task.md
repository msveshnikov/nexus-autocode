# Task Model Documentation

## Overview

This file (`model/Task.js`) defines the Mongoose schema and model for tasks in the project. It
includes schemas for both tasks and subtasks, along with various methods and static functions to
manipulate and query task data.

The Task model is a crucial part of the project's data structure, likely used for managing user
tasks, agent assignments, and workflow processes.

## Schemas

### SubTask Schema

Defines the structure for subtasks within a main task.

Fields:

-   `description` (String, required): Description of the subtask.
-   `status` (String, enum): Current status of the subtask. Options: 'pending', 'in_progress',
    'completed', 'failed'. Default: 'pending'.
-   `assignedAgent` (String): ID or name of the agent assigned to the subtask.
-   `startTime` (Date): When the subtask was started.
-   `endTime` (Date): When the subtask was completed.

### Task Schema

Defines the main structure for tasks.

Fields:

-   `user` (ObjectId, required): Reference to the User model, indicating the task owner.
-   `title` (String, required): Title of the task.
-   `description` (String, required): Detailed description of the task.
-   `status` (String, enum): Current status of the task. Options: 'pending', 'in_progress',
    'completed', 'failed'. Default: 'pending'.
-   `priority` (Number): Priority level of the task. Default: 0.
-   `dueDate` (Date): Deadline for the task.
-   `subTasks` (Array of SubTask): List of subtasks associated with this task.
-   `assignedAgents` (Array of String): List of agent IDs assigned to the task.
-   `tools` (Array of String): List of tools associated with the task.
-   `artifacts` (Array of ObjectId): References to Artifact model, representing task outputs or
    related files.
-   `parentTask` (ObjectId): Reference to another Task, if this is a subtask.
-   `metadata` (Map): Additional key-value pairs for flexible task data storage.
-   `executionLogs` (Array of String): Logs related to task execution.

The schema includes timestamps and indexes for optimized querying.

## Methods

### addSubTask(subTaskData)

Adds a new subtask to the task.

-   Parameters: `subTaskData` (Object) - Data for the new subtask
-   Returns: Promise resolving to the updated task document

### updateStatus(newStatus)

Updates the status of the task.

-   Parameters: `newStatus` (String) - New status value
-   Returns: Promise resolving to the updated task document

### assignAgent(agentId)

Assigns an agent to the task if not already assigned.

-   Parameters: `agentId` (String) - ID of the agent to assign
-   Returns: Promise resolving to the updated task document

### addTool(toolName)

Adds a tool to the task's tool list if not already present.

-   Parameters: `toolName` (String) - Name of the tool to add
-   Returns: Promise resolving to the updated task document

### addArtifact(artifactId)

Adds an artifact reference to the task if not already present.

-   Parameters: `artifactId` (ObjectId) - ID of the artifact to add
-   Returns: Promise resolving to the updated task document

### addExecutionLog(log)

Appends a new execution log entry to the task.

-   Parameters: `log` (String) - Log entry to add
-   Returns: Promise resolving to the updated task document

### setMetadata(key, value)

Sets or updates a metadata key-value pair for the task.

-   Parameters:
    -   `key` (String) - Metadata key
    -   `value` (Any) - Value to set for the key
-   Returns: Promise resolving to the updated task document

## Static Methods

### findPendingTasks(userId)

Finds all pending tasks for a given user, sorted by priority and due date.

-   Parameters: `userId` (ObjectId) - ID of the user
-   Returns: Promise resolving to an array of matching task documents

### findTasksByPriority(userId, minPriority)

Finds tasks for a user with priority greater than or equal to the specified minimum.

-   Parameters:
    -   `userId` (ObjectId) - ID of the user
    -   `minPriority` (Number) - Minimum priority threshold
-   Returns: Promise resolving to an array of matching task documents

### findOverdueTasks(userId)

Finds overdue tasks (due date passed) for a user that are still pending or in progress.

-   Parameters: `userId` (ObjectId) - ID of the user
-   Returns: Promise resolving to an array of matching task documents

## Usage Examples

```javascript
// Create a new task
const newTask = new Task({
    user: userId,
    title: 'Complete Project Proposal',
    description: 'Draft and finalize the project proposal document',
    priority: 2,
    dueDate: new Date('2023-12-31')
});
await newTask.save();

// Add a subtask
await newTask.addSubTask({
    description: 'Research market trends',
    assignedAgent: 'agent123'
});

// Update task status
await newTask.updateStatus('in_progress');

// Assign an agent
await newTask.assignAgent('agent456');

// Find pending tasks for a user
const pendingTasks = await Task.findPendingTasks(userId);

// Find overdue tasks
const overdueTasks = await Task.findOverdueTasks(userId);
```

## Project Context

This Task model is a core component of the project's data layer. It likely interacts with other
models like User and Artifact, and is probably used extensively in task management, scheduling, and
workflow orchestration throughout the application. The model's methods and static functions provide
a rich API for task manipulation and querying, which can be utilized in various parts of the
application logic, including the scheduler, agent assignment systems, and user interfaces for task
management.
