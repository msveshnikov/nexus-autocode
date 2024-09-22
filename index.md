# Nexus AI Assistant Backend Documentation

## Overview

This `index.js` file serves as the main entry point for the Nexus AI Assistant backend application.
It sets up an Express server with various middleware and routes to handle user interactions,
authentication, and AI model interactions. The application integrates multiple AI models, including
Gemini, Claude, GPT, and Together AI, and provides features such as user management, artifact
handling, and scheduled actions.

## Key Components

1. Server Setup
2. Middleware Configuration
3. Database Connection
4. API Routes
5. Authentication
6. AI Model Interactions
7. Artifact Management
8. User Information Management
9. Scheduled Actions
10. WebSocket Integration

## Detailed Documentation

### Imports and Configuration

```javascript
import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
// ... other imports
```

The file imports necessary modules and configures environment variables using `dotenv`.

### Constants and Configuration

```javascript
const ALLOWED_ORIGIN = [process.env.FRONTEND_URL, 'http://localhost:3000'];
export const MAX_SEARCH_RESULT_LENGTH = 7000;
export const MAX_CONTEXT_LENGTH = 20000;
export const MAX_CHAT_HISTORY_LENGTH = 40;
export const contentFolder = './content';
```

These constants define various limitations and configurations for the application.

### Server and Middleware Setup

```javascript
const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: ALLOWED_ORIGIN,
        methods: ['GET', 'POST']
    }
});

app.set('trust proxy', 1);
app.use(express.json({ limit: '100mb' }));
app.use(cors({ origin: ALLOWED_ORIGIN }));
app.use(morgan('dev'));
```

This section sets up the Express server, configures CORS, and adds necessary middleware.

### Rate Limiting

```javascript
const limiter = rateLimit({
    windowMs: 60 * 1000,
    limit: 30,
    standardHeaders: 'draft-7',
    legacyHeaders: false
});

app.use(limiter);
```

Implements rate limiting to prevent abuse of the API.

### Database Connection

```javascript
mongoose
    .connect(MONGODB_URI)
    .then(() => console.log('🚀 MongoDB connected'))
    .catch((err) => console.error('MongoDB connection error:', err));
```

Establishes a connection to the MongoDB database.

### Main Interaction Route

```javascript
app.post('/interact', verifyToken, async (req, res) => {
    // ... implementation
});
```

This route handles the main interaction with the AI assistant. It processes user input, interacts
with the selected AI model, and returns the response.

### Artifact Management Routes

```javascript
app.get('/api/artifacts', verifyToken, async (req, res) => {
    // ... implementation
});

app.post('/api/artifacts', verifyToken, async (req, res) => {
    // ... implementation
});

app.put('/api/artifacts/:id', verifyToken, async (req, res) => {
    // ... implementation
});

app.delete('/api/artifacts/:id', verifyToken, async (req, res) => {
    // ... implementation
});
```

These routes handle CRUD operations for user artifacts.

### User Information Routes

```javascript
app.get('/api/user/info', verifyToken, async (req, res) => {
    // ... implementation
});

app.put('/api/user/info', verifyToken, async (req, res) => {
    // ... implementation
});
```

These routes manage user information retrieval and updates.

### Scheduled Action Routes

```javascript
app.post('/api/schedule', verifyToken, async (req, res) => {
    // ... implementation
});

app.delete('/api/schedule', verifyToken, async (req, res) => {
    // ... implementation
});
```

These routes handle scheduling and canceling of actions.

### Tool Execution Route

```javascript
app.post('/api/execute-tool', verifyToken, async (req, res) => {
    // ... implementation
});
```

This route handles the execution of various tools.

### Authentication Routes

```javascript
app.post('/api/auth/register', async (req, res) => {
    // ... implementation
});

app.post('/api/auth/login', async (req, res) => {
    // ... implementation
});

app.post('/api/auth/reset-password', async (req, res) => {
    // ... implementation
});

app.post('/api/auth/complete-reset', async (req, res) => {
    // ... implementation
});
```

These routes handle user registration, login, and password reset functionality.

### Static File Serving and View Routes

```javascript
app.use(express.static(path.join(__dirname, 'public')));
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.get('/', (req, res) => {
    res.render('index');
});

// ... other view routes
```

These routes serve static files and render views for the application.

### WebSocket Integration

```javascript
io.on('connection', (socket) => {
    // ... WebSocket event handlers
});
```

Sets up WebSocket connections for real-time communication.

### Server Start

```javascript
server.listen(3000, () => {
    console.log(`🚀 Server started on port 3000`);
});
```

Starts the server on port 3000.

### Helper Functions

```javascript
function buildContextPrompt(instructions, chatHistory, country, lang, user, userInput, model) {
    // ... implementation
}

async function getModelResponse(
    model,
    contextPrompt,
    temperature,
    fileBytesBase64,
    fileType,
    userId,
    webTools
) {
    // ... implementation
}

async function processImageRequest(userInput, textResponse) {
    // ... implementation
}
```

These helper functions assist in building context prompts, getting model responses, and processing
image requests.

## Usage

To use this backend:

1. Ensure all dependencies are installed (`npm install`).
2. Set up environment variables in a `.env` file.
3. Start the server using `node index.js` or `npm start`.

The server will start on port 3000 and be ready to handle requests from the frontend application.

## Project Structure

This `index.js` file is the main entry point for the backend application. It integrates with other
files in the project:

-   `auth.js`: Handles authentication logic
-   `model/*.js`: Defines database models
-   `gemini.js`, `claude.js`, `openai.js`, `together.js`: Interact with different AI models
-   `image.js`: Handles image generation
-   `scheduler.js`: Manages scheduled actions
-   `tools.js`: Implements various tools
-   `utils.js`: Contains utility functions

The `views` directory contains EJS templates for rendering pages, while the `public` directory (not
shown in the structure) likely contains static assets.

This file orchestrates the entire backend, bringing together all the components to create a
comprehensive AI assistant platform.
