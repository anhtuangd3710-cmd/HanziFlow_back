
const User = require('../models/userModel');
const jwt = require('jsonwebtoken');

const generateAccessToken = (id) => {
    return jwt.sign({ id }, process.env.JWT_ACCESS_SECRET, { expiresIn: '15m' });
};

const generateRefreshToken = (id) => {
    return jwt.sign({ id }, process.env.JWT_REFRESH_SECRET, { expiresIn: '7d' });
};

const sendRefreshToken = (res, token) => {
    res.cookie('jid', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production', // Only send over HTTPS in production
        sameSite: 'strict',
        path: '/api/users', // Important: limit cookie scope
        maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    });
};

const handleAuthSuccess = async (res, user) => {
    const accessToken = generateAccessToken(user._id);
    const refreshToken = generateRefreshToken(user._id);

    // Store refresh token in DB
    user.refreshTokens.push(refreshToken);
    await user.save();
    
    sendRefreshToken(res, refreshToken);
    
    res.json({
         accessToken,
         _id: user._id, name: user.name, email: user.email,
         xp: user.xp, currentStreak: user.currentStreak, longestStreak: user.longestStreak,
         lastStudiedDate: user.lastStudiedDate, createdAt: user.createdAt, clonedSets: user.clonedSets,
    });
};


// @desc    Register a new user
// @route   POST /api/users/register
// @access  Public
const registerUser = async (req, res) => {
    try {
        const { name, email, password } = req.body;

        const emailExists = await User.findOne({ email });
        if (emailExists) {
            return res.status(400).json({ message: 'User with this email already exists' });
        }

        const nameExists = await User.findOne({ name });
        if (nameExists) {
            return res.status(400).json({ message: 'Username is already taken' });
        }

        const user = await User.create({ name, email, password, refreshTokens: [] });
        if (user) {
            handleAuthSuccess(res, user);
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
        const { email, password, rememberMe } = req.body;
        const user = await User.findOne({ email });
        if (user && (await user.matchPassword(password))) {
             if (!rememberMe) {
                // If not "remember me", clear old refresh tokens for this user
                user.refreshTokens = [];
            }
            handleAuthSuccess(res, user);
        } else {
            res.status(401).json({ message: 'Invalid email or password' });
        }
    } catch (error) {
        console.error(error)
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Logout user
// @route   POST /api/users/logout
// @access  Private (needs valid access token to identify user)
const logoutUser = async (req, res) => {
    const token = req.cookies.jid;
    if (!token) {
        return res.sendStatus(204); // No content
    }
    
    // Invalidate the refresh token
    try {
        const user = await User.findById(req.user._id);
        if (user) {
            user.refreshTokens = user.refreshTokens.filter(rt => rt !== token);
            await user.save();
        }
    } catch(err) {
      console.error("Error during logout token invalidation:", err);
    }

    res.clearCookie('jid', { path: '/api/users' });
    return res.status(204).send();
};


// @desc    Refresh access token
// @route   POST /api/users/refresh
// @access  Public (uses httpOnly cookie)
const refreshTokenController = async (req, res) => {
    const token = req.cookies.jid;
    if (!token) {
        return res.status(401).json({ message: 'Not authenticated' });
    }

    let payload;
    try {
        payload = jwt.verify(token, process.env.JWT_REFRESH_SECRET);
    } catch (err) {
        return res.status(401).json({ message: 'Invalid refresh token' });
    }

    const user = await User.findById(payload.id);
    if (!user || !user.refreshTokens.includes(token)) {
        return res.status(401).json({ message: 'Refresh token not found or revoked' });
    }

    // Token is valid, send back a new access token
    const accessToken = generateAccessToken(user._id);
    res.json({ accessToken });
};



// @desc    Get user profile
// @route   GET /api/users/profile
// @access  Private
const getUserProfile = async (req, res) => {
    try {
        const user = await User.findById(req.user._id);
        if (user) {
            // Also send a new access token to keep the session fresh on profile checks
            const accessToken = generateAccessToken(user._id);
            res.json({
                accessToken,
                _id: user._id, name: user.name, email: user.email,
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
            const accessToken = generateAccessToken(updatedUser._id);
            
            res.json({
                 accessToken,
                 _id: updatedUser._id, name: updatedUser.name, email: updatedUser.email,
                 xp: updatedUser.xp, currentStreak: updatedUser.currentStreak, longestStreak: updatedUser.longestStreak,
                 lastStudiedDate: updatedUser.lastStudiedDate, createdAt: updatedUser.createdAt, clonedSets: updatedUser.clonedSets,
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
            .limit(100)
            .select('name xp createdAt'); 

        res.json(users);
    } catch (error) {
        console.error('Error fetching leaderboard:', error);
        res.status(500).json({ message: 'Server Error' });
    }
};


module.exports = {
    registerUser,
    loginUser,
    logoutUser,
    refreshTokenController,
    getUserProfile,
    updateUserProfile,
    getLeaderboard,
};
