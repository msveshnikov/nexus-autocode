import OpenAI from 'openai';
import { handleToolCall, tools } from './tools.js';
import { renameProperty } from './gemini.js';
import dotenv from 'dotenv';
import { MAX_CONTEXT_LENGTH } from './index.js';
import { Task } from './model/Task.js';

dotenv.config({ override: true });

const openai = new OpenAI({ apiKey: process.env.OPENAI_KEY || '123' });

export const getTextGpt = async (
    prompt,
    temperature,
    fileBytesBase64,
    fileType,
    userId,
    model,
    webTools
) => {
    const openAiTools = tools.map(renameProperty).map((f) => ({ type: 'function', function: f }));
    const messages = [
        {
            role: 'user',
            content: [
                { type: 'text', text: prompt },
                ...(fileType && fileBytesBase64
                    ? [
                          {
                              type: 'image_url',
                              image_url: {
                                  url: `data:${
                                      fileType === 'png' ? 'image/png' : 'image/jpeg'
                                  };base64,${fileBytesBase64}`
                              }
                          }
                      ]
                    : [])
            ]
        }
    ];

    const getResponse = async () => {
        const completion = await openai.chat.completions.create({
            model: model || 'gpt-3.5-turbo',
            max_tokens: 2048,
            messages: messages.slice(-MAX_CONTEXT_LENGTH),
            temperature: temperature || 0.7,
            tools: webTools ? openAiTools : null
        });
        return completion?.choices?.[0]?.message;
    };

    let response = await getResponse();
    let iterationCount = 0;
    while (response?.tool_calls && iterationCount < 5) {
        const toolCalls = response?.tool_calls;
        messages.push(response);
        for (const toolCall of toolCalls) {
            const toolResult = await handleToolCall(
                toolCall.function.name,
                JSON.parse(toolCall.function.arguments),
                userId
            );
            messages.push({
                role: 'tool',
                name: toolCall.function.name,
                tool_call_id: toolCall.id,
                content: toolResult
            });
        }
        response = await getResponse();
        iterationCount++;
    }
    return response?.content;
};

export const generateEmbedding = async (text) => {
    const response = await openai.embeddings.create({
        model: 'text-embedding-ada-002',
        input: text
    });
    return response.data[0].embedding;
};

export const executeTask = async (taskId) => {
    const task = await Task.findById(taskId);
    if (!task) {
        throw new Error('Task not found');
    }

    task.status = 'in_progress';
    await task.save();

    const prompt = `Execute the following task: ${task.description}`;

    try {
        const result = await getTextGpt(prompt, 0.7, null, null, task.user, task.model, true);
        task.status = 'completed';
        task.addExecutionLog(result);
        await task.save();
        return result;
    } catch (error) {
        task.status = 'failed';
        task.addExecutionLog(`Execution failed: ${error.message}`);
        await task.save();
        throw error;
    }
};

export const decomposeTask = async (taskId) => {
    const task = await Task.findById(taskId);
    if (!task) {
        throw new Error('Task not found');
    }

    const prompt = `Decompose the following task into smaller subtasks: ${task.description}`;
    const result = await getTextGpt(prompt, 0.7, null, null, task.user, task.model, true);

    const subtasks = result.split('\n').filter((line) => line.trim() !== '');
    for (const subtask of subtasks) {
        await task.addSubTask({ description: subtask });
    }

    return subtasks;
};

export const planTask = async (taskId) => {
    const task = await Task.findById(taskId);
    if (!task) {
        throw new Error('Task not found');
    }

    const prompt = `Create a detailed plan for the following task: ${task.description}`;
    const plan = await getTextGpt(prompt, 0.7, null, null, task.user, task.model, true);

    task.metadata.set('plan', plan);
    await task.save();

    return plan;
};

export const selectToolsForTask = async (taskId) => {
    const task = await Task.findById(taskId);
    if (!task) {
        throw new Error('Task not found');
    }

    const prompt = `Select the most appropriate tools for the following task: ${
        task.description
    }\nAvailable tools: ${tools.map((tool) => tool.name).join(', ')}`;
    const result = await getTextGpt(prompt, 0.7, null, null, task.user, task.model, true);

    const selectedTools = result.split(',').map((tool) => tool.trim());
    for (const tool of selectedTools) {
        await task.addTool(tool);
    }

    return selectedTools;
};

export const generateTaskReport = async (taskId) => {
    const task = await Task.findById(taskId).populate('artifacts');
    if (!task) {
        throw new Error('Task not found');
    }

    const prompt = `Generate a detailed report for the following task:
    Title: ${task.title}
    Description: ${task.description}
    Status: ${task.status}
    Execution Logs: ${task.executionLogs.join('\n')}
    Artifacts: ${task.artifacts.map((artifact) => artifact.name).join(', ')}
    `;

    const report = await getTextGpt(prompt, 0.7, null, null, task.user, task.model, true);
    return report;
};
