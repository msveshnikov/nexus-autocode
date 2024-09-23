// model/Task.js

import mongoose from 'mongoose';

const subTaskSchema = new mongoose.Schema({
    description: {
        type: String,
        required: true
    },
    status: {
        type: String,
        enum: ['pending', 'in_progress', 'completed', 'failed'],
        default: 'pending'
    },
    assignedAgent: {
        type: String
    },
    startTime: Date,
    endTime: Date
});

const taskSchema = new mongoose.Schema(
    {
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true
        },
        title: {
            type: String,
            required: true
        },
        description: {
            type: String,
            required: true
        },
        status: {
            type: String,
            enum: ['pending', 'in_progress', 'completed', 'failed'],
            default: 'pending'
        },
        priority: {
            type: Number,
            default: 0
        },
        dueDate: Date,
        subTasks: [subTaskSchema],
        assignedAgents: [String],
        tools: [String],
        artifacts: [
            {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'Artifact'
            }
        ],
        parentTask: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Task'
        },
        metadata: {
            type: Map,
            of: mongoose.Schema.Types.Mixed
        },
        executionLogs: [String],
        model: {
            type: String,
            required: true
        },
        startTime: Date,
        endTime: Date,
        estimatedDuration: Number,
        actualDuration: Number,
        cost: Number,
        dependencies: [
            {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'Task'
            }
        ]
    },
    { timestamps: true }
);

taskSchema.index({ user: 1, status: 1 });
taskSchema.index({ priority: -1, dueDate: 1 });

taskSchema.methods.addSubTask = function (subTaskData) {
    this.subTasks.push(subTaskData);
    return this.save();
};

taskSchema.methods.updateStatus = function (newStatus) {
    this.status = newStatus;
    if (newStatus === 'in_progress' && !this.startTime) {
        this.startTime = new Date();
    } else if (newStatus === 'completed' || newStatus === 'failed') {
        this.endTime = new Date();
        this.actualDuration = this.endTime - this.startTime;
    }
    return this.save();
};

taskSchema.methods.assignAgent = function (agentId) {
    if (!this.assignedAgents.includes(agentId)) {
        this.assignedAgents.push(agentId);
    }
    return this.save();
};

taskSchema.methods.addTool = function (toolName) {
    if (!this.tools.includes(toolName)) {
        this.tools.push(toolName);
    }
    return this.save();
};

taskSchema.methods.addArtifact = function (artifactId) {
    if (!this.artifacts.includes(artifactId)) {
        this.artifacts.push(artifactId);
    }
    return this.save();
};

taskSchema.methods.addExecutionLog = function (log) {
    this.executionLogs.push(log);
    return this.save();
};

taskSchema.methods.setMetadata = function (key, value) {
    this.metadata.set(key, value);
    return this.save();
};

taskSchema.methods.addDependency = function (taskId) {
    if (!this.dependencies.includes(taskId)) {
        this.dependencies.push(taskId);
    }
    return this.save();
};

taskSchema.methods.updateCost = function (cost) {
    this.cost = (this.cost || 0) + cost;
    return this.save();
};

taskSchema.statics.findPendingTasks = function (userId) {
    return this.find({ user: userId, status: 'pending' }).sort({ priority: -1, dueDate: 1 });
};

taskSchema.statics.findTasksByPriority = function (userId, minPriority) {
    return this.find({ user: userId, priority: { $gte: minPriority } }).sort({ priority: -1 });
};

taskSchema.statics.findOverdueTasks = function (userId) {
    return this.find({
        user: userId,
        dueDate: { $lt: new Date() },
        status: { $in: ['pending', 'in_progress'] }
    });
};

taskSchema.statics.findTasksForParallelExecution = function (userId) {
    return this.find({
        user: userId,
        status: 'pending',
        dependencies: { $size: 0 }
    }).sort({ priority: -1 });
};

taskSchema.statics.findCompletedTasksInDateRange = function (userId, startDate, endDate) {
    return this.find({
        user: userId,
        status: 'completed',
        endTime: { $gte: startDate, $lte: endDate }
    });
};

export const Task = mongoose.model('Task', taskSchema);
