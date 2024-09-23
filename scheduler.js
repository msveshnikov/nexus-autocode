import cron from 'node-cron';
import { User } from './model/User.js';
import { Task } from './model/Task.js';
import { sendEmail } from './tools.js';
import { getTextGpt } from './openai.js';
import { getTextGemini } from './gemini.js';
import { getTextClaude } from './claude.js';
import { getTextTogether } from './together.js';
import { emailSignature } from './email.js';
import { executePython } from './utils.js';

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
    const pendingTasks = await Task.findPendingTasks();
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
};
