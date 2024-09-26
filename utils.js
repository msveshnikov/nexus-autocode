import path from 'path';
import fs from 'fs';
import nodemailer from 'nodemailer';
import hbs from 'nodemailer-express-handlebars';
import dotenv from 'dotenv';
import { fetchPageContent } from './search.js';
import { contentFolder, MAX_SEARCH_RESULT_LENGTH } from './index.js';
import axios from 'axios';
import ical from 'ical-generator';
import { User } from './model/User.js';
import { Task } from './model/Task.js';
import { Artifact } from './model/Artifact.js';
import { getImage } from './image.js';

dotenv.config();

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL,
        pass: process.env.EMAIL_PASSWORD
    }
});

const handlebarsOptions = {
    viewEngine: {
        extName: '.html',
        partialsDir: path.resolve('templates'),
        defaultLayout: false
    },
    viewPath: path.resolve('templates'),
    extName: '.html'
};

transporter.use('compile', hbs(handlebarsOptions));

export const sendEmail = async (options) => {
    try {
        const info = await transporter.sendMail(options);
        console.log('Email sent: ' + info.response);
        return info.response;
    } catch (e) {
        console.error(e);
        throw e;
    }
};

export const sendWelcomeEmail = async (user) => {
    return sendEmail({
        to: user.email,
        from: process.env.EMAIL,
        subject: 'Welcome to Nexus!',
        template: 'welcome',
        context: {
            name: user.email
        }
    });
};

export const sendResetEmail = async (user, resetUrl) => {
    return sendEmail({
        to: user.email,
        from: process.env.EMAIL,
        subject: 'Password Reset Request',
        template: 'reset',
        context: {
            resetUrl
        }
    });
};

export async function processFile(fileBytesBase64, fileType, userInput) {
    const fileBytes = Buffer.from(fileBytesBase64, 'base64');
    if (fileType === 'pdf') {
        const pdfParser = (await import('pdf-parse')).default;
        const data = await pdfParser(fileBytes);
        return `${data.text}\n\n${userInput}`;
    } else if (
        fileType.match(/msword|vnd.openxmlformats-officedocument.wordprocessingml.document/)
    ) {
        const mammoth = await import('mammoth');
        const docResult = await mammoth.extractRawText({ buffer: fileBytes });
        return `${docResult.value}\n\n${userInput}`;
    } else if (fileType.match(/xlsx|vnd.openxmlformats-officedocument.spreadsheetml.sheet/)) {
        const XLSX = await import('xlsx');
        const workbook = XLSX.read(fileBytes, { type: 'buffer' });
        const excelText = workbook.SheetNames.map((sheetName) =>
            XLSX.utils.sheet_to_txt(workbook.Sheets[sheetName])
        ).join('\n');
        return `${excelText}\n\n${userInput}`;
    }
    return userInput;
}

export async function processUrlContent(userInput) {
    const urlRegex = /https?:\/\/[^\s]+/;
    const skipExtensions = ['.mp3', '.mp4', '.wav', '.avi', '.mov'];
    const match = userInput?.match(urlRegex);
    if (match) {
        const url = match[0];
        const fileExtension = url.split('.').pop().toLowerCase();
        if (!skipExtensions.includes(`.${fileExtension}`)) {
            const urlContent = await fetchPageContent(url);
            if (urlContent) {
                return userInput.replace(
                    url,
                    `\n${urlContent.slice(0, MAX_SEARCH_RESULT_LENGTH)}\n`
                );
            }
        }
    }
    return userInput;
}

export async function executePython(code) {
    const pythonServerUrl =
        process.env.NODE_ENV === 'production'
            ? 'http://python-shell:8000'
            : 'http://localhost:8000';
    const response = await fetch(pythonServerUrl, {
        method: 'POST',
        headers: {
            'Content-Type': 'text/plain'
        },
        body: code
    });
    const data = await response.text();
    if (response.ok) {
        const jsonData = JSON.parse(data);
        let output = jsonData.output;
        const newFiles = jsonData.new_files;
        for (const [filePath, base64Content] of Object.entries(newFiles)) {
            const fileName = path.basename(filePath);
            const fileContent = Buffer.from(base64Content, 'base64');
            const fileSavePath = path.join(contentFolder, fileName);
            fs.writeFileSync(fileSavePath, fileContent);
            const hyperlink = `[${fileName}](/api/get?file=${encodeURIComponent(fileName)})`;
            output += `\n${hyperlink}`;
        }
        return output;
    } else {
        return data;
    }
}

