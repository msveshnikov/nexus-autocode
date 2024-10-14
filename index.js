import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import path from 'path';
import http from 'http';
import { Server } from 'socket.io';
import {
    verifyToken,
    registerUser,
    authenticateUser,
    resetPassword,
    completePasswordReset
} from './auth.js';
import { User } from './model/User.js';
import { Artifact } from './model/Artifact.js';
import { Task } from './model/Task.js';
import { executeTask, initializeScheduler, scheduleTask, stopScheduledTask } from './scheduler.js';
import { handleToolCall } from './tools.js';
import {
    findPendingTasks,
    findTasksByPriority,
    findOverdueTasks,
    findTasksForParallelExecution,
    findCompletedTasksInDateRange
} from './utils.js';

dotenv.config({ override: true });

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ALLOWED_ORIGIN = [process.env.FRONTEND_URL, 'http://localhost:3000'];
export const MAX_SEARCH_RESULT_LENGTH = 7000;
export const MAX_CONTEXT_LENGTH = 20000;
export const MAX_CHAT_HISTORY_LENGTH = 40;
export const contentFolder = './content';

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: ALLOWED_ORIGIN,
        methods: ['GET', 'POST']
    }
});

app.set('trust proxy', 1);
app.use(express.json({ limit: '100mb' }));
app.use(cors({ origin: ALLOWED_ORIGIN }));
app.use(morgan('dev'));

const limiter = rateLimit({
    windowMs: 60 * 1000,
    limit: 30,
    standardHeaders: 'draft-7',
    legacyHeaders: false
});

app.use(limiter);

export const MONGODB_URI =
    process.env.NODE_ENV === 'production'
        ? 'mongodb://mongodb:27017/nexus'
        : 'mongodb://localhost:27017/nexus';

mongoose
    .connect(MONGODB_URI)
    .then(() => console.log('🚀 MongoDB connected'))
    .catch((err) => console.error('MongoDB connection error:', err));

export let toolsUsed = [];

app.get('/api/artifacts', verifyToken, async (req, res) => {
    try {
        const artifacts = await Artifact.find({ user: req.user.id }).sort({
            updatedAt: -1
        });
        res.json(artifacts);
    } catch (error) {
        res.status(500).json({ error: 'Error fetching artifacts: ' + error.message });
    }
});

app.post('/api/artifacts', verifyToken, async (req, res) => {
    try {
        const { name, content, type } = req.body;
        const artifact = new Artifact({
            user: req.user.id,
            name,
            content,
            type
        });
        await artifact.save();
        res.json(artifact);
    } catch (error) {
        res.status(500).json({ error: 'Error creating artifact: ' + error.message });
    }
});

app.put('/api/artifacts/:id', verifyToken, async (req, res) => {
    try {
        const { content } = req.body;
        const artifact = await Artifact.findOneAndUpdate(
            { _id: req.params.id, user: req.user.id },
            { content, updatedAt: new Date() },
            { new: true }
        );
        if (!artifact) {
            return res.status(404).json({ error: 'Artifact not found' });
        }
        res.json(artifact);
    } catch (error) {
        res.status(500).json({ error: 'Error updating artifact: ' + error.message });
    }
});

app.delete('/api/artifacts/:id', verifyToken, async (req, res) => {
    try {
        const result = await Artifact.deleteOne({
            _id: req.params.id,
            user: req.user.id
        });
        if (result.deletedCount === 0) {
            return res.status(404).json({ error: 'Artifact not found' });
        }
        res.json({ message: 'Artifact deleted successfully' });
    } catch (error) {
        res.status(500).json({ error: 'Error deleting artifact: ' + error.message });
    }
});

app.get('/api/user/info', verifyToken, async (req, res) => {
    try {
        const user = await User.findById(req.user.id);
        res.json(user.info);
    } catch (error) {
        res.status(500).json({ error: 'Error fetching user info: ' + error.message });
    }
});

app.put('/api/user/info', verifyToken, async (req, res) => {
    try {
        const { key, value } = req.body;
        const user = await User.findById(req.user.id);
        user.info.set(key, value);
        await user.save();
        res.json(user.info);
    } catch (error) {
        res.status(500).json({ error: 'Error updating user info: ' + error.message });
    }
});

app.post('/api/execute-tool', verifyToken, async (req, res) => {
    try {
        const { toolName, params } = req.body;
        const result = await handleToolCall(toolName, params, req.user?.id);
        res.json({ result });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error executing tool: ' + error.message });
    }
});

app.post('/api/auth/register', async (req, res) => {
    const { email, password, credential } = req.body;
    const result = await registerUser(email, password, credential, req);
    if (result.success) {
        res.json({ token: result.token });
    } else {
        res.status(400).json({ error: result.error });
    }
});

app.post('/api/auth/login', async (req, res) => {
    const { email, password } = req.body;
    const result = await authenticateUser(email, password);
    if (result.success) {
        res.json({ token: result.token });
    } else {
        res.status(401).json({ error: result.error });
    }
});

app.post('/api/auth/reset-password', async (req, res) => {
    const { email } = req.body;
    const result = await resetPassword(email);
    if (result.success) {
        res.json({ message: 'Password reset email sent' });
    } else {
        res.status(400).json({ error: result.error });
    }
});

