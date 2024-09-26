import nodemailer from 'nodemailer';
import { fetchPageContent, fetchSearchResults, googleNews } from './search.js';
import { User } from './model/User.js';
import { Artifact } from './model/Artifact.js';
import { MAX_SEARCH_RESULT_LENGTH, toolsUsed } from './index.js';
import { summarizeYouTubeVideo } from './youtube.js';
import TelegramBot from 'node-telegram-bot-api';
import { emailSignature } from './email.js';
import {
    executePython,
    getStockPrice,
    getFxRate,
    addCalendarEvent,
    getUserSubscriptionInfo,
    saveArtifact,
    generateImage,
    initiateTask,
    updateTaskStatus,
    addSubTask,
    findPendingTasks
} from './utils.js';

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
                },
                model: {
                    type: 'string',
                    description: 'The AI model to use for the task'
                }
            },
            required: ['taskDescription', 'model']
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
        case 'save_artifact':
            return saveArtifact(args.artifactName, args.content, args.type, userId);
        case 'generate_image':
            return generateImage(args.description);
        case 'initiateTask':
            return initiateTask(args.taskDescription, userId, args.model);
        case 'create_sub_task':
            return addSubTask(args.parentTaskId, args.description);
        case 'update_task_status':
            return updateTaskStatus(args.taskId, args.status);
        case 'get_pending_tasks':
            return getPendingTasks(userId);
        default:
            throw new Error(`Unsupported function call: ${name}`);
    }
};

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

async function scheduleAction(action, schedule, userId) {
    try {
        const user = await User.findById(userId);
        user.scheduledAction = { action, schedule };
        await user.save();
        return `Action scheduled successfully: ${action} (${schedule})`;
    } catch (error) {
        console.error('Error scheduling action:', error);
        return 'Error scheduling action: ' + error.message;
    }
}

async function stopScheduledAction(userId) {
    try {
        const user = await User.findById(userId);
        user.scheduledAction = null;
        await user.save();
        return 'Scheduled action stopped and removed successfully.';
    } catch (error) {
        console.error('Error stopping scheduled action:', error);
        return 'Error stopping scheduled action: ' + error.message;
    }
}

async function getPendingTasks(userId) {
    try {
        const tasks = await findPendingTasks(userId);
        return tasks.map((task) => `${task.title} (${task.status})`).join('\n');
    } catch (error) {
        console.error('Error getting pending tasks:', error);
        return 'Error getting pending tasks: ' + error.message;
    }
}
