# image.js Documentation

## Overview

This module is responsible for generating and handling images based on text prompts. It integrates
with various AI models for text translation and uses the Stability AI API for image generation. The
module also handles saving generated images as artifacts.

## Dependencies

-   `claude.js`, `gemini.js`, `openai.js`, `together.js`: For text translation using different AI
    models
-   `dotenv`: For environment variable management
-   `node-fetch`: For making HTTP requests
-   `Artifact.js`: For saving generated images as artifacts

## Main Functions

### getImage(prompt, avatar, userId, model)

Generates an image based on a given text prompt.

#### Parameters:

-   `prompt` (string): The text prompt for image generation
-   `avatar` (boolean): Indicates if the image is for an avatar
-   `userId` (string): The ID of the user generating the image
-   `model` (string): The AI model to use for text translation

#### Returns:

-   Promise<string>: Base64 encoded image data

#### Process:

1. Truncates the prompt to 700 characters
2. Translates the prompt if necessary
3. Generates the image using Stability AI
4. Saves the generated image as an artifact
5. Returns the base64 encoded image data

### translatePrompt(prompt, avatar, model)

Translates the given prompt to English if necessary.

#### Parameters:

-   `prompt` (string): The original text prompt
-   `avatar` (boolean): Indicates if the image is for an avatar
-   `model` (string): The AI model to use for translation

#### Returns:

-   Promise<string>: Translated prompt or original prompt if translation fails

### getStabilityImage(prompt, avatar)

Generates an image using the Stability AI API.

#### Parameters:

-   `prompt` (string): The text prompt for image generation
-   `avatar` (boolean): Indicates if the image is for an avatar

#### Returns:

-   Promise<string>: Base64 encoded image data

### getRawImageJson(prompt, avatar)

Makes a request to the Stability AI API and returns the raw JSON response.

#### Parameters:

-   `prompt` (string): The text prompt for image generation
-   `avatar` (boolean): Indicates if the image is for an avatar

#### Returns:

-   Promise<Object>: Raw JSON response from Stability AI API

### saveImageArtifact(imageBase64, prompt, userId)

Saves the generated image as an artifact in the database.

#### Parameters:

-   `imageBase64` (string): Base64 encoded image data
-   `prompt` (string): The original text prompt
-   `userId` (string): The ID of the user who generated the image

## Usage Example

```javascript
import { getImage } from './image.js';

const prompt = 'A beautiful sunset over the ocean';
const avatar = false;
const userId = 'user123';

try {
    const imageBase64 = await getImage(prompt, avatar, userId);
    console.log('Generated image:', imageBase64.substring(0, 50) + '...');
} catch (error) {
    console.error('Error generating image:', error);
}
```

## Notes

-   This module plays a crucial role in the project's image generation capabilities.
-   It integrates with various AI models for text translation, allowing for multi-language support.
-   The generated images are saved as artifacts, which can be useful for tracking and future
    reference.
-   The module uses environment variables for API keys, ensuring security of sensitive information.

## Project Context

Within the project structure, `image.js` is part of the root directory, indicating its importance as
a core functionality. It interacts with other AI model-specific files (`claude.js`, `gemini.js`,
`openai.js`, `together.js`) and the `model/Artifact.js` for data persistence. This module is likely
used by other parts of the application that require image generation capabilities.
