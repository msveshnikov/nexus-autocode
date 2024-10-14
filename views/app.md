# Nexus Dashboard (views/app.ejs)

## Overview

This file contains the HTML structure and client-side JavaScript for the Nexus Dashboard, which is
the main user interface for the Nexus project. It's an EJS template that renders a dynamic,
interactive dashboard for users to manage tasks, view progress, and interact with various AI models.

## File Structure

-   **HTML Structure**: Defines the layout of the dashboard, including sections for authentication,
    task initiation, progress tracking, sub-tasks, logs, statistics, and artifacts.
-   **CSS Styles**: Includes custom styles and utilizes Tailwind CSS for responsive design.
-   **JavaScript**: Contains client-side logic for user authentication, task management, real-time
    updates, and data visualization.

## Key Components

### External Dependencies

-   Tailwind CSS for styling
-   Axios for HTTP requests
-   Chart.js for data visualization
-   Socket.io for real-time communication

### Main Sections

1. **Authentication**: Handles user login and signup.
2. **Task Initiation**: Allows users to start new tasks and select AI models.
3. **Task Progress**: Displays the current task's progress.
4. **Sub-Tasks**: Lists sub-tasks associated with the main task.
5. **Sub-Agent Logs**: Shows logs from sub-agents working on the task.
6. **Statistics**: Visualizes user statistics using Chart.js.
7. **Artifacts**: Displays a list of artifacts generated during task execution.

## JavaScript Functions

### `login()`

Authenticates the user and retrieves a JWT token.

### `signup()`

Registers a new user and retrieves a JWT token.

### `showDashboard()`

Reveals the dashboard components after successful authentication.

### `initializeSocket()`

Sets up Socket.io for real-time updates.

### `updateTaskProgress(progress)`

Updates the task progress display.

### `updateSubTasks(subTasks)`

Refreshes the list of sub-tasks.

### `addSubAgentLog(log)`

Adds a new log entry to the sub-agent logs section.

### `fetchUserInfo()`

Retrieves user information and updates the statistics chart.

### `updateStatisticsChart(userInfo)`

Creates or updates the Chart.js visualization of user statistics.

### `fetchArtifacts()`

Retrieves and displays the list of artifacts.

### `updateArtifactList(artifacts)`

Updates the displayed list of artifacts.

## Usage

This file is served by the Express.js server when a user accesses the dashboard. It handles:

1. User authentication
2. Task creation and management
3. Real-time updates on task progress
4. Visualization of user statistics
5. Display of task-related artifacts

The dashboard interacts with various backend APIs (e.g., `/api/execute-tool`, `/api/user/info`,
`/api/artifacts`) to fetch and update data.

## Integration with Project Structure

-   Utilizes the authentication system defined in `auth.js`
-   Interacts with AI models specified in `claude.js`, `gemini.js`, `openai.js`, and `together.js`
-   Connects to the task execution system, likely implemented in `tools.js`
-   Displays artifacts that are probably managed by the `Artifact.js` model
-   Shows user statistics, potentially using data from the `User.js` model

## Security Considerations

-   Uses JWT tokens for authentication, stored in localStorage
-   Implements client-side routes protection based on authentication status

## Future Improvements

-   Implement refresh token mechanism for enhanced security
-   Add error handling and user feedback for failed operations
-   Implement pagination for logs and artifacts if the lists grow large

This dashboard serves as the central interface for users to interact with the Nexus system,
providing a comprehensive view of AI-driven task execution and management.
