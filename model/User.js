import mongoose from 'mongoose';
import bcrypt from 'bcrypt';

const userSchema = new mongoose.Schema(
    {
        email: {
            type: String,
            required: true,
            unique: true,
            trim: true,
            lowercase: true
        },
        password: {
            type: String,
            required: true
        },
        coins: {
            type: Number,
            default: 0
        },
        totalTasks: {
            type: Number,
            default: 0
        },
        info: {
            type: Map,
            of: String,
            default: new Map()
        },
        role: {
            type: String,
            enum: ['user', 'admin'],
            default: 'user'
        }
    },
    { timestamps: true }
);

userSchema.pre('save', async function (next) {
    if (this.isModified('password')) {
        this.password = await bcrypt.hash(this.password, 10);
    }
    next();
});

userSchema.methods.comparePassword = async function (candidatePassword) {
    return bcrypt.compare(candidatePassword, this.password);
};

export const User = mongoose.model('User', userSchema);

export const addUserCoins = async (userId, amount) => {
    await User.findByIdAndUpdate(userId, { $inc: { coins: amount } });
};

export const countTokens = (text) => {
    return text.split(/\s+/).length;
};

export const storeUsageStats = async (userId, model, inputTokens, outputTokens, imageCount) => {
    const user = await User.findById(userId);
    if (!user.usageStats) {
        user.usageStats = {};
    }
    if (!user.usageStats[model]) {
        user.usageStats[model] = { inputTokens: 0, outputTokens: 0, imageCount: 0 };
    }
    user.usageStats[model].inputTokens += inputTokens;
    user.usageStats[model].outputTokens += outputTokens;
    user.usageStats[model].imageCount += imageCount;
    await user.save();
};