export async function getWeather(location) {
    try {
        const weatherUrl = `https://api.openweathermap.org/data/2.5/weather?q=${location}&appid=${process.env.OPENWEATHER_API_KEY}`;
        const forecastUrl = `https://api.openweathermap.org/data/2.5/forecast?q=${location}&appid=${process.env.OPENWEATHER_API_KEY}`;
        const [weatherResponse, forecastResponse] = await Promise.all([
            axios.get(weatherUrl),
            axios.get(forecastUrl)
        ]);
        const [weatherData, forecastData] = [weatherResponse.data, forecastResponse.data];
        const { name, weather, main } = weatherData;
        const { list } = forecastData;

        const currentWeather = `In ${name}, the weather is ${
            weather?.[0]?.description
        } with a temperature of ${Math.round(main?.temp - 273.15)}°C`;

        const fiveDayForecast = list
            ?.filter((item) => item.dt_txt.includes('12:00:00'))
            ?.slice(0, 5)
            ?.map((item) => {
                const date = new Date(item.dt * 1000).toLocaleDateString();
                const temperature = Math.round(item.main.temp - 273.15);
                const description = item.weather[0].description;
                return `On ${date}, the weather will be ${description} with a temperature of ${temperature}°C`;
            })
            ?.join('\n');

        return `${currentWeather}\n\nFive-day forecast:\n${fiveDayForecast}`;
    } catch (error) {
        console.error('Error fetching weather:', error);
        throw error;
    }
}

export async function getStockPrice(ticker) {
    try {
        const apiUrl = `https://www.alphavantage.co/query?function=TIME_SERIES_DAILY&symbol=${ticker}&apikey=${process.env.ALPHAVANTAGE_API_KEY}`;
        const response = await axios.get(apiUrl);
        const data = response.data;
        const timeSeries = data['Time Series (Daily)'];
        const lastWeekPrices = Object.entries(timeSeries)
            .slice(0, 7)
            .map(([date, values]) => `${date}: $${values['4. close']}`);
        return `Last week's stock prices for ${ticker}:\n${lastWeekPrices.join('\n')}`;
    } catch (error) {
        console.error('Error fetching stock price:', error);
        throw error;
    }
}

export async function getFxRate(baseCurrency, quoteCurrency) {
    try {
        const apiUrl = `https://www.alphavantage.co/query?function=CURRENCY_EXCHANGE_RATE&from_currency=${baseCurrency}&to_currency=${quoteCurrency}&apikey=${process.env.ALPHAVANTAGE_API_KEY}`;
        const response = await axios.get(apiUrl);
        const data = response.data;
        const exchangeRate = data['Realtime Currency Exchange Rate']['5. Exchange Rate'];
        return `Current exchange rate for ${baseCurrency}/${quoteCurrency}: ${exchangeRate}`;
    } catch (error) {
        console.error('Error fetching FX rates:', error);
        throw error;
    }
}

export async function addCalendarEvent(title, description, startTime, endTime, userId) {
    try {
        const user = await User.findById(userId);
        const cal = ical({ domain: 'nexus.autocode.work' });
        cal.createEvent({
            start: new Date(startTime),
            end: new Date(endTime),
            summary: title,
            description
        });

        const icsContent = cal.toString();
        const subject = `Calendar Event: ${title}`;
        const emailContent = `Please find the attached ICS file for the event: ${title}`;
        const attachmentName = `${title}.ics`;
        const attachments = [
            {
                filename: attachmentName,
                content: icsContent,
                contentType: 'text/calendar'
            }
        ];

        await sendEmail({
            to: user.email,
            from: process.env.EMAIL,
            subject,
            text: emailContent,
            attachments
        });
        return `Calendar event '${title}' added successfully and ICS file sent to ${user.email}.`;
    } catch (error) {
        console.error('Error adding calendar event:', error);
        throw error;
    }
}

export async function getUserSubscriptionInfo(userId) {
    try {
        const user = await User.findById(userId);
        const { subscriptionStatus, subscriptionId, usageStats, info } = user;

        let output = `Subscription Status: ${subscriptionStatus}\n`;
        output += `Subscription ID: ${subscriptionId || 'N/A'}\n\n`;

        output += 'Usage Statistics:\n';
        for (const [model, stats] of Object.entries(usageStats)) {
            output += `${model}:\n`;
            output += `  Input Tokens: ${stats.inputTokens}\n`;
            output += `  Output Tokens: ${stats.outputTokens}\n`;
            output += `  Money Consumed: $${stats.moneyConsumed.toFixed(2)}\n`;
            if (model === 'gemini') {
                output += `  Images Generated: ${stats.imagesGenerated}\n`;
            }
            output += '\n';
        }

        output += 'User Information:\n';
        for (const [key, value] of info.entries()) {
            output += `${key}: ${value}\n`;
        }

        return output;
    } catch (error) {
        console.error('Error getting user subscription information:', error);
        throw error;
    }
}

