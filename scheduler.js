import cron from 'node-cron';
import { User } from './model/User.js';
import { Task } from './model/Task.js';
import { sendEmail } from './tools.js';
import { getTextGpt } from './openai.js';
import { getTextGemini } from './gemini.js';
import { getTextClaude } from './claude.js';
import { getTextTogether } from './together.js';
import { emailSignature } from './email.js';

const scheduledActions = {};

export const scheduleAction = async (action, schedule, userId) => {
    const user = await User.findById(userId);
    if (!user) {
        return 'User not found';
    }

    const task = cron.schedule(schedule === 'hourly' ? '0 * * * *' : '0 0 * * *', async () => {
        try {
            const userInfo = [...user.info.entries()]
                .map(([key, value]) => `${key}: ${value}`)
                .join(', ');
            const prompt = `User information: ${userInfo} Please execute user requested action (do the task, don't request it but do YOURSELF): ${action}`;

            let result;
            switch (user.preferredModel) {
                case 'gpt-4':
                case 'gpt-3.5-turbo':
                    result = await getTextGpt(
                        prompt,
                        0.7,
                        null,
                        null,
                        userId,
                        user.preferredModel,
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
                        userId,
                        user.preferredModel,
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
                        userId,
                        user.preferredModel,
                        true
                    );
                    break;
                default:
                    result = await getTextTogether(prompt, 0.7, userId, user.preferredModel, true);
            }

            const task = new Task({
                user: userId,
                description: action,
                result,
                schedule,
                status: 'completed'
            });
            await task.save();

            await sendEmail(
                user.email,
                `${schedule} action result`,
                result + emailSignature,
                userId
            );
        } catch (error) {
            console.error(`Error executing scheduled action: ${error}`);
        }
    });

    scheduledActions[userId] = task;
    return `Action "${action}" scheduled to run ${schedule}`;
};

export const stopScheduledAction = async (userId) => {
    const task = scheduledActions[userId];
    if (task) {
        task.stop();
        delete scheduledActions[userId];
        await Task.updateMany(
            { user: userId, status: 'scheduled' },
            { $set: { status: 'cancelled' } }
        );
        return 'Scheduled action stopped';
    } else {
        return 'No scheduled action found for this user';
    }
};

export const getScheduledTasks = async (userId) => {
    return Task.find({ user: userId, status: 'scheduled' });
};

export const getCompletedTasks = async (userId) => {
    return Task.find({ user: userId, status: 'completed' });
};

export const createSubTask = async (parentTaskId, description) => {
    const parentTask = await Task.findById(parentTaskId);
    if (!parentTask) {
        throw new Error('Parent task not found');
    }

    const subTask = new Task({
        user: parentTask.user,
        description,
        parentTask: parentTaskId,
        status: 'pending'
    });

    await subTask.save();
    parentTask.subTasks.push(subTask._id);
    await parentTask.save();

    return subTask;
};

export const executeTask = async (taskId) => {
    const task = await Task.findById(taskId);
    if (!task) {
        throw new Error('Task not found');
    }

    const user = await User.findById(task.user);
    if (!user) {
        throw new Error('User not found');
    }

    const prompt = `Execute the following task: ${task.description}`;
    let result;

    switch (user.preferredModel) {
        case 'gpt-4':
        case 'gpt-3.5-turbo':
            result = await getTextGpt(prompt, 0.7, null, null, user._id, user.preferredModel, true);
            break;
        case 'gemini-pro':
        case 'gemini-1.5-pro-001':
            result = await getTextGemini(
                prompt,
                0.7,
                null,
                null,
                user._id,
                user.preferredModel,
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
                user._id,
                user.preferredModel,
                true
            );
            break;
        default:
            result = await getTextTogether(prompt, 0.7, user._id, user.preferredModel, true);
    }

    task.result = result;
    task.status = 'completed';
    await task.save();

    return result;
};
