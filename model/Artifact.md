# Artifact Model Documentation

## Overview

The `Artifact.js` file defines the Mongoose schema and model for the Artifact entity in the
application. Artifacts represent various types of content (text, code, image, audio, video, or
other) associated with users and tasks. This model is crucial for storing and managing
user-generated or AI-generated content within the system.

## Schema Definition

The `artifactSchema` defines the structure of an Artifact document in MongoDB:

-   `user`: ObjectId reference to the User model (required)
-   `name`: String (required)
-   `content`: String (required)
-   `type`: String, enum of ['text', 'code', 'image', 'audio', 'video', 'other'] (required)
-   `metadata`: Map of String key-value pairs
-   `tags`: Array of Strings
-   `version`: Number (default: 1)
-   `task`: ObjectId reference to the Task model
-   `subTasks`: Array of ObjectId references to the Task model
-   `executorModel`: String, enum of ['gemini', 'claude', 'gpt', 'together']

The schema includes timestamps for creation and update times.

## Indexes

Two indexes are defined on the schema:

1. A unique compound index on `user` and `name`
2. An index on `tags`

## Methods

### updateContent(newContent)

Updates the content of the artifact and increments the version number.

-   Parameters:
    -   `newContent`: String
-   Returns: Promise resolving to the updated Artifact document

### addTag(tag)

Adds a new tag to the artifact if it doesn't already exist.

-   Parameters:
    -   `tag`: String
-   Returns: Promise resolving to the updated Artifact document

### removeTag(tag)

Removes a specified tag from the artifact.

-   Parameters:
    -   `tag`: String
-   Returns: Promise resolving to the updated Artifact document

### setMetadata(key, value)

Sets a metadata key-value pair for the artifact.

-   Parameters:
    -   `key`: String
    -   `value`: String
-   Returns: Promise resolving to the updated Artifact document

### addSubTask(subTaskId)

Adds a new subtask reference to the artifact if it doesn't already exist.

-   Parameters:
    -   `subTaskId`: ObjectId
-   Returns: Promise resolving to the updated Artifact document

### setExecutorModel(model)

Sets the executor model for the artifact.

-   Parameters:
    -   `model`: String (must be one of ['gemini', 'claude', 'gpt', 'together'])
-   Returns: Promise resolving to the updated Artifact document

## Static Methods

### findByUserAndType(userId, type)

Finds artifacts by user ID and type.

-   Parameters:
    -   `userId`: ObjectId
    -   `type`: String
-   Returns: Query object

### findByUserAndTags(userId, tags)

Finds artifacts by user ID and an array of tags (all tags must match).

-   Parameters:
    -   `userId`: ObjectId
    -   `tags`: Array of Strings
-   Returns: Query object

### findByTask(taskId)

Finds artifacts associated with a specific task.

-   Parameters:
    -   `taskId`: ObjectId
-   Returns: Query object

## Usage Examples

```javascript
// Create a new artifact
const newArtifact = new Artifact({
    user: userId,
    name: 'Example Artifact',
    content: 'This is the content of the artifact.',
    type: 'text'
});
await newArtifact.save();

// Update content
await newArtifact.updateContent('Updated content');

// Add a tag
await newArtifact.addTag('important');

// Set metadata
await newArtifact.setMetadata('source', 'user input');

// Find artifacts by user and type
const textArtifacts = await Artifact.findByUserAndType(userId, 'text');

// Find artifacts by user and tags
const taggedArtifacts = await Artifact.findByUserAndTags(userId, ['important', 'urgent']);
```

## Role in Project Structure

The `Artifact.js` file is located in the `model` directory, which suggests it's part of the data
layer of the application. It works in conjunction with other models like `User.js` and `Task.js` to
define the core data structures of the system. The Artifact model is likely used throughout the
application, especially in components dealing with content management, task execution, and user
interactions.

This model supports various AI-related features, as indicated by the `executorModel` field, which
allows artifacts to be associated with different AI models (Gemini, Claude, GPT, or Together). This
suggests that the application involves AI-generated content or AI-assisted tasks.

The Artifact model's flexibility in content types and metadata makes it suitable for a wide range of
applications, from document management to multimedia content handling within an AI-integrated
environment.
