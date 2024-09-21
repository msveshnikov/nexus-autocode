import nodemailer from 'nodemailer';
import fs from 'fs';
import path from 'path';
import { fetchPageContent, fetchSearchResults, googleNews } from './search.js';
import { User, addUserCoins } from './model/User.js';
import { Artifact } from './model/Artifact.js';
import { scheduleAction, stopScheduledAction } from './scheduler.js';
import { MAX_SEARCH_RESULT_LENGTH, contentFolder, toolsUsed } from './index.js';
import { summarizeYouTubeVideo } from './youtube.js';
import TelegramBot from 'node-telegram-bot-api';
import ical from 'ical-generator';
import { emailSignature } from './email.js';

const bot = new TelegramBot(process.env.TELEGRAM_KEY);
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL,
        pass: process.env.EMAIL_PASSWORD
    }
});

export const tools = [
    {
        name: 'get_weather',
        description: 'Get the current weather and forecast in a given location.',
        input_schema: {
            type: 'object',
            properties: {
                location: {
                    type: 'string',
                    description: 'The city and state/country, e.g. San Francisco, CA'
                }
            },
            required: ['location']
        }
    },
    {
        name: 'get_stock_price',
        description: "Retrieves the last week's stock price for a given ticker symbol.",
        input_schema: {
            type: 'object',
            properties: {
                ticker: {
                    type: 'string',
                    description: "The ticker symbol of the stock (e.g. 'AAPL')"
                }
            },
            required: ['ticker']
        }
    },
    {
        name: 'get_fx_rate',
        description: 'Get the current foreign exchange rate for a given currency pair',
        input_schema: {
            type: 'object',
            properties: {
                baseCurrency: {
                    type: 'string',
                    description: 'Base currency, like EUR'
                },
                quoteCurrency: {
                    type: 'string',
                    description: 'Quote currency, like USD'
                }
            },
            required: ['baseCurrency', 'quoteCurrency']
        }
    },
    {
        name: 'send_telegram_message',
        description: 'Send a message to a Telegram group or user.',
        input_schema: {
            type: 'object',
            properties: {
                chatId: {
                    type: 'string',
                    description: 'The chat ID of the Telegram group or user'
                },
                message: {
                    type: 'string',
                    description: 'The message to send'
                }
            },
            required: ['chatId', 'message']
        }
    },
    {
        name: 'search_web_content',
        description:
            'Searches the web for the given query and returns the content of the first 3 search result pages.',
        input_schema: {
            type: 'object',
            properties: {
                query: {
                    type: 'string',
                    description: 'The search query'
                }
            },
            required: ['query']
        }
    },
    {
        name: 'send_email',
        description: 'Sends an email with the given subject, recipient, and content.',
        input_schema: {
            type: 'object',
            properties: {
                to: {
                    type: 'string',
                    description: "The recipient's email address (optional)"
                },
                subject: {
                    type: 'string',
                    description: 'The subject of the email'
                },
                content: {
                    type: 'string',
                    description: 'The content of the email'
                }
            },
            required: ['subject', 'content']
        }
    },
    {
        name: 'get_current_time_utc',
        description: 'Returns the current date and time in UTC format.',
        input_schema: {
            type: 'object',
            properties: {},
            required: []
        }
    },
    {
        name: 'execute_python',
        description: 'Executes the provided Python code and returns the output.',
        input_schema: {
            type: 'object',
            properties: {
                code: {
                    type: 'string',
                    description: 'The Python code to execute'
                }
            },
            required: ['code']
        }
    },
    {
        name: 'get_latest_news',
        description: 'Retrieves the latest news stories from Google News for a given language.',
        input_schema: {
            type: 'object',
            properties: {
                lang: {
                    type: 'string',
                    description: 'The language code for the news articles'
                }
            },
            required: ['lang']
        }
    },
    {
        name: 'persist_user_info',
        description: 'Persist user information in the database.',
        input_schema: {
            type: 'object',
            properties: {
                key: {
                    type: 'string',
                    description: 'The key for the user information'
                },
                value: {
                    type: 'string',
                    description: 'The value for the user information'
                }
            },
            required: ['key', 'value']
        }
    },
    {
        name: 'remove_user_info',
        description: 'Removes all information about user.',
        input_schema: {
            type: 'object',
            properties: {},
            required: []
        }
    },
    {
        name: 'schedule_action',
        description: 'Schedule any action (prompt) hourly or daily.',
        input_schema: {
            type: 'object',
            properties: {
                action: {
                    type: 'string',
                    description: 'The action (prompt) to be scheduled'
                },
                schedule: {
                    type: 'string',
                    description: 'The schedule for the action execution (hourly or daily)'
                }
            },
            required: ['action', 'schedule']
        }
    },
    {
        name: 'stop_scheduled_action',
        description: 'Stop and remove any scheduled task for user.',
        input_schema: {
            type: 'object',
            properties: {},
            required: []
        }
    },
    {
        name: 'summarize_youtube_video',
        description: 'Summarize a YouTube video based on its video ID or video URL.',
        input_schema: {
            type: 'object',
            properties: {
                videoId: {
                    type: 'string',
                    description: 'The ID or URL of the YouTube video to be summarized'
                }
            },
            required: ['videoId']
        }
    },
    {
        name: 'add_calendar_event',
        description: "Adds an event to the user's calendar and sends an ICS file via email.",
        input_schema: {
            type: 'object',
            properties: {
                title: {
                    type: 'string',
                    description: 'The title of the calendar event'
                },
                description: {
                    type: 'string',
                    description: 'The description of the calendar event'
                },
                startTime: {
                    type: 'string',
                    description: 'The start time of the event in ISO format'
                },
                endTime: {
                    type: 'string',
                    description: 'The end time of the event in ISO format'
                }
            },
            required: ['title', 'description', 'startTime', 'endTime']
        }
    },
    {
        name: 'get_user_subscription_info',
        description:
            "Get information about the user's subscription status, usage statistics, and API consumption.",
        input_schema: {
            type: 'object',
            properties: {},
            required: []
        }
    },
    {
        name: 'award_achievement',
        description: 'Award the user with an achievement for any outstanding result.',
        input_schema: {
            type: 'object',
            properties: {
                emoji: {
                    type: 'string',
                    description: 'The emoji to represent the achievement'
                },
                description: {
                    type: 'string',
                    description: 'A short description of the achievement'
                }
            },
            required: ['emoji', 'description']
        }
    },
    {
        name: 'send_user_feedback',
        description: 'Send user feedback to AllChat developers.',
        input_schema: {
            type: 'object',
            properties: {
                feedback: {
                    type: 'string',
                    description: "The user's feedback message"
                }
            },
            required: ['feedback']
        }
    },
    {
        name: 'save_artifact',
        description:
            'Saves the current state of a working artifact to the database for later use or editing.',
        input_schema: {
            type: 'object',
            properties: {
                artifactName: {
                    type: 'string',
                    description: 'A descriptive name for the artifact'
                },
                content: {
                    type: 'string',
                    description: 'The full content of the artifact'
                },
                type: {
                    type: 'string',
                    description: 'The type of artifact',
                    enum: [
                        'html',
                        'mermaid',
                        'code',
                        'text',
                        'openscad',
                        'react',
                        'python',
                        'svg',
                        'other'
                    ]
                }
            },
            required: ['artifactName', 'content', 'type']
        }
    }
];

