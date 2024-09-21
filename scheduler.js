import cron from 'node-cron';
import { User } from './model/User.js';
import { sendEmail } from './tools.js';
import { getTextGpt } from './openai.js';
import { getTextGemini } from './gemini.js';
import { getTextClaude } from './claude.js';
import { getTextTogether } from './together.js';
import { getTextMistralLarge } from './mistral.js';
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
                case 'mistral-large-latest':
                    result = await getTextMistralLarge(
                        prompt,
                        0.7,
                        userId,
                        user.preferredModel,
                        true
                    );
                    break;
                default:
                    result = await getTextTogether(prompt, 0.7, userId, user.preferredModel, true);
            }

            const actionTimestamp = Date.now();
            user.scheduling.set(`${schedule}_action_${actionTimestamp}`, action);
            user.scheduling.set(`${schedule}_result_${actionTimestamp}`, result);
            await user.save();

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

export const stopScheduledAction = (userId) => {
    const task = scheduledActions[userId];
    if (task) {
        task.stop();
        delete scheduledActions[userId];
        return 'Scheduled action stopped';
    } else {
        return 'No scheduled action found for this user';
    }
};
