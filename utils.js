import path from 'path';
import nodemailer from 'nodemailer';
import hbs from 'nodemailer-express-handlebars';
import dotenv from 'dotenv';
import { fetchPageContent } from './search.js';
import { MAX_SEARCH_RESULT_LENGTH } from './index.js';
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

const sendEmail = async (options) => {
    try {
        const info = await transporter.sendMail(options);
        console.log('Email sent: ' + info.response);
    } catch (e) {
        console.error(e);
    }
};

export const sendWelcomeEmail = async (user) => {
    sendEmail({
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
    sendEmail({
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
