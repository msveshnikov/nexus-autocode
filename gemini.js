import { VertexAI } from '@google-cloud/vertexai';
import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';
import { handleToolCall, tools } from './tools.js';
import { User } from './model/User.js';
import { Artifact } from './model/Artifact.js';

dotenv.config({ override: true });
process.env['GOOGLE_APPLICATION_CREDENTIALS'] = './nexus.json';

export const renameProperty = (obj) => {
    const newObj = { ...obj };
    newObj['parameters'] = newObj['input_schema'];
    delete newObj['input_schema'];
    return newObj;
};

export async function getTextGemini(
    prompt,
    temperature,
    imageBase64,
    fileType,
    userId,
    model,
    webTools
) {
    const vertex_ai = new VertexAI({
        project: process.env.GOOGLE_KEY,
        location: 'us-central1'
    });

    const parts = [];

    if (fileType && imageBase64) {
        parts.push({
            inlineData: {
                mimeType: `${fileType.startsWith('audio') ? 'audio' : 'image'}/${
                    fileType.split('/')[1]
                }`,
                data: imageBase64
            }
        });
    }

    const contents = {
        contents: [
            {
                role: 'user',
                parts: [{ text: prompt }, ...parts]
            }
        ],
        tools: webTools ? [{ function_declarations: tools.map(renameProperty) }] : []
    };

    const generativeModel = vertex_ai.preview.getGenerativeModel({
        model: model || 'gemini-1.5-pro-001',
        generation_config: {
            maxOutputTokens: 8192,
            temperature: temperature || 0.7
        },
        safetySettings: [
            { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_ONLY_HIGH' },
            { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_ONLY_HIGH' },
            {
                category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT',
                threshold: 'BLOCK_ONLY_HIGH'
            },
            {
                category: 'HARM_CATEGORY_DANGEROUS_CONTENT',
                threshold: 'BLOCK_ONLY_HIGH'
            }
        ]
    });

    let iterationCount = 0;
    let finalResponse = null;

    while (!finalResponse && iterationCount < 5) {
        const generateContentResponse = await generativeModel.generateContent(contents);
        const modelResponse = generateContentResponse?.response?.candidates?.[0]?.content;

        if (modelResponse) {
            const functionCallPart = modelResponse?.parts?.find((part) => part.functionCall);

            if (functionCallPart) {
                const functionCall = functionCallPart.functionCall;
                const functionName = functionCall.name;
                const functionArgs = functionCall.args;

                const functionResponse = await handleToolCall(functionName, functionArgs, userId);
                contents.contents.push(
                    {
                        role: 'model',
                        parts: [{ functionCall: functionCall }]
                    },
                    {
                        role: 'function',
                        parts: [
                            {
                                functionResponse: {
                                    name: functionName,
                                    response: {
                                        content: functionResponse
                                    }
                                }
                            }
                        ]
                    }
                );
            } else {
                finalResponse = modelResponse?.parts?.[0]?.text;
            }
        } else {
            console.error('No valid response from the model');
            break;
        }

        iterationCount++;
    }

    if (finalResponse) {
        await saveArtifact(userId, finalResponse);
    }

    return finalResponse;
}

export async function getTextGeminiFinetune(prompt, temperature, modelName) {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_KEY);
    const model = genAI.getGenerativeModel({ model: modelName });

    const generationConfig = {
        temperature,
        topK: 0,
        topP: 1,
        maxOutputTokens: 2048
    };

    const safetySettings = [
        { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_ONLY_HIGH' },
        { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_ONLY_HIGH' },
        {
            category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT',
            threshold: 'BLOCK_ONLY_HIGH'
        },
        {
            category: 'HARM_CATEGORY_DANGEROUS_CONTENT',
            threshold: 'BLOCK_ONLY_HIGH'
        }
    ];

    const parts = [{ text: 'input: ' + prompt }, { text: 'output: ' }];

    const result = await model.generateContent({
        contents: [{ role: 'user', parts }],
        generationConfig,
        safetySettings
    });

    const response = result.response;
    return response.text();
}

async function saveArtifact(userId, content) {
    try {
        const artifact = new Artifact({
            user: userId,
            name: `Generated Content ${new Date().toISOString()}`,
            content,
            type: 'text'
        });
        await artifact.save();
    } catch (error) {
        console.error('Error saving artifact:', error);
    }
}

export async function updateUserKnowledge(userId, newKnowledge) {
    try {
        const user = await User.findById(userId);
        if (!user) {
            throw new Error('User not found');
        }
        user.knowledge = [...new Set([...user.knowledge, ...newKnowledge])];
        await user.save();
    } catch (error) {
        console.error('Error updating user knowledge:', error);
    }
}
