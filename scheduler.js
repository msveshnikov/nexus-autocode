import cron from 'node-cron';
import { Task } from './model/Task.js';
import { User } from './model/User.js';
import { sendEmail } from './tools.js';
import { getTextGpt } from './openai.js';
import { getTextGemini } from './gemini.js';
import { getTextClaude } from './claude.js';
import { getTextTogether } from './together.js';
import { emailSignature } from './email.js';
import {
    executePython,
    addCalendarEvent,
    generateImage,
    findPendingTasks,
    findOverdueTasks,
    findTasksForParallelExecution,
    findCompletedTasksInDateRange
} from './utils.js';

const scheduledTasks = new Map();

export const scheduleTask = async (taskId, schedule) => {
    const task = await Task.findById(taskId).populate('user');
    if (!task) {
        throw new Error('Task not found');
    }

    const cronJob = cron.schedule(schedule, async () => {
        try {
            await executeTask(task);
        } catch (error) {
            console.error(`Error executing scheduled task: ${error}`);
            task.addExecutionLog(`Scheduled execution failed: ${error.message}`);
            await task.save();
        }
    });

    scheduledTasks.set(taskId, cronJob);
    task.metadata.set('schedule', schedule);
    await task.save();
    return `Task "${task.title}" scheduled to run ${schedule}`;
};

export const stopScheduledTask = async (taskId) => {
    const cronJob = scheduledTasks.get(taskId);
    if (cronJob) {
        cronJob.stop();
        scheduledTasks.delete(taskId);
        const task = await Task.findById(taskId);
        if (task) {
            task.metadata.delete('schedule');
            await task.save();
        }
        return 'Scheduled task stopped';
    } else {
        return 'No scheduled task found for this ID';
    }
};

export const getScheduledTasks = async (userId) => {
    return Task.find({ user: userId, 'metadata.schedule': { $exists: true } });
};

export const createSubTask = async (parentTaskId, subTaskData) => {
    const parentTask = await Task.findById(parentTaskId);
    if (!parentTask) {
        throw new Error('Parent task not found');
    }

    const subTask = await parentTask.addSubTask(subTaskData);
    return subTask;
};

export const executeTask = async (task) => {
    task.status = 'in_progress';
    await task.save();

    const userInfo = [...task.user.info.entries()]
        .map(([key, value]) => `${key}: ${value}`)
        .join(', ');
    const prompt = `User information: ${userInfo}\nTask: ${task.description}\nExecute the task:`;

    let result;
    switch (task.user.preferredModel) {
        case 'gpt-4':
        case 'gpt-3.5-turbo':
            result = await getTextGpt(
                prompt,
                0.7,
                null,
                null,
                task.user._id,
                task.user.preferredModel,
                true
            );
            break;
        case 'gemini-pro':
        case 'gemini-1.5-pro-001':
            result = await getTextGemini(
                prompt,
                0.7,
                null,
                null,
                task.user._id,
                task.user.preferredModel,
                true
            );
            break;
        case 'claude-3-opus-20240229':
        case 'claude-3-sonnet-20240229':
            result = await getTextClaude(
                prompt,
                0.7,
                null,
                null,
                task.user._id,
                task.user.preferredModel,
                true
            );
            break;
        default:
            result = await getTextTogether(
                prompt,
                0.7,
                task.user._id,
                task.user.preferredModel,
                true
            );
    }

    task.addExecutionLog(result);

    if (task.tools.includes('python')) {
        const pythonResult = await executePython(result);
        task.addExecutionLog(`Python execution result: ${pythonResult}`);
    }

    if (task.tools.includes('calendar')) {
        const eventDetails = extractEventDetails(result);
        if (eventDetails) {
            const calendarResult = await addCalendarEvent(
                eventDetails.title,
                eventDetails.description,
                eventDetails.startTime,
                eventDetails.endTime,
                task.user._id
            );
            task.addExecutionLog(`Calendar event added: ${calendarResult}`);
        }
    }

    if (task.tools.includes('image_generation')) {
        const imagePrompt = extractImagePrompt(result);
        if (imagePrompt) {
            const imageResult = await generateImage(imagePrompt);
            task.addExecutionLog(`Image generated: ${imageResult}`);
        }
    }

    task.status = 'completed';
    await task.save();

    await sendEmail(
        task.user.email,
        `Task Result: ${task.title}`,
        `Task: ${task.description}\n\nResult: ${result}${emailSignature}`,
        task.user._id
    );

    return result;
};

export const processTaskQueue = async () => {
    const pendingTasks = await findPendingTasks();
    for (const task of pendingTasks) {
        try {
            await executeTask(task);
        } catch (error) {
            console.error(`Error processing task ${task._id}: ${error}`);
            task.status = 'failed';
            task.addExecutionLog(`Execution failed: ${error.message}`);
            await task.save();
        }
    }
};

export const initializeScheduler = () => {
    cron.schedule('*/5 * * * *', async () => {
        await processTaskQueue();
    });

    cron.schedule('0 * * * *', async () => {
        await processOverdueTasks();
    });

    cron.schedule('0 0 * * *', async () => {
        await generateDailyReport();
    });
};

export const processOverdueTasks = async () => {
    const overdueTasks = await findOverdueTasks();
    for (const task of overdueTasks) {
        task.priority += 1;
        task.addExecutionLog('Task priority increased due to being overdue');
        await task.save();
    }
};

export const generateDailyReport = async () => {
    const users = await User.find();
    for (const user of users) {
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const today = new Date();
        const completedTasks = await findCompletedTasksInDateRange(user._id, yesterday, today);
        const pendingTasks = await findPendingTasks(user._id);

        const report = `
Daily Task Report

Completed Tasks (${completedTasks.length}):
${completedTasks.map((task) => `- ${task.title}`).join('\n')}

Pending Tasks (${pendingTasks.length}):
${pendingTasks.map((task) => `- ${task.title} (Priority: ${task.priority})`).join('\n')}
        `;

        await sendEmail(user.email, 'Daily Task Report', report, user._id);
    }
};

export const parallelTaskExecution = async () => {
    const tasks = await findTasksForParallelExecution();
    const executionPromises = tasks.map((task) => executeTask(task));
    await Promise.all(executionPromises);
};

function extractEventDetails(text) {
    const regex = /Event: (.+)\nDescription: (.+)\nStart: (.+)\nEnd: (.+)/;
    const match = text.match(regex);
    if (match) {
        return {
            title: match[1],
            description: match[2],
            startTime: new Date(match[3]),
            endTime: new Date(match[4])
        };
    }
    return null;
}

function extractImagePrompt(text) {
    const regex = /Generate image: (.+)/;
    const match = text.match(regex);
    return match ? match[1] : null;
}
