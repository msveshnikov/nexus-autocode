import Anthropic from '@anthropic-ai/sdk';
import dotenv from 'dotenv';
import sharp from 'sharp';
import { handleToolCall, tools } from './tools.js';
import { User, storeUsageStats } from './model/User.js';
import { Artifact } from './model/Artifact.js';

dotenv.config({ override: true });

const resizeImage = async (imageBase64, maxSize = 2 * 1024 * 1024) => {
    const image = sharp(Buffer.from(imageBase64, 'base64'));
    const metadata = await image.metadata();

    if (metadata.size > maxSize) {
        const resizedBuffer = await image
            .resize({
                fit: 'inside',
                withoutEnlargement: true,
                withMetadata: true
            })
            .toBuffer();

        return resizedBuffer.toString('base64');
    } else {
        return imageBase64;
    }
};

export const getTextClaude = async (
    prompt,
    temperature,
    fileBytesBase64,
    fileType,
    userId,
    model,
    webTools
) => {
    const anthropic = new Anthropic({ apiKey: process.env.CLAUDE_KEY });

    const messages = [
        {
            role: 'user',
            content: [
                { type: 'text', text: prompt },
                ...(fileType && fileBytesBase64
                    ? [
                          {
                              type: 'image',
                              source: {
                                  type: 'base64',
                                  media_type: fileType === 'png' ? 'image/png' : 'image/jpeg',
                                  data: await resizeImage(fileBytesBase64)
                              }
                          }
                      ]
                    : [])
            ]
        }
    ];

    let response = await getResponse();
    let toolUses, toolResults;
    let iterationCount = 0;

    while (response?.stop_reason === 'tool_use' && iterationCount < 5) {
        toolUses = response.content.filter((block) => block.type === 'tool_use');
        if (!toolUses.length) {
            return response?.content?.[0]?.text;
        }

        toolResults = await Promise.all(
            toolUses.map(async (toolUse) => {
                const toolResult = await handleToolCall(toolUse.name, toolUse.input, userId);
                return { tool_use_id: toolUse.id, content: toolResult };
            })
        );

        messages.push({
            role: 'assistant',
            content: response.content.filter((c) => c.type !== 'text' || c.text)
        });
        messages.push({
            role: 'user',
            content: toolResults.map((toolResult) => ({
                type: 'tool_result',
                ...toolResult
            }))
        });
        response = await getResponse();
        iterationCount++;
    }

    const textResponse = response?.content?.[0]?.text;
    const inputTokens = prompt.length;
    const outputTokens = textResponse.length;
    storeUsageStats(userId, model, inputTokens, outputTokens, 0);

    return textResponse;

    async function getResponse() {
        return anthropic.messages.create(
            {
                model,
                max_tokens: model.includes('sonnet') ? 8192 : 4096,
                temperature: temperature || 0.7,
                tools: webTools ? tools : [],
                messages
            },
            { headers: { 'anthropic-beta': 'max-tokens-3-5-sonnet-2024-07-15' } }
        );
    }
};

export const createArtifact = async (userId, name, content, type) => {
    const artifact = new Artifact({
        user: userId,
        name,
        content,
        type
    });
    await artifact.save();
    return artifact;
};

export const getArtifacts = async (userId) => {
    return Artifact.find({ user: userId }).sort({ updatedAt: -1 });
};

export const updateArtifact = async (artifactId, content) => {
    const artifact = await Artifact.findById(artifactId);
    if (!artifact) {
        throw new Error('Artifact not found');
    }
    artifact.content = content;
    artifact.updatedAt = new Date();
    await artifact.save();
    return artifact;
};

export const deleteArtifact = async (artifactId) => {
    await Artifact.findByIdAndDelete(artifactId);
};

export const getUserInfo = async (userId) => {
    const user = await User.findById(userId);
    return user.info;
};

export const updateUserInfo = async (userId, key, value) => {
    const user = await User.findById(userId);
    user.info.set(key, value);
    await user.save();
};
