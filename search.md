# search.js Documentation

## Overview

This file contains functions for performing web searches, fetching page content, and retrieving
Google News articles. It's part of a larger project that likely involves web scraping and data
retrieval for various purposes.

The file uses the `cheerio` library for parsing HTML and provides functionality to interact with
Google Search and Google News.

## Imported Modules

-   `load` from 'cheerio': Used for parsing HTML content.
-   `MAX_SEARCH_RESULT_LENGTH` from './index.js': Defines the maximum length for search results.

## Constants

### `userAgents`

An array of user agent strings used to randomize requests and avoid detection as a bot.

### `MAX_FILE_SIZE`

Maximum file size (1MB) for fetched content.

### `TIMEOUT`

Timeout duration (10 seconds) for fetch requests.

## Functions

### `fetchSearchResults(query)`

Performs a Google search and retrieves the search results.

#### Parameters

-   `query` (string): The search query.

#### Returns

-   An array of objects containing search results, each with `title`, `link`, and `snippet`
    properties.
-   `null` if an error occurs.

#### Usage Example

```javascript
const results = await fetchSearchResults('artificial intelligence');
console.log(results);
```

### `fetchPageContent(url)`

Fetches the content of a webpage, with various checks and limitations.

#### Parameters

-   `url` (string): The URL of the webpage to fetch.

#### Returns

-   A string containing the cleaned text content of the webpage.
-   `null` if the content is not suitable (e.g., PDF, audio, video, image) or if an error occurs.

#### Usage Example

```javascript
const content = await fetchPageContent('https://example.com');
console.log(content);
```

### `googleNews(lang)`

Retrieves recent news articles from Google News for a specified language.

#### Parameters

-   `lang` (string): The language code for the news articles.

#### Returns

-   An array of objects containing news articles, each with `title`, `link`, `pubDate`,
    `description`, and `source` properties.

#### Usage Example

```javascript
const newsArticles = await googleNews('en');
console.log(newsArticles);
```

## Error Handling

All functions include try-catch blocks to handle potential errors. In case of errors, they typically
return `null` or log the error to the console.

## Project Context

This file plays a crucial role in the project's data retrieval capabilities. It's likely used in
conjunction with other files like `index.js`, `tools.js`, and possibly AI-related files
(`claude.js`, `gemini.js`, `openai.js`) to provide search and news functionalities to the
application.

The functions in this file may be utilized by the main application logic to gather information from
the web, which could then be processed or presented to users through the views (`views/app.ejs`,
`views/index.ejs`) or used in scheduled tasks (`scheduler.js`).

## Notes

-   The code uses random user agents to mimic different browsers and avoid detection as a bot.
-   There are checks in place to avoid processing large files or unsupported content types.
-   The `fetchPageContent` function has a timeout mechanism to prevent hanging on slow-loading
    pages.
-   The Google News function parses RSS feeds to retrieve recent news articles.

This file is essential for any feature in the project that requires web search capabilities or
access to recent news articles.