export async function saveArtifact(artifactName, content, type, userId) {
    try {
        let artifact = await Artifact.findOne({ user: userId, name: artifactName });

        if (artifact) {
            artifact.content = content;
            artifact.type = type;
            artifact.updatedAt = new Date();
        } else {
            artifact = new Artifact({
                user: userId,
                name: artifactName,
                content,
                type
            });
        }

        await artifact.save();
        return `Artifact "${artifactName}" of type "${type}" saved successfully.`;
    } catch (error) {
        console.error('Error saving artifact:', error);
        throw error;
    }
}

export async function generateImage(description) {
    try {
        const imageUrl = await getImage(description);
        return `Image generated successfully. URL: ${imageUrl}`;
    } catch (error) {
        console.error('Error generating image:', error);
        throw error;
    }
}

export async function initiateTask(taskDescription, userId) {
    try {
        const user = await User.findById(userId);
        user.totalTasks = (user?.totalTasks || 0) + 1;
        await user.save();

        const task = new Task({
            user: userId,
            title: taskDescription,
            description: taskDescription,
            status: 'pending',
            model: 'gpt-3.5-turbo'
        });
        await task.save();

        return `Task initiated: ${taskDescription}`;
    } catch (error) {
        console.error('Error initiating task:', error);
        throw error;
    }
}

export async function updateTaskStatus(taskId, newStatus) {
    try {
        const task = await Task.findById(taskId);
        if (!task) {
            throw new Error('Task not found');
        }
        await task.updateStatus(newStatus);
        return `Task status updated to ${newStatus}`;
    } catch (error) {
        console.error('Error updating task status:', error);
        throw error;
    }
}

export async function addSubTask(parentTaskId, subTaskDescription) {
    try {
        const parentTask = await Task.findById(parentTaskId);
        if (!parentTask) {
            throw new Error('Parent task not found');
        }
        await parentTask.addSubTask({
            description: subTaskDescription,
            status: 'pending'
        });
        return `Sub-task added to task ${parentTaskId}`;
    } catch (error) {
        console.error('Error adding sub-task:', error);
        throw error;
    }
}

export async function assignAgentToTask(taskId, agentId) {
    try {
        const task = await Task.findById(taskId);
        if (!task) {
            throw new Error('Task not found');
        }
        await task.assignAgent(agentId);
        return `Agent ${agentId} assigned to task ${taskId}`;
    } catch (error) {
        console.error('Error assigning agent to task:', error);
        throw error;
    }
}

export async function addToolToTask(taskId, toolName) {
    try {
        const task = await Task.findById(taskId);
        if (!task) {
            throw new Error('Task not found');
        }
        await task.addTool(toolName);
        return `Tool ${toolName} added to task ${taskId}`;
    } catch (error) {
        console.error('Error adding tool to task:', error);
        throw error;
    }
}

export async function addArtifactToTask(taskId, artifactId) {
    try {
        const task = await Task.findById(taskId);
        if (!task) {
            throw new Error('Task not found');
        }
        await task.addArtifact(artifactId);
        return `Artifact ${artifactId} added to task ${taskId}`;
    } catch (error) {
        console.error('Error adding artifact to task:', error);
        throw error;
    }
}

export async function addExecutionLogToTask(taskId, log) {
    try {
        const task = await Task.findById(taskId);
        if (!task) {
            throw new Error('Task not found');
        }
        await task.addExecutionLog(log);
        return `Execution log added to task ${taskId}`;
    } catch (error) {
        console.error('Error adding execution log to task:', error);
        throw error;
    }
}

export async function setTaskMetadata(taskId, key, value) {
    try {
        const task = await Task.findById(taskId);
        if (!task) {
            throw new Error('Task not found');
        }
        await task.setMetadata(key, value);
        return `Metadata ${key} set for task ${taskId}`;
    } catch (error) {
        console.error('Error setting task metadata:', error);
        throw error;
    }
}

export async function findPendingTasks(userId) {
    try {
        return await Task.findPendingTasks(userId);
    } catch (error) {
        console.error('Error finding pending tasks:', error);
        throw error;
    }
}

export async function findTasksByPriority(userId, minPriority) {
    try {
        return await Task.findTasksByPriority(userId, minPriority);
    } catch (error) {
        console.error('Error finding tasks by priority:', error);
        throw error;
    }
}

export async function findOverdueTasks(userId) {
    try {
        return await Task.findOverdueTasks(userId);
    } catch (error) {
        console.error('Error finding overdue tasks:', error);
        throw error;
    }
}

export async function findTasksForParallelExecution(userId) {
    try {
        return await Task.findTasksForParallelExecution(userId);
    } catch (error) {
        console.error('Error finding tasks for parallel execution:', error);
        throw error;
    }
}

export async function findCompletedTasksInDateRange(userId, startDate, endDate) {
    try {
        return await Task.findCompletedTasksInDateRange(userId, startDate, endDate);
    } catch (error) {
        console.error('Error finding completed tasks in date range:', error);
        throw error;
    }
}
