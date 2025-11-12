
const User = require('../models/userModel');
const generateToken = require('../utils/generateToken');

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

        const user = await User.create({ name, email, password });
        if (user) {
            res.status(201).json({
                _id: user._id, name: user.name, email: user.email,
                xp: user.xp, currentStreak: user.currentStreak, longestStreak: user.longestStreak,
                createdAt: user.createdAt, clonedSets: user.clonedSets, token: generateToken(user._id),
            });
        } else {
            res.status(400).json({ message: 'Invalid user data' });
        }
    } catch(error) {
        console.error('Registration Error:', error);
        // Handle potential race condition for unique fields
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
            res.json({
                 _id: user._id, name: user.name, email: user.email,
                 xp: user.xp, currentStreak: user.currentStreak, longestStreak: user.longestStreak,
                 lastStudiedDate: user.lastStudiedDate, createdAt: user.createdAt, clonedSets: user.clonedSets,
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
            
            res.json({
                 _id: updatedUser._id, name: updatedUser.name, email: updatedUser.email,
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


module.exports = {
    registerUser,
    loginUser,
    getUserProfile,
    updateUserProfile,
    getLeaderboard,
};