export const handleToolCall = async (name, args, userId) => {
    toolsUsed.push(name);
    console.log('handleToolCall', name, args);

    switch (name) {
        case 'get_weather':
            return getWeather(args.location);
        case 'get_stock_price':
            return getStockPrice(args.ticker);
        case 'get_fx_rate':
            return getFxRate(args.baseCurrency, args.quoteCurrency);
        case 'send_telegram_message':
            return sendTelegramMessage(args.chatId, args.message);
        case 'search_web_content':
            return searchWebContent(args.query);
        case 'send_email':
            return sendEmail(args.to, args.subject, args.content + emailSignature, userId);
        case 'get_current_time_utc':
            return getCurrentTimeUTC();
        case 'execute_python':
            return executePython(args.code);
        case 'get_latest_news':
            return getLatestNews(args.lang);
        case 'persist_user_info':
            return persistUserInfo(args.key, args.value, userId);
        case 'remove_user_info':
            return removeUserInfo(userId);
        case 'schedule_action':
            return scheduleAction(args.action, args.schedule, userId);
        case 'stop_scheduled_action':
            return stopScheduledAction(userId);
        case 'summarize_youtube_video':
            return summarizeYouTubeVideo(args.videoId);
        case 'add_calendar_event':
            return addCalendarEvent(
                args.title,
                args.description,
                args.startTime,
                args.endTime,
                userId
            );
        case 'get_user_subscription_info':
            return getUserSubscriptionInfo(userId);
        case 'award_achievement':
            return awardAchievement(args.emoji, args.description, userId);
        case 'send_user_feedback':
            return sendUserFeedback(args.feedback);
        case 'save_artifact':
            return saveArtifact(args.artifactName, args.content, args.type, userId);
        default:
            console.error(`Unsupported function call: ${name}`);
    }
};

