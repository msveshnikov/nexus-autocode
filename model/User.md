# User Model Documentation

## File: model/User.js

This file defines the User model for the application using Mongoose, an Object Data Modeling (ODM)
library for MongoDB and Node.js.

## Overview

The User model represents user accounts in the system. It includes fields for email, password,
coins, additional information, and user role. The model also includes methods for password hashing
and comparison, as well as utility functions for managing user coins and usage statistics.

## Schema Definition

```javascript
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
```

### Fields

-   `email`: User's email address (required, unique, trimmed, and converted to lowercase)
-   `password`: User's hashed password (required)
-   `coins`: Number of coins the user has (default: 0)
-   `info`: Additional user information stored as key-value pairs
-   `role`: User's role, either 'user' or 'admin' (default: 'user')
-   `timestamps`: Automatically adds `createdAt` and `updatedAt` fields

## Methods

### Pre-save Hook

```javascript
userSchema.pre('save', async function (next) {
    if (this.isModified('password')) {
        this.password = await bcrypt.hash(this.password, 10);
    }
    next();
});
```

This hook automatically hashes the user's password before saving it to the database if the password
field has been modified.

### comparePassword

```javascript
userSchema.methods.comparePassword = async function (candidatePassword) {
    return bcrypt.compare(candidatePassword, this.password);
};
```

This method compares a given password with the user's stored hashed password.

**Parameters:**

-   `candidatePassword` (String): The password to compare

**Returns:**

-   (Boolean): True if the passwords match, false otherwise

## Exported Functions

### addUserCoins

```javascript
export const addUserCoins = async (userId, amount) => {
    await User.findByIdAndUpdate(userId, { $inc: { coins: amount } });
};
```

This function adds coins to a user's account.

**Parameters:**

-   `userId` (String): The ID of the user
-   `amount` (Number): The number of coins to add

### countTokens

```javascript
export const countTokens = (text) => {
    return text.split(/\s+/).length;
};
```

This utility function counts the number of tokens (words) in a given text.

**Parameters:**

-   `text` (String): The input text

**Returns:**

-   (Number): The number of tokens in the text

### storeUsageStats

```javascript
export const storeUsageStats = async (userId, model, inputTokens, outputTokens, imageCount) => {
    // ... (implementation details)
};
```

This function stores usage statistics for a user's interaction with a specific model.

**Parameters:**

-   `userId` (String): The ID of the user
-   `model` (String): The name of the model used
-   `inputTokens` (Number): The number of input tokens
-   `outputTokens` (Number): The number of output tokens
-   `imageCount` (Number): The number of images generated/processed

## Usage Examples

```javascript
// Creating a new user
const newUser = new User({
    email: 'user@example.com',
    password: 'password123'
});
await newUser.save();

// Comparing passwords
const isMatch = await user.comparePassword('inputPassword');

// Adding coins to a user
await addUserCoins(userId, 100);

// Counting tokens in a text
const tokenCount = countTokens('This is a sample text');

// Storing usage statistics
await storeUsageStats(userId, 'gpt-3', 50, 100, 2);
```

## Role in the Project

This User model is a crucial part of the application's data layer. It's used for user
authentication, managing user-specific data (like coins and usage statistics), and potentially for
access control (via the `role` field). The model is likely used in conjunction with authentication
middleware (possibly in `auth.js`) and various route handlers that deal with user-related
operations.

The utility functions provided (like `addUserCoins` and `storeUsageStats`) suggest that the
application involves some form of credit system and tracks usage of different AI models, which
aligns with the presence of files like `claude.js`, `gemini.js`, and `openai.js` in the project
structure.
