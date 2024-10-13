import mongoose from 'mongoose';

const artifactSchema = new mongoose.Schema(
    {
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true
        },
        name: {
            type: String,
            required: true
        },
        content: {
            type: String,
            required: true
        },
        type: {
            type: String,
            required: true,
            enum: ['text', 'code', 'image', 'audio', 'video', 'other']
        },
        metadata: {
            type: Map,
            of: mongoose.Schema.Types.Mixed,
            default: {}
        },
        tags: [String],
        version: {
            type: Number,
            default: 1
        },
        task: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Task'
        },
        subTasks: [
            {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'Task'
            }
        ],
        executorModel: {
            type: String,
            enum: ['gemini', 'claude', 'gpt', 'together']
        },
        createdBy: {
            type: String,
            enum: ['user', 'ai'],
            default: 'ai'
        },
        lastModifiedBy: {
            type: String,
            enum: ['user', 'ai'],
            default: 'ai'
        },
        collaborators: [
            {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'User'
            }
        ],
        parentArtifact: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Artifact'
        },
        childArtifacts: [
            {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'Artifact'
            }
        ],
        revisionHistory: [
            {
                version: Number,
                content: String,
                modifiedBy: String,
                modifiedAt: Date
            }
        ],
        expirationDate: Date,
        isArchived: {
            type: Boolean,
            default: false
        }
    },
    { timestamps: true }
);

artifactSchema.index({ user: 1, name: 1 }, { unique: true });
artifactSchema.index({ tags: 1 });
artifactSchema.index({ type: 1 });
artifactSchema.index({ createdAt: -1 });

artifactSchema.methods.updateContent = async function (newContent, modifiedBy = 'ai') {
    this.revisionHistory.push({
        version: this.version,
        content: this.content,
        modifiedBy: this.lastModifiedBy,
        modifiedAt: this.updatedAt
    });
    this.content = newContent;
    this.version += 1;
    this.lastModifiedBy = modifiedBy;
    return this.save();
};

artifactSchema.methods.addTag = async function (tag) {
    if (!this.tags.includes(tag)) {
        this.tags.push(tag);
        return this.save();
    }
    return this;
};

artifactSchema.methods.removeTag = async function (tag) {
    this.tags = this.tags.filter((t) => t !== tag);
    return this.save();
};

artifactSchema.methods.setMetadata = async function (key, value) {
    this.metadata.set(key, value);
    return this.save();
};

artifactSchema.methods.addSubTask = async function (subTaskId) {
    if (!this.subTasks.includes(subTaskId)) {
        this.subTasks.push(subTaskId);
        return this.save();
    }
    return this;
};

artifactSchema.methods.setExecutorModel = async function (model) {
    this.executorModel = model;
    return this.save();
};

artifactSchema.methods.addCollaborator = async function (userId) {
    if (!this.collaborators.includes(userId)) {
        this.collaborators.push(userId);
        return this.save();
    }
    return this;
};

artifactSchema.methods.removeCollaborator = async function (userId) {
    this.collaborators = this.collaborators.filter((id) => !id.equals(userId));
    return this.save();
};

artifactSchema.methods.addChildArtifact = async function (childArtifactId) {
    if (!this.childArtifacts.includes(childArtifactId)) {
        this.childArtifacts.push(childArtifactId);
        return this.save();
    }
    return this;
};

artifactSchema.methods.archive = async function () {
    this.isArchived = true;
    return this.save();
};

artifactSchema.methods.unarchive = async function () {
    this.isArchived = false;
    return this.save();
};

artifactSchema.statics.findByUserAndType = function (userId, type) {
    return this.find({ user: userId, type: type });
};

artifactSchema.statics.findByUserAndTags = function (userId, tags) {
    return this.find({ user: userId, tags: { $all: tags } });
};

artifactSchema.statics.findByTask = function (taskId) {
    return this.find({ task: taskId });
};

artifactSchema.statics.findRecentByUser = function (userId, limit = 10) {
    return this.find({ user: userId }).sort({ createdAt: -1 }).limit(limit);
};

artifactSchema.statics.findByExecutorModel = function (userId, model) {
    return this.find({ user: userId, executorModel: model });
};

artifactSchema.statics.findCollaborativeArtifacts = function (userId) {
    return this.find({ collaborators: userId });
};

artifactSchema.statics.findNonArchivedByUser = function (userId) {
    return this.find({ user: userId, isArchived: false });
};

export const Artifact = mongoose.model('Artifact', artifactSchema);
