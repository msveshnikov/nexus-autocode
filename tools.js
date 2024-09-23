import nodemailer from 'nodemailer';
import { fetchPageContent, fetchSearchResults, googleNews } from './search.js';
import { User, addUserCoins } from './model/User.js';
import { Artifact } from './model/Artifact.js';
import { Task } from './model/Task.js';
import { executeTask } from './scheduler.js';
import { MAX_SEARCH_RESULT_LENGTH, toolsUsed } from './index.js';
import { summarizeYouTubeVideo } from './youtube.js';
import TelegramBot from 'node-telegram-bot-api';
import ical from 'ical-generator';
import { emailSignature } from './email.js';
import { getImage } from './image.js';
import { executePython } from './utils.js';
import axios from 'axios';

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
    },
    {
        name: 'generate_image',
        description: 'Generate an image based on the provided description.',
        input_schema: {
            type: 'object',
            properties: {
                description: {
                    type: 'string',
                    description: 'The description of the image to generate'
                }
            },
            required: ['description']
        }
    },
    {
        name: 'initiateTask',
        description: 'Initiate a new task for processing.',
        input_schema: {
            type: 'object',
            properties: {
                taskDescription: {
                    type: 'string',
                    description: 'The description of the task to initiate'
                }
            },
            required: ['taskDescription']
        }
    },
    {
        name: 'create_sub_task',
        description: 'Create a sub-task for an existing task.',
        input_schema: {
            type: 'object',
            properties: {
                parentTaskId: {
                    type: 'string',
                    description: 'The ID of the parent task'
                },
                description: {
                    type: 'string',
                    description: 'The description of the sub-task'
                }
            },
            required: ['parentTaskId', 'description']
        }
    },
    {
        name: 'update_task_status',
        description: 'Update the status of a task.',
        input_schema: {
            type: 'object',
            properties: {
                taskId: {
                    type: 'string',
                    description: 'The ID of the task to update'
                },
                status: {
                    type: 'string',
                    description: 'The new status of the task',
                    enum: ['pending', 'in_progress', 'completed', 'failed']
                }
            },
            required: ['taskId', 'status']
        }
    },
    {
        name: 'get_pending_tasks',
        description: 'Get all pending tasks for the user.',
        input_schema: {
            type: 'object',
            properties: {},
            required: []
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
        case 'generate_image':
            return generateImage(args.description);
        case 'initiateTask':
            return initiateTask(args.taskDescription, userId);
        case 'create_sub_task':
            return createSubTask(args.parentTaskId, args.description);
        case 'update_task_status':
            return updateTaskStatus(args.taskId, args.status);
        case 'get_pending_tasks':
            return getPendingTasks(userId);
        default:
            throw new Error(`Unsupported function call: ${name}`);
    }
};

async function getWeather(location) {
    try {
        const weatherUrl = `https://api.openweathermap.org/data/2.5/weather?q=${location}&appid=${process.env.OPENWEATHER_API_KEY}`;
        const forecastUrl = `https://api.openweathermap.org/data/2.5/forecast?q=${location}&appid=${process.env.OPENWEATHER_API_KEY}`;
        const [weatherResponse, forecastResponse] = await Promise.all([
            axios.get(weatherUrl),
            axios.get(forecastUrl)
        ]);
        const [weatherData, forecastData] = [weatherResponse.data, forecastResponse.data];
        const { name, weather, main } = weatherData;
        const { list } = forecastData;

        const currentWeather = `In ${name}, the weather is ${
            weather?.[0]?.description
        } with a temperature of ${Math.round(main?.temp - 273.15)}°C`;

        const fiveDayForecast = list
            ?.filter((item) => item.dt_txt.includes('12:00:00'))
            ?.slice(0, 5)
            ?.map((item) => {
                const date = new Date(item.dt * 1000).toLocaleDateString();
                const temperature = Math.round(item.main.temp - 273.15);
                const description = item.weather[0].description;
                return `On ${date}, the weather will be ${description} with a temperature of ${temperature}°C`;
            })
            ?.join('\n');

        return `${currentWeather}\n\nFive-day forecast:\n${fiveDayForecast}`;
    } catch (error) {
        console.error('Error fetching weather:', error);
        return 'Error fetching weather: ' + error.message;
    }
}

