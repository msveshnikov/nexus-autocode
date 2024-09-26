# Nexus - Agentic AI Framework for Complex Task Solving

## Project Overview

Nexus is an advanced AI framework designed for solving complex tasks using various tools and
external connectors. It leverages multi-agent collaboration, dynamic tool selection, and adaptive
learning capabilities to provide a powerful and flexible solution for a wide range of AI-driven
applications.

### Key Features

-   Multi-agent collaboration
-   Dynamic tool selection and utilization
-   External API integration
-   Task decomposition and planning
-   Adaptive learning capabilities
-   Real-time decision making
-   Cross-domain knowledge transfer
-   RAG for knowledge management
-   Explainable AI outputs
-   Artifact accumulation from work results
-   Web UI via ExpressJS for task initiation, progress tracking, and statistics

## Architecture

Nexus is built on a modular, microservices-based architecture to ensure scalability, flexibility,
and ease of maintenance. The key components of the architecture include:

1. **Core AI Engine**: Integrates multiple AI providers (OpenAI, Anthropic, Google, Together AI) for
   diverse model capabilities.
2. **Tool Integration Layer**: Manages a wide array of tools and external connectors.
3. **Task Management System**: Handles task decomposition, scheduling, and execution.
4. **Knowledge Management**: Implements RAG (Retrieval-Augmented Generation) for efficient
   information retrieval and context management.
5. **Web Interface**: Provides a user-friendly dashboard for system interaction and monitoring.
6. **Security Layer**: Ensures data protection and user privacy.
7. **Extensibility Framework**: Allows for easy addition of new tools, models, and capabilities.

### Module Interactions

1. **AI Models <-> Tool Integration**: AI models dynamically select and utilize appropriate tools
   based on task requirements.
2. **Task Management <-> AI Models**: The task manager coordinates with AI models for task
   decomposition and execution.
3. **Knowledge Management <-> AI Models**: RAG system provides relevant context to AI models for
   improved decision-making.
4. **Web Interface <-> Core Components**: User interactions are processed through the web interface
   and distributed to relevant system components.
5. **Security Layer**: Oversees all interactions to ensure data protection and access control.

## Installation and Setup

1. Clone the repository:

    ```
    git clone https://github.com/your-repo/nexus.git
    cd nexus
    ```

2. Install dependencies:

    ```
    npm install
    ```

3. Set up environment variables: Create a `.env` file in the root directory and add the following
   variables:

    ```
    GOOGLE_KEY=your_google_api_key
    GOOGLE_CLIENT_ID=your_google_client_id
    STABILITY_KEY=your_stability_ai_key
    CLAUDE_KEY=your_anthropic_claude_key
    JWT_TOKEN=your_jwt_secret
    YAHOO_FINANCE_API_KEY=your_yahoo_finance_api_key
    TELEGRAM_KEY=your_telegram_bot_key
    EMAIL=your_gmail_address
    EMAIL_PASSWORD=your_gmail_password
    TOGETHER_KEY=your_together_ai_key
    OPENAI_KEY=your_openai_api_key
    GEMINI_KEY=your_google_gemini_key
    ```

4. Start the application:

    ```
    npm start
    ```

5. Access the web dashboard at `http://localhost:3000/app`

## Usage Instructions

1. **User Registration/Login**: Create an account or log in through the web interface.
2. **Task Initiation**: Use the dashboard to submit new tasks or queries.
3. **Monitoring Progress**: Track task progress and view results in real-time through the web
   interface.
4. **Tool Management**: Administrators can add or modify available tools through the configuration
   interface.
5. **Analytics**: View usage statistics and performance metrics in the dashboard.

## Development and Extensibility

### Adding New Tools

1. Define the tool in `tools.js`:

    ```javascript
    {
      name: 'new_tool_name',
      description: 'Description of the new tool',
      input_schema: {
        // Define input parameters
      }
    }
    ```

2. Implement the tool's functionality in the `handleToolCall` function in `tools.js`.

### Integrating New AI Models

1. Create a new file (e.g., `newmodel.js`) in the project root.
2. Implement the necessary functions to interact with the new AI provider's API.
3. Update `index.js` to include the new model in the `getModelResponse` function.

## Security Considerations

-   Implement proper input validation and sanitization throughout the application.
-   Regularly update dependencies to patch security vulnerabilities.
-   Use environment variables for sensitive information and API keys.
-   Implement rate limiting to prevent abuse.
-   Regularly audit the codebase for security issues.

## Deployment

The project includes Docker support for easy deployment:

1. Build the Docker image:

    ```
    docker build -t nexus-backend .
    ```

2. Run the container:
    ```
    docker run -p 3000:3000 --env-file .env nexus-backend
    ```

For production deployment, consider using Docker Compose with the provided `docker-compose.yml`
file, which includes services for the backend, MongoDB, and a Python shell for extended
functionality.

## Contributing

Contributions to Nexus are welcome! Please follow these steps:

1. Fork the repository
2. Create a new branch for your feature
3. Implement your changes
4. Write tests for new functionality
5. Submit a pull request with a clear description of your changes

## License

This project is licensed under the MIT License. See the LICENSE file for details.

---

This documentation provides a comprehensive overview of the Nexus project, its architecture, setup
instructions, and guidelines for usage and development. As the project evolves, be sure to keep this
documentation updated to reflect any significant changes or new features.