async function getWeather(location) {
    try {
        const weatherUrl = `https://api.openweathermap.org/data/2.5/weather?q=${location}&appid=${process.env.OPENWEATHER_API_KEY}`;
        const forecastUrl = `https://api.openweathermap.org/data/2.5/forecast?q=${location}&appid=${process.env.OPENWEATHER_API_KEY}`;
        const [weatherResponse, forecastResponse] = await Promise.all([
            fetch(weatherUrl),
            fetch(forecastUrl)
        ]);
        const [weatherData, forecastData] = await Promise.all([
            weatherResponse.json(),
            forecastResponse.json()
        ]);
        const { name, weather, main } = weatherData;
        const { list } = forecastData;

        const currentWeather = `In ${name}, the weather is ${
            weather?.[0]?.description
        } with a temperature of ${Math.round(main?.temp - 273)}°C`;

        const fiveDayForecast = list
            ?.filter((item) => item.dt_txt.includes('12:00:00'))
            ?.map((item) => {
                const date = new Date(item.dt * 1000).toLocaleDateString();
                const temperature = Math.round(item.main.temp - 273);
                const description = item.weather[0].description;
                return `On ${date}, the weather will be ${description} with a temperature of ${temperature}°C`;
            })
            ?.join('\n');

        return `${currentWeather}\n\nFive-day forecast:\n${fiveDayForecast}`;
    } catch (error) {
        console.error('Error fetching weather:', error);
        return 'Error fetching weather:' + error.message;
    }
}

async function getStockPrice(ticker) {
    try {
        const apiUrl = `https://yfapi.net/v8/finance/chart/${ticker}?range=1wk&interval=1d&lang=en-US&region=US&includePrePost=false&corsDomain=finance.yahoo.com`;
        const response = await fetch(apiUrl, {
            headers: {
                'X-API-KEY': process.env.YAHOO_FINANCE_API_KEY
            }
        });

        if (!response.ok) {
            throw new Error(`HTTP error ${response.status}`);
        }

        const data = await response.json();
        const stockPrices = data?.chart?.result?.[0]?.indicators?.quote?.[0]?.close;
        return `Last week's stock prices: ${stockPrices?.join(', ')}`;
    } catch (error) {
        console.error('Error fetching stock price:', error);
        return 'Error fetching stock price:' + error.message;
    }
}

async function getFxRate(baseCurrency, quoteCurrency) {
    try {
        const apiUrl = `https://yfapi.net/v6/finance/quote?symbols=${
            baseCurrency + quoteCurrency + '=X'
        }`;
        const response = await fetch(apiUrl, {
            headers: {
                'X-API-KEY': process.env.YAHOO_FINANCE_API_KEY
            }
        });
        if (!response.ok) {
            throw new Error(`HTTP error ${response.status}`);
        }
        const data = await response.json();
        return `Current exchange rates for ${baseCurrency + quoteCurrency + '=X'}: ${
            data?.quoteResponse?.result?.[0]?.regularMarketPrice
        }. Additional info: ${JSON.stringify(data?.quoteResponse?.result?.[0])}`;
    } catch (error) {
        console.error('Error fetching FX rates:', error);
        return 'Error fetching FX rates:' + error.message;
    }
}

async function sendTelegramMessage(chatId, message) {
    try {
        await bot.sendMessage(chatId, message);
        return 'Telegram message sent successfully.';
    } catch (error) {
        return 'Error sending Telegram message:' + error.message;
    }
}

export async function sendEmail(to, subject, content, userId, attachments = []) {
    let recipient;

    if (to && !to?.endsWith('@example.com')) {
        recipient = to;
    } else {
        const user = await User.findById(userId);
        if (!user || !user.email) {
            return 'No recipient email address provided or found in user profile';
        }
        recipient = user.email;
    }

    const mailOptions = {
        to: recipient,
        from: process.env.EMAIL,
        subject,
        text: content,
        attachments
    };

    const info = await transporter.sendMail(mailOptions);
    return `Email sent: ${info.response}`;
}

function getCurrentTimeUTC() {
    return `The current time in UTC is: ${new Date().toUTCString()}`;
}

async function executePython(code) {
    const pythonServerUrl =
        process.env.NODE_ENV === 'production'
            ? 'http://python-shell:8000'
            : 'http://localhost:8000';
    const response = await fetch(pythonServerUrl, {
        method: 'POST',
        headers: {
            'Content-Type': 'text/plain'
        },
        body: code
    });
    const data = await response.text();
    if (response.ok) {
        const jsonData = JSON.parse(data);
        let output = jsonData.output;
        const newFiles = jsonData.new_files;
        for (const [filePath, base64Content] of Object.entries(newFiles)) {
            const fileName = path.basename(filePath);
            const fileContent = Buffer.from(base64Content, 'base64');
            const fileSavePath = path.join(contentFolder, fileName);
            fs.writeFileSync(fileSavePath, fileContent);
            const hyperlink = `[${fileName}](/api/get?file=${encodeURIComponent(fileName)})`;
            output += `\n${hyperlink}`;
        }
        return output;
    } else {
        return data;
    }
}

