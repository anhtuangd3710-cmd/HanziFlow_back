
const User = require('../models/userModel');
const generateToken = require('../utils/generateToken');
const crypto = require('crypto');
const { sendVerificationEmail, sendPasswordResetEmail } = require('../utils/emailService');

// @desc    Register a new user
// @route   POST /api/users/register
// @access  Public
const registerUser = async (req, res) => {
    try {
        const { name, email, password } = req.body;

        if (!name || !email || !password) {
            return res.status(400).json({ message: 'Please provide all required fields' });
        }

        const emailExists = await User.findOne({ email });
        if (emailExists) {
            return res.status(400).json({ message: 'User with this email already exists' });
        }

        const nameExists = await User.findOne({ name });
        if (nameExists) {
            return res.status(400).json({ message: 'Username is already taken' });
        }

        // Generate email verification token (20 chars hex)
        const emailToken = crypto.randomBytes(10).toString('hex');
        const emailTokenHash = crypto.createHash('sha256').update(emailToken).digest('hex');

        const user = await User.create({
            name,
            email,
            password,
            emailVerificationToken: emailTokenHash,
            emailVerificationExpire: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
            isEmailVerified: false,
        });

        if (user) {
            const verificationLink = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/verify-email?token=${emailToken}&email=${email}`;

            // Send verification email
            try {
                await sendVerificationEmail(email, verificationLink);
            } catch (emailError) {
                console.error('Email sending failed:', emailError);
                // Still allow registration even if email fails
            }

            res.status(201).json({
                message: 'Account created! Please check your email to verify your account.',
                email: user.email,
                // For testing in development - remove in production
                verificationLink: process.env.NODE_ENV === 'development' ? verificationLink : undefined,
            });
        } else {
            res.status(400).json({ message: 'Invalid user data' });
        }
    } catch(error) {
        console.error('Registration Error:', error);
        if (error.code === 11000) {
             return res.status(400).json({ message: 'Email or Username already exists.' });
        }
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Auth user & get token
// @route   POST /api/users/login
// @access  Public
const loginUser = async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await User.findOne({ email });
        
        if (user && (await user.matchPassword(password))) {
            // Check if user is blocked
            if (user.isBlocked) {
                return res.status(403).json({ 
                    message: `Your account has been disabled: ${user.blockReason || 'Community policy violation'}`
                });
            }

            // Check if email is verified (skip for OAuth users)
            if (!user.isEmailVerified && !user.googleId) {
                return res.status(403).json({ 
                    message: 'Please verify your email before logging in. Check your inbox for the verification link.',
                    needsVerification: true,
                    email: user.email
                });
            }

            res.json({
                 _id: user._id, name: user.name, email: user.email, role: user.role,
                 xp: user.xp, currentStreak: user.currentStreak, longestStreak: user.longestStreak,
                 lastStudiedDate: user.lastStudiedDate, createdAt: user.createdAt, clonedSets: user.clonedSets,
                 isEmailVerified: user.isEmailVerified,
                 token: generateToken(user._id),
            });
        } else {
            res.status(401).json({ message: 'Invalid email or password' });
        }
    } catch (error) {
        res.status(500).json({ message: 'Server Error' });
    }
};


// @desc    Get user profile
// @route   GET /api/users/profile
// @access  Private
const getUserProfile = async (req, res) => {
    try {
        const user = await User.findById(req.user._id);
        if (user) {
            res.json({
                _id: user._id, name: user.name, email: user.email, role: user.role,
                xp: user.xp, currentStreak: user.currentStreak, longestStreak: user.longestStreak,
                lastStudiedDate: user.lastStudiedDate, createdAt: user.createdAt, clonedSets: user.clonedSets,
            });
        } else {
            res.status(404).json({ message: 'User not found' });
        }
    } catch(error) {
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Update user profile
// @route   PUT /api/users/profile
// @access  Private
const updateUserProfile = async (req, res) => {
    try {
        const user = await User.findById(req.user._id);

        if (user) {
            user.name = req.body.name || user.name;

            const updatedUser = await user.save();
            
            res.json({
                 _id: updatedUser._id, name: updatedUser.name, email: updatedUser.email, role: updatedUser.role,
                 xp: updatedUser.xp, currentStreak: updatedUser.currentStreak, longestStreak: updatedUser.longestStreak,
                 lastStudiedDate: updatedUser.lastStudiedDate, createdAt: updatedUser.createdAt, clonedSets: updatedUser.clonedSets,
                 token: generateToken(updatedUser._id),
            });
        } else {
            res.status(404).json({ message: 'User not found' });
        }
    } catch(error) {
         if (error.code === 11000) {
             return res.status(400).json({ message: 'That username is already taken.' });
        }
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Get top users for leaderboard
// @route   GET /api/users/leaderboard
// @access  Private
const getLeaderboard = async (req, res) => {
    try {
        const users = await User.find({})
            .sort({ xp: -1 })
            .limit(100) // Get top 100 users
            .select('name xp createdAt'); // Select only public fields

        res.json(users);
    } catch (error) {
        console.error('Error fetching leaderboard:', error);
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Forgot password - send reset token
// @route   POST /api/users/forgot-password
// @access  Public
const forgotPassword = async (req, res) => {
    try {
        const { email } = req.body;

        if (!email) {
            return res.status(400).json({ message: 'Please provide an email address' });
        }

        const user = await User.findOne({ email });
        if (!user) {
            // Don't reveal if email exists or not for security
            return res.status(200).json({ message: 'If an account exists with this email, a reset link will be sent.' });
        }

        // Generate reset token (20 chars hex)
        const resetToken = crypto.randomBytes(10).toString('hex');
        
        // Hash token and save to database with 30-minute expiry
        user.resetPasswordToken = crypto.createHash('sha256').update(resetToken).digest('hex');
        user.resetPasswordExpire = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes
        await user.save();

        // In production, send email with reset link
        const resetLink = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/forgot-password?token=${resetToken}&email=${email}`;

        // Send password reset email
        try {
            await sendPasswordResetEmail(email, resetLink);
        } catch (emailError) {
            console.error('Email sending failed:', emailError);
            // Still return success even if email fails
        }

        res.json({ 
            message: 'If an account exists with this email, a password reset link will be sent.',
            // For testing in development - remove in production
            resetLink: process.env.NODE_ENV === 'development' ? resetLink : undefined
        });
    } catch (error) {
        console.error('Forgot password error:', error);
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Reset password with token
// @route   POST /api/users/reset-password
// @access  Public
const resetPassword = async (req, res) => {
    try {
        const { token, email, newPassword } = req.body;

        if (!token || !email || !newPassword) {
            return res.status(400).json({ message: 'Missing required fields' });
        }

        // Password strength validation
        if (newPassword.length < 8) {
            return res.status(400).json({ message: 'Password must be at least 8 characters' });
        }
        if (!/(?=.*[a-z])/.test(newPassword)) {
            return res.status(400).json({ message: 'Password must contain a lowercase letter' });
        }
        if (!/(?=.*[A-Z])/.test(newPassword)) {
            return res.status(400).json({ message: 'Password must contain an uppercase letter' });
        }
        if (!/(?=.*\d)/.test(newPassword)) {
            return res.status(400).json({ message: 'Password must contain a number' });
        }
        if (!/(?=.*[\W_])/.test(newPassword)) {
            return res.status(400).json({ message: 'Password must contain a special character' });
        }

        // Find user by email and check if token matches and hasn't expired
        const hashedToken = crypto.createHash('sha256').update(token).digest('hex');
        const user = await User.findOne({
            email,
            resetPasswordToken: hashedToken,
            resetPasswordExpire: { $gt: new Date() },
        });

        if (!user) {
            return res.status(400).json({ message: 'Invalid or expired reset token' });
        }

        // Update password and clear reset token
        user.password = newPassword;
        user.resetPasswordToken = null;
        user.resetPasswordExpire = null;
        await user.save();

        res.json({
            message: 'Password reset successful. You can now login with your new password.',
        });
    } catch (error) {
        console.error('Reset password error:', error);
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Verify email with token
// @route   POST /api/users/verify-email
// @access  Public
const verifyEmail = async (req, res) => {
    try {
        const { token, email } = req.body;

        if (!token || !email) {
            return res.status(400).json({ message: 'Missing token or email' });
        }

        const hashedToken = crypto.createHash('sha256').update(token).digest('hex');
        const user = await User.findOne({
            email,
            emailVerificationToken: hashedToken,
            emailVerificationExpire: { $gt: new Date() },
        });

        if (!user) {
            return res.status(400).json({ message: 'Invalid or expired verification token' });
        }

        // Mark email as verified
        user.isEmailVerified = true;
        user.emailVerificationToken = null;
        user.emailVerificationExpire = null;
        await user.save();

        res.json({
            _id: user._id,
            name: user.name,
            email: user.email,
            role: user.role,
            xp: user.xp,
            currentStreak: user.currentStreak,
            longestStreak: user.longestStreak,
            createdAt: user.createdAt,
            clonedSets: user.clonedSets,
            token: generateToken(user._id),
            message: 'Email verified successfully! You can now login.',
        });
    } catch (error) {
        console.error('Email verification error:', error);
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Google OAuth callback
// @route   POST /api/users/google-auth
// @access  Public
const googleAuth = async (req, res) => {
    try {
        const { googleId, name, email } = req.body;

        if (!googleId || !email) {
            return res.status(400).json({ message: 'Missing required fields from Google' });
        }

        // First, check if user with this googleId already exists
        let user = await User.findOne({ googleId });

        if (user) {
            // Check if user is blocked
            if (user.isBlocked) {
                return res.status(403).json({ 
                    message: `Your account has been disabled: ${user.blockReason || 'Community policy violation'}`
                });
            }
            // User exists with this Google ID, return token
            return res.json({
                _id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
                xp: user.xp,
                currentStreak: user.currentStreak,
                longestStreak: user.longestStreak,
                createdAt: user.createdAt,
                clonedSets: user.clonedSets,
                isEmailVerified: user.isEmailVerified,
                token: generateToken(user._id),
            });
        }

        // Check if email exists (from another account)
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            // Check if user is blocked
            if (existingUser.isBlocked) {
                return res.status(403).json({ 
                    message: `Your account has been disabled: ${existingUser.blockReason || 'Community policy violation'}`
                });
            }
            
            // If user exists but doesn't have googleId, link the accounts
            if (!existingUser.googleId) {
                existingUser.googleId = googleId;
                existingUser.isEmailVerified = true; // Mark as verified since Google verified
                await existingUser.save();
                
                return res.json({
                    _id: existingUser._id,
                    name: existingUser.name,
                    email: existingUser.email,
                    role: existingUser.role,
                    xp: existingUser.xp,
                    currentStreak: existingUser.currentStreak,
                    longestStreak: existingUser.longestStreak,
                    createdAt: existingUser.createdAt,
                    clonedSets: existingUser.clonedSets,
                    isEmailVerified: existingUser.isEmailVerified,
                    token: generateToken(existingUser._id),
                    message: 'Google account linked successfully!',
                });
            }
            
            // Email exists with a different Google account
            return res.status(400).json({
                message: 'This email is already linked to another Google account.',
            });
        }

        // Check if username is available
        let username = name || email.split('@')[0];
        let counter = 1;
        let uniqueName = username;
        while (await User.findOne({ name: uniqueName })) {
            uniqueName = `${username}${counter}`;
            counter++;
        }

        // Create new user with Google OAuth
        user = await User.create({
            name: uniqueName,
            email,
            googleId,
            isEmailVerified: true, // Google emails are already verified
        });

        res.status(201).json({
            _id: user._id,
            name: user.name,
            email: user.email,
            role: user.role,
            xp: user.xp,
            currentStreak: user.currentStreak,
            longestStreak: user.longestStreak,
            createdAt: user.createdAt,
            clonedSets: user.clonedSets,
            isEmailVerified: user.isEmailVerified,
            token: generateToken(user._id),
        });
    } catch (error) {
        console.error('Google Auth Error:', error);
        res.status(500).json({ message: 'Server Error' });
    }
};


// @desc    Save Gemini API Key
// @route   PUT /api/users/api-key
// @access  Private
const saveApiKey = async (req, res) => {
    try {
        const { apiKey } = req.body;

        if (!apiKey || !apiKey.trim()) {
            return res.status(400).json({ message: 'API Key is required' });
        }

        const user = await User.findById(req.user._id);

        if (user) {
            user.geminiApiKey = apiKey.trim();
            await user.save();

            res.json({ 
                message: 'API Key saved successfully',
                hasApiKey: true 
            });
        } else {
            res.status(404).json({ message: 'User not found' });
        }
    } catch (error) {
        console.error('Save API Key Error:', error);
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Get Gemini API Key
// @route   GET /api/users/api-key
// @access  Private
const getApiKey = async (req, res) => {
    try {
        const user = await User.findById(req.user._id);

        if (user) {
            res.json({ 
                apiKey: user.geminiApiKey || null,
                hasApiKey: !!user.geminiApiKey 
            });
        } else {
            res.status(404).json({ message: 'User not found' });
        }
    } catch (error) {
        console.error('Get API Key Error:', error);
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Delete Gemini API Key
// @route   DELETE /api/users/api-key
// @access  Private
const deleteApiKey = async (req, res) => {
    try {
        const user = await User.findById(req.user._id);

        if (user) {
            user.geminiApiKey = null;
            await user.save();

            res.json({ 
                message: 'API Key deleted successfully',
                hasApiKey: false 
            });
        } else {
            res.status(404).json({ message: 'User not found' });
        }
    } catch (error) {
        console.error('Delete API Key Error:', error);
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Resend verification email
// @route   POST /api/users/resend-verification
// @access  Public
const resendVerificationEmail = async (req, res) => {
    try {
        const { email } = req.body;

        if (!email) {
            return res.status(400).json({ message: 'Please provide an email address' });
        }

        const user = await User.findOne({ email });
        if (!user) {
            // Don't reveal if email exists or not for security
            return res.status(200).json({ message: 'If an account exists with this email, a verification link will be sent.' });
        }

        if (user.isEmailVerified) {
            return res.status(400).json({ message: 'Email is already verified. Please login.' });
        }

        // Generate new verification token
        const emailToken = crypto.randomBytes(10).toString('hex');
        const emailTokenHash = crypto.createHash('sha256').update(emailToken).digest('hex');

        user.emailVerificationToken = emailTokenHash;
        user.emailVerificationExpire = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
        await user.save();

        const verificationLink = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/verify-email?token=${emailToken}&email=${email}`;

        // Send verification email
        try {
            await sendVerificationEmail(email, verificationLink);
        } catch (emailError) {
            console.error('Email sending failed:', emailError);
        }

        res.json({
            message: 'Verification email sent! Please check your inbox.',
            // For testing in development - remove in production
            verificationLink: process.env.NODE_ENV === 'development' ? verificationLink : undefined,
        });
    } catch (error) {
        console.error('Resend verification error:', error);
        res.status(500).json({ message: 'Server Error' });
    }
};

module.exports = {
    registerUser,
    loginUser,
    getUserProfile,
    updateUserProfile,
    getLeaderboard,
    forgotPassword,
    resetPassword,
    verifyEmail,
    googleAuth,
    saveApiKey,
    getApiKey,
    deleteApiKey,
    resendVerificationEmail,
};