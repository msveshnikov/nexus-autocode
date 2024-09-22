import { getTextClaude } from './claude.js';
import { getTextGemini } from './gemini.js';
import { getTextGpt } from './openai.js';
import { getTextTogether } from './together.js';
import dotenv from 'dotenv';
import fetch from 'node-fetch';
import { Artifact } from './model/Artifact.js';

dotenv.config({ override: true });

export const getImage = async (prompt, avatar, userId, model) => {
    prompt = prompt.substring(0, 700);
    const translatedPrompt = await translatePrompt(prompt, avatar, model);
    console.log('Image Prompt:', translatedPrompt);
    const imageBase64 = await getStabilityImage(translatedPrompt, avatar);
    await saveImageArtifact(imageBase64, prompt, userId);
    return imageBase64;
};

const translatePrompt = async (prompt, avatar, model) => {
    if (avatar) return prompt;
    const translationPrompt = `Translate sentences in brackets [] into English:\n[${prompt}]\n`;
    let translatedPrompt;
    switch (model) {
        case 'gemini-pro':
        case 'gemini-1.5-pro-001':
            translatedPrompt = await getTextGemini(translationPrompt, 0.7, null, null, null, model);
            break;
        case 'gpt-4':
        case 'gpt-3.5-turbo':
            translatedPrompt = await getTextGpt(translationPrompt, 0.7, null, null, null, model);
            break;
        case 'claude-3-opus-20240229':
        case 'claude-3-sonnet-20240229':
            translatedPrompt = await getTextClaude(translationPrompt, 0.7, null, null, null, model);
            break;
        default:
            translatedPrompt = await getTextTogether(translationPrompt, 0.7, null, model);
    }
    return translatedPrompt || prompt;
};

const getStabilityImage = async (prompt, avatar) => {
    const json = await getRawImageJson(prompt, avatar);
    return json?.artifacts?.[0]?.base64;
};

const getRawImageJson = async (prompt, avatar) => {
    const imageModel = 'stable-diffusion-xl-1024-v1-0';
    const response = await fetch(
        `https://api.stability.ai/v1/generation/${imageModel}/text-to-image`,
        {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Accept: 'application/json',
                Authorization: process.env.STABILITY_KEY
            },
            body: JSON.stringify({
                cfg_scale: 7,
                height: avatar ? 1024 : 64 * 12,
                width: avatar ? 1024 : 64 * 21,
                samples: 1,
                steps: 30,
                text_prompts: [
                    {
                        text: prompt,
                        weight: 1
                    }
                ]
            })
        }
    );

    if (!response.ok) {
        console.error('Stability AI error');
        return null;
    }
    return response.json();
};

const saveImageArtifact = async (imageBase64, prompt, userId) => {
    const artifact = new Artifact({
        user: userId,
        name: `Generated Image: ${prompt.substring(0, 50)}...`,
        content: imageBase64,
        type: 'image',
        metadata: {
            prompt: prompt
        },
        tags: ['generated', 'image']
    });
    await artifact.save();
};
