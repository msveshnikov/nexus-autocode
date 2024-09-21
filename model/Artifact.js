// model/Artifact.js

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
            of: String,
            default: {}
        },
        tags: [String],
        version: {
            type: Number,
            default: 1
        }
    },
    { timestamps: true }
);

artifactSchema.index({ user: 1, name: 1 }, { unique: true });
artifactSchema.index({ tags: 1 });

artifactSchema.methods.updateContent = async function (newContent) {
    this.content = newContent;
    this.version += 1;
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

artifactSchema.statics.findByUserAndType = function (userId, type) {
    return this.find({ user: userId, type: type });
};

artifactSchema.statics.findByUserAndTags = function (userId, tags) {
    return this.find({ user: userId, tags: { $all: tags } });
};

export const Artifact = mongoose.model('Artifact', artifactSchema);
