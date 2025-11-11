
const VocabSet = require('../models/vocabSetModel');
const User = require('../models/userModel');
const mongoose = require('mongoose');
const NodeCache = require('node-cache');

// Initialize cache with a 10 minute TTL (Time To Live)
const myCache = new NodeCache({ stdTTL: 600 });


// @desc    Get user's vocab sets with pagination
// @route   GET /api/sets
// @access  Private
const getSets = async (req, res) => {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 6; // Default to 6 sets per page
    const startIndex = (page - 1) * limit;

    try {
        const total = await VocabSet.countDocuments({ user: req.user._id });
        const sets = await VocabSet.find({ user: req.user._id })
            .sort({ createdAt: -1 })
            .skip(startIndex)
            .limit(limit);

        res.json({
            sets,
            page,
            pages: Math.ceil(total / limit),
            total,
        });
    } catch (error) {
        console.error('Error fetching sets:', error);
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Get a single vocab set by its ID
// @route   GET /api/sets/:id
// @access  Private
const getSetById = async (req, res) => {
    try {
        const set = await VocabSet.findById(req.params.id);

        if (!set) {
            return res.status(404).json({ message: 'Set not found' });
        }

        // Ensure the user owns the set they are trying to access
        if (set.user.toString() !== req.user._id.toString()) {
            return res.status(401).json({ message: 'Not authorized to access this set' });
        }

        res.json(set);
    } catch (error) {
        console.error('Error fetching set by ID:', error);
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Create a new vocab set
// @route   POST /api/sets
// @access  Private
const createSet = async (req, res) => {
    const { title, description, items, difficulty, isPublic } = req.body;

    if (!title) {
        return res.status(400).json({ message: 'Title is required' });
    }

    const set = new VocabSet({
        title,
        description,
        items,
        difficulty,
        isPublic: isPublic || false,
        user: req.user._id,
    });
    
    if (set.isPublic) {
        set.creatorName = req.user.name;
        set.publishedAt = new Date();
    }

    const createdSet = await set.save();
    
    res.status(201).json(createdSet);
};

// @desc    Update a vocab set
// @route   PUT /api/sets/:id
// @access  Private
const updateSet = async (req, res) => {
    const { title, description, items, difficulty, isPublic } = req.body;

    const set = await VocabSet.findById(req.params.id);

    if (set) {
        if (set.user.toString() !== req.user._id.toString()) {
            return res.status(401).json({ message: 'Not authorized' });
        }
        
        const wasPublic = set.isPublic;

        set.title = title ?? set.title;
        set.description = description ?? set.description;
        set.items = items ?? set.items;
        set.difficulty = difficulty ?? set.difficulty;
        set.isPublic = isPublic ?? set.isPublic;

        // If the set is being made public for the first time
        if (isPublic && !wasPublic) {
            set.creatorName = req.user.name;
            set.publishedAt = new Date();
        }

        const updatedSet = await set.save();
        
        res.json(updatedSet);
    } else {
        res.status(404).json({ message: 'Set not found' });
    }
};

// @desc    Delete a vocab set
// @route   DELETE /api/sets/:id
// @access  Private
const deleteSet = async (req, res) => {
    const set = await VocabSet.findById(req.params.id);

    if (set) {
        if (set.user.toString() !== req.user._id.toString()) {
            return res.status(401).json({ message: 'Not authorized' });
        }
        
        await set.deleteOne();
        
        res.status(204).send(); // Send 204 No Content for successful deletion
    } else {
        res.status(404).json({ message: 'Set not found' });
    }
};


// --- COMMUNITY ROUTES ---

// @desc    Get all public vocab sets with search and pagination
// @route   GET /api/sets/community
// @access  Private
const getPublicSets = async (req, res) => {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 9; // Default to 9 for a 3-col layout
    const searchTerm = req.query.search || '';
    const startIndex = (page - 1) * limit;
    
    const query = {
        isPublic: true,
        user: { $ne: req.user._id } // Exclude user's own sets
    };

    if (searchTerm) {
        const regex = new RegExp(searchTerm, 'i'); // 'i' for case-insensitive
        query.$or = [
            { title: regex },
            { description: regex },
            { creatorName: regex },
        ];
    }
    
    try {
        const total = await VocabSet.countDocuments(query);
        const sets = await VocabSet.find(query)
            .sort({ cloneCount: -1, publishedAt: -1 })
            .skip(startIndex)
            .limit(limit);

        res.json({
            sets,
            page,
            pages: Math.ceil(total / limit),
            total,
        });

    } catch (error) {
        console.error('Error fetching public sets:', error);
        res.status(500).json({ message: 'Server Error' });
    }
};


// @desc    Get details of a single public set
// @route   GET /api/sets/community/:id
// @access  Private
const getPublicSetDetails = async (req, res) => {
    const set = await VocabSet.findOne({ _id: req.params.id, isPublic: true });
    if (!set) {
        return res.status(404).json({ message: 'Public set not found' });
    }
    res.json(set);
};


// @desc    Clone a public set to the current user's collection
// @route   POST /api/sets/clone/:id
// @access  Private
const cloneSet = async (req, res) => {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
        return res.status(400).json({ message: 'Invalid set ID' });
    }
    
    const publicSet = await VocabSet.findById(req.params.id);
    if (!publicSet || !publicSet.isPublic) {
        return res.status(404).json({ message: 'Public set not found' });
    }

    if (publicSet.user.toString() === req.user._id.toString()) {
        return res.status(400).json({ message: 'You cannot clone your own set.' });
    }

    const user = await User.findById(req.user._id);
    if (user.clonedSets && user.clonedSets.includes(publicSet._id)) {
        return res.status(400).json({ message: 'You have already added this set.' });
    }

    const newSet = new VocabSet({
        user: req.user._id,
        title: publicSet.title,
        description: publicSet.description,
        difficulty: publicSet.difficulty,
        items: publicSet.items.map(item => ({
            id: item.id,
            hanzi: item.hanzi,
            pinyin: item.pinyin,
            meaning: item.meaning,
            exampleSentence: item.exampleSentence,
            // SRS data is reset to default for the new user
        })),
        isPublic: false, // Cloned sets are private by default
        originalSetId: publicSet._id,
    });

    const savedNewSet = await newSet.save();

    // Update clone count on original set and cloned sets on user
    publicSet.cloneCount = (publicSet.cloneCount || 0) + 1;
    await publicSet.save();

    user.clonedSets.push(publicSet._id);
    await user.save();
    
    const updatedUser = { clonedSets: user.clonedSets };

    res.status(201).json({ newSet: savedNewSet, updatedUser });
};


module.exports = {
    getSets,
    getSetById,
    createSet,
    updateSet,
    deleteSet,
    getPublicSets,
    getPublicSetDetails,
    cloneSet,
};