async function getLatestNews(lang) {
    const newsResults = await googleNews(lang);
    return newsResults.map((n) => n.title + ' ' + n.description).join('\n');
}

async function searchWebContent(query) {
    const searchResults = await fetchSearchResults(query);
    const pageContents = await Promise.all(
        searchResults.slice(0, 3).map(async (result) => {
            return await fetchPageContent(result.link);
        })
    );
    return pageContents?.join('\n').slice(0, MAX_SEARCH_RESULT_LENGTH * 2);
}

async function persistUserInfo(key, value, userId) {
    try {
        let user = await User.findById(userId);
        user.info.set(key, value);
        await user.save();
        return `User information ${key}: ${value} persisted successfully.`;
    } catch (error) {
        console.error('Error persisting user information:', error);
        return 'Error persisting user information:' + error.message;
    }
}

async function removeUserInfo(userId) {
    try {
        const user = await User.findById(userId);
        user.info = {};
        await user.save();
        await Artifact.deleteMany({ user: userId });
        return `User information and all associated artifacts removed successfully for user ${userId}.`;
    } catch (error) {
        console.error('Error removing user information and artifacts:', error);
        return 'Error removing user information and artifacts: ' + error.message;
    }
}

async function addCalendarEvent(title, description, startTime, endTime, userId) {
    try {
        const user = await User.findById(userId);
        const cal = ical({ domain: 'allchat.online' });
        cal.createEvent({
            start: new Date(startTime),
            end: new Date(endTime),
            summary: title,
            description
        });

        const icsContent = cal.toString();
        const subject = `Calendar Event: ${title}`;
        const emailContent = `Please find the attached ICS file for the event: ${title}`;
        const attachmentName = `${title}.ics`;
        const attachments = [
            {
                filename: attachmentName,
                content: icsContent,
                contentType: 'text/calendar'
            }
        ];

        await sendEmail(user.email, subject, emailContent + emailSignature, userId, attachments);
        return `Calendar event '${title}' added successfully and ICS file sent to ${user.email}.`;
    } catch (error) {
        console.error('Error adding calendar event:', error);
        return 'Error adding calendar event: ' + error.message;
    }
}

async function getUserSubscriptionInfo(userId) {
    try {
        const user = await User.findById(userId);
        const { subscriptionStatus, subscriptionId, usageStats, info } = user;

        let output = `Subscription Status: ${subscriptionStatus}\n`;
        output += `Subscription ID: ${subscriptionId || 'N/A'}\n\n`;

        output += 'Usage Statistics:\n';
        for (const [model, stats] of Object.entries(usageStats)) {
            output += `${model}:\n`;
            output += `  Input Tokens: ${stats.inputTokens}\n`;
            output += `  Output Tokens: ${stats.outputTokens}\n`;
            output += `  Money Consumed: $${stats.moneyConsumed.toFixed(2)}\n`;
            if (model === 'gemini') {
                output += `  Images Generated: ${stats.imagesGenerated}\n`;
            }
            output += '\n';
        }

        output += 'User Information:\n';
        for (const [key, value] of info.entries()) {
            output += `${key}: ${value}\n`;
        }

        return output;
    } catch (error) {
        console.error('Error getting user subscription information:', error);
        return 'Error getting user subscription information: ' + error.message;
    }
}

async function awardAchievement(emoji, description, userId) {
    try {
        const user = await User.findById(userId);
        emoji = emoji?.slice(0, 2);
        const achievement = { emoji, description };
        user.achievements.push(achievement);
        await user.save();
        addUserCoins(userId, 30);
        return `Achievement awarded: ${emoji} ${description}`;
    } catch (error) {
        console.error('Error awarding achievement:', error);
        return 'Error awarding achievement: ' + error.message;
    }
}

async function sendUserFeedback(feedback) {
    const developerChatId = '1049277315';
    try {
        await bot.sendMessage(developerChatId, `User Feedback: ${feedback}`);
        return 'Feedback sent successfully to AllChat developers.';
    } catch (error) {
        console.error('Error sending user feedback:', error);
        return 'Error sending user feedback: ' + error.message;
    }
}

async function saveArtifact(artifactName, content, type, userId) {
    try {
        let artifact = await Artifact.findOne({ userId, name: artifactName });

        if (artifact) {
            artifact.content = content;
            artifact.type = type;
            artifact.updatedAt = new Date();
        } else {
            artifact = new Artifact({
                user: userId,
                name: artifactName,
                content,
                type
            });
        }

        await artifact.save();
        return `Artifact "${artifactName}" of type "${type}" saved successfully.`;
    } catch (error) {
        console.error('Error saving artifact:', error);
        return 'Error saving artifact: ' + error.message;
    }
}
