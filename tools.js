import nodemailer from 'nodemailer';
import { fetchPageContent, fetchSearchResults, googleNews } from './search.js';
import { User } from './model/User.js';
import { MAX_SEARCH_RESULT_LENGTH, toolsUsed } from './index.js';
import { summarizeYouTubeVideo } from './youtube.js';
import TelegramBot from 'node-telegram-bot-api';
import { emailSignature } from './email.js';
import {
    executePython,
    getStockPrice,
    getFxRate,
    saveArtifact,
    generateImage,
    initiateTask,
    updateTaskStatus,
    addSubTask,
    findPendingTasks,
    assignAgentToTask,
    addToolToTask,
    addArtifactToTask,
    addExecutionLogToTask,
    setTaskMetadata,
    findTasksByPriority,
    findOverdueTasks,
    findTasksForParallelExecution,
    findCompletedTasksInDateRange
} from './utils.js';
import { scheduleTask, stopScheduledTask, getScheduledTasks } from './scheduler.js';

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
        name: 'schedule_task',
        description: 'Schedule a task for execution.',
        input_schema: {
            type: 'object',
            properties: {
                taskId: {
                    type: 'string',
                    description: 'The ID of the task to schedule'
                },
                schedule: {
                    type: 'string',
                    description: 'The cron schedule for the task execution'
                }
            },
            required: ['taskId', 'schedule']
        }
    },
    {
        name: 'stop_scheduled_task',
        description: 'Stop a scheduled task.',
        input_schema: {
            type: 'object',
            properties: {
                taskId: {
                    type: 'string',
                    description: 'The ID of the task to stop'
                }
            },
            required: ['taskId']
        }
    },
    {
        name: 'get_scheduled_tasks',
        description: 'Get all scheduled tasks for the user.',
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
        name: 'initiate_task',
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
    },
    {
        name: 'assign_agent_to_task',
        description: 'Assign an agent to a task.',
        input_schema: {
            type: 'object',
            properties: {
                taskId: {
                    type: 'string',
                    description: 'The ID of the task'
                },
                agentId: {
                    type: 'string',
                    description: 'The ID of the agent to assign'
                }
            },
            required: ['taskId', 'agentId']
        }
    },
    {
        name: 'add_tool_to_task',
        description: 'Add a tool to a task.',
        input_schema: {
            type: 'object',
            properties: {
                taskId: {
                    type: 'string',
                    description: 'The ID of the task'
                },
                toolName: {
                    type: 'string',
                    description: 'The name of the tool to add'
                }
            },
            required: ['taskId', 'toolName']
        }
    },
    {
        name: 'add_artifact_to_task',
        description: 'Add an artifact to a task.',
        input_schema: {
            type: 'object',
            properties: {
                taskId: {
                    type: 'string',
                    description: 'The ID of the task'
                },
                artifactId: {
                    type: 'string',
                    description: 'The ID of the artifact to add'
                }
            },
            required: ['taskId', 'artifactId']
        }
    },
    {
        name: 'add_execution_log_to_task',
        description: 'Add an execution log to a task.',
        input_schema: {
            type: 'object',
            properties: {
                taskId: {
                    type: 'string',
                    description: 'The ID of the task'
                },
                log: {
                    type: 'string',
                    description: 'The execution log to add'
                }
            },
            required: ['taskId', 'log']
        }
    },
    {
        name: 'set_task_metadata',
        description: 'Set metadata for a task.',
        input_schema: {
            type: 'object',
            properties: {
                taskId: {
                    type: 'string',
                    description: 'The ID of the task'
                },
                key: {
                    type: 'string',
                    description: 'The metadata key'
                },
                value: {
                    type: 'string',
                    description: 'The metadata value'
                }
            },
            required: ['taskId', 'key', 'value']
        }
    },
    {
        name: 'find_tasks_by_priority',
        description: 'Find tasks by priority.',
        input_schema: {
            type: 'object',
            properties: {
                minPriority: {
                    type: 'number',
                    description: 'The minimum priority to filter tasks'
                }
            },
            required: ['minPriority']
        }
    },
    {
        name: 'find_overdue_tasks',
        description: 'Find overdue tasks.',
        input_schema: {
            type: 'object',
            properties: {},
            required: []
        }
    },
    {
        name: 'find_tasks_for_parallel_execution',
        description: 'Find tasks suitable for parallel execution.',
        input_schema: {
            type: 'object',
            properties: {},
            required: []
        }
    },
    {
        name: 'find_completed_tasks_in_date_range',
        description: 'Find completed tasks within a date range.',
        input_schema: {
            type: 'object',
            properties: {
                startDate: {
                    type: 'string',
                    description: 'The start date in ISO format'
                },
                endDate: {
                    type: 'string',
                    description: 'The end date in ISO format'
                }
            },
            required: ['startDate', 'endDate']
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
        case 'schedule_task':
            return scheduleTask(args.taskId, args.schedule);
        case 'stop_scheduled_task':
            return stopScheduledTask(args.taskId);
        case 'get_scheduled_tasks':
            return getScheduledTasks(userId);
        case 'summarize_youtube_video':
            return summarizeYouTubeVideo(args.videoId);
        case 'save_artifact':
            return saveArtifact(args.artifactName, args.content, args.type, userId);
        case 'generate_image':
            return generateImage(args.description);
        case 'initiate_task':
            return initiateTask(args.taskDescription, userId, args.model);
        case 'create_sub_task':
            return addSubTask(args.parentTaskId, args.description);
        case 'update_task_status':
            return updateTaskStatus(args.taskId, args.status);
        case 'get_pending_tasks':
            return findPendingTasks(userId);
        case 'assign_agent_to_task':
            return assignAgentToTask(args.taskId, args.agentId);
        case 'add_tool_to_task':
            return addToolToTask(args.taskId, args.toolName);
        case 'add_artifact_to_task':
            return addArtifactToTask(args.taskId, args.artifactId);
        case 'add_execution_log_to_task':
            return addExecutionLogToTask(args.taskId, args.log);
        case 'set_task_metadata':
            return setTaskMetadata(args.taskId, args.key, args.value);
        case 'find_tasks_by_priority':
            return findTasksByPriority(userId, args.minPriority);
        case 'find_overdue_tasks':
            return findOverdueTasks(userId);
        case 'find_tasks_for_parallel_execution':
            return findTasksForParallelExecution(userId);
        case 'find_completed_tasks_in_date_range':
            return findCompletedTasksInDateRange(
                userId,
                new Date(args.startDate),
                new Date(args.endDate)
            );
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