async function getStockPrice(ticker) {
    try {
        const apiUrl = `https://www.alphavantage.co/query?function=TIME_SERIES_DAILY&symbol=${ticker}&apikey=${process.env.ALPHAVANTAGE_API_KEY}`;
        const response = await axios.get(apiUrl);
        const data = response.data;
        const timeSeries = data['Time Series (Daily)'];
        const lastWeekPrices = Object.entries(timeSeries)
            .slice(0, 7)
            .map(([date, values]) => `${date}: $${values['4. close']}`);
        return `Last week's stock prices for ${ticker}:\n${lastWeekPrices.join('\n')}`;
    } catch (error) {
        console.error('Error fetching stock price:', error);
        return 'Error fetching stock price: ' + error.message;
    }
}

async function getFxRate(baseCurrency, quoteCurrency) {
    try {
        const apiUrl = `https://www.alphavantage.co/query?function=CURRENCY_EXCHANGE_RATE&from_currency=${baseCurrency}&to_currency=${quoteCurrency}&apikey=${process.env.ALPHAVANTAGE_API_KEY}`;
        const response = await axios.get(apiUrl);
        const data = response.data;
        const exchangeRate = data['Realtime Currency Exchange Rate']['5. Exchange Rate'];
        return `Current exchange rate for ${baseCurrency}/${quoteCurrency}: ${exchangeRate}`;
    } catch (error) {
        console.error('Error fetching FX rates:', error);
        return 'Error fetching FX rates: ' + error.message;
    }
}

async function sendTelegramMessage(chatId, message) {
    try {
        await bot.sendMessage(chatId, message);
        return 'Telegram message sent successfully.';
    } catch (error) {
        return 'Error sending Telegram message: ' + error.message;
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
        return 'Error persisting user information: ' + error.message;
    }
}

async function removeUserInfo(userId) {
    try {
        const user = await User.findById(userId);
        user.info = new Map();
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
        let artifact = await Artifact.findOne({ user: userId, name: artifactName });

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

async function generateImage(description) {
    try {
        const imageUrl = await getImage(description);
        return `Image generated successfully. URL: ${imageUrl}`;
    } catch (error) {
        console.error('Error generating image:', error);
        return 'Error generating image: ' + error.message;
    }
}

async function initiateTask(taskDescription, userId) {
    try {
        const user = await User.findById(userId);
        const task = new Task({
            user: userId,
            title: taskDescription,
            description: taskDescription,
            status: 'pending'
        });
        await task.save();
        user.totalTasks = (user?.totalTasks || 0) + 1;
        await user.save();

        await executeTask(task._id);

        return `Task initiated: ${taskDescription}`;
    } catch (error) {
        console.error('Error initiating task:', error);
        return 'Error initiating task: ' + error.message;
    }
}

async function createSubTask(parentTaskId, description) {
    try {
        const subTask = await Task.findById(parentTaskId).addSubTask({
            description,
            status: 'pending'
        });
        return `Sub-task created: ${description}`;
    } catch (error) {
        console.error('Error creating sub-task:', error);
        return 'Error creating sub-task: ' + error.message;
    }
}

async function updateTaskStatus(taskId, status) {
    try {
        const task = await Task.findById(taskId);
        await task.updateStatus(status);
        return `Task status updated to: ${status}`;
    } catch (error) {
        console.error('Error updating task status:', error);
        return 'Error updating task status: ' + error.message;
    }
}

async function getPendingTasks(userId) {
    try {
        const tasks = await Task.findPendingTasks(userId);
        return tasks.map((task) => `${task.title} (${task.status})`).join('\n');
    } catch (error) {
        console.error('Error getting pending tasks:', error);
        return 'Error getting pending tasks: ' + error.message;
    }
}