app.post('/api/auth/complete-reset', async (req, res) => {
    const { token, password } = req.body;
    const result = await completePasswordReset(token, password);
    if (result.success) {
        res.json({ message: 'Password reset successful' });
    } else {
        res.status(400).json({ error: result.error });
    }
});

app.post('/api/tasks', verifyToken, async (req, res) => {
    try {
        const { title, description, priority, dueDate, model } = req.body;
        const task = new Task({
            user: req.user.id,
            title,
            description,
            priority,
            dueDate,
            model
        });
        await task.save();
        res.json(task);
    } catch (error) {
        res.status(500).json({ error: 'Error creating task: ' + error.message });
    }
});

app.get('/api/tasks', verifyToken, async (req, res) => {
    try {
        const tasks = await Task.find({ user: req.user.id }).sort({ createdAt: -1 });
        res.json(tasks);
    } catch (error) {
        res.status(500).json({ error: 'Error fetching tasks: ' + error.message });
    }
});

app.put('/api/tasks/:id', verifyToken, async (req, res) => {
    try {
        const { status } = req.body;
        const task = await Task.findOneAndUpdate(
            { _id: req.params.id, user: req.user.id },
            { status },
            { new: true }
        );
        if (!task) {
            return res.status(404).json({ error: 'Task not found' });
        }
        res.json(task);
    } catch (error) {
        res.status(500).json({ error: 'Error updating task: ' + error.message });
    }
});

app.delete('/api/tasks/:id', verifyToken, async (req, res) => {
    try {
        const result = await Task.deleteOne({ _id: req.params.id, user: req.user.id });
        if (result.deletedCount === 0) {
            return res.status(404).json({ error: 'Task not found' });
        }
        res.json({ message: 'Task deleted successfully' });
    } catch (error) {
        res.status(500).json({ error: 'Error deleting task: ' + error.message });
    }
});

app.post('/api/tasks/:id/execute', verifyToken, async (req, res) => {
    try {
        const taskId = req.params.id;
        const result = await executeTask(taskId);
        res.json({ result });
    } catch (error) {
        res.status(500).json({ error: 'Error executing task: ' + error.message });
    }
});

app.post('/api/tasks/:id/schedule', verifyToken, async (req, res) => {
    try {
        const taskId = req.params.id;
        const { schedule } = req.body;
        const result = await scheduleTask(taskId, schedule);
        res.json({ result });
    } catch (error) {
        res.status(500).json({ error: 'Error scheduling task: ' + error.message });
    }
});

app.post('/api/tasks/:id/stop-schedule', verifyToken, async (req, res) => {
    try {
        const taskId = req.params.id;
        const result = await stopScheduledTask(taskId);
        res.json({ result });
    } catch (error) {
        res.status(500).json({ error: 'Error stopping scheduled task: ' + error.message });
    }
});

app.get('/api/tasks/pending', verifyToken, async (req, res) => {
    try {
        const pendingTasks = await findPendingTasks(req.user.id);
        res.json(pendingTasks);
    } catch (error) {
        res.status(500).json({ error: 'Error fetching pending tasks: ' + error.message });
    }
});

app.get('/api/tasks/by-priority/:minPriority', verifyToken, async (req, res) => {
    try {
        const tasks = await findTasksByPriority(req.user.id, parseInt(req.params.minPriority));
        res.json(tasks);
    } catch (error) {
        res.status(500).json({ error: 'Error fetching tasks by priority: ' + error.message });
    }
});

app.get('/api/tasks/overdue', verifyToken, async (req, res) => {
    try {
        const overdueTasks = await findOverdueTasks(req.user.id);
        res.json(overdueTasks);
    } catch (error) {
        res.status(500).json({ error: 'Error fetching overdue tasks: ' + error.message });
    }
});

app.get('/api/tasks/parallel', verifyToken, async (req, res) => {
    try {
        const parallelTasks = await findTasksForParallelExecution(req.user.id);
        res.json(parallelTasks);
    } catch (error) {
        res.status(500).json({
            error: 'Error fetching tasks for parallel execution: ' + error.message
        });
    }
});

app.get('/api/tasks/completed', verifyToken, async (req, res) => {
    try {
        const { startDate, endDate } = req.query;
        const completedTasks = await findCompletedTasksInDateRange(
            req.user.id,
            new Date(startDate),
            new Date(endDate)
        );
        res.json(completedTasks);
    } catch (error) {
        res.status(500).json({ error: 'Error fetching completed tasks: ' + error.message });
    }
});

app.use(express.static(path.join(__dirname, 'public')));
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.get('/', (req, res) => {
    res.render('index');
});

app.get('/app', (req, res) => {
    res.render('app');
});

app.get('/login', (req, res) => {
    res.render('login');
});

app.get('/register', (req, res) => {
    res.render('register');
});

app.use('/api', (req, res) => {
    res.status(404).json({ error: 'API endpoint not found' });
});

io.on('connection', (socket) => {
    console.log('A user connected');

    socket.on('taskProgress', (progress) => {
        io.emit('taskProgressUpdate', progress);
    });

    socket.on('subAgentLog', (log) => {
        io.emit('subAgentLogUpdate', log);
    });

    socket.on('disconnect', () => {
        console.log('User disconnected');
    });
});

initializeScheduler();

server.listen(3000, () => {
    console.log(`🚀 Server started on port 3000`);
});
