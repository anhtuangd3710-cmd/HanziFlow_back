const VocabSet = require('../models/vocabSetModel');
const User = require('../models/userModel');
const mongoose = require('mongoose');
const NodeCache = require('node-cache');

// Initialize cache with a 10 minute TTL (Time To Live)
const myCache = new NodeCache({ stdTTL: 600 });


// @desc    Get user's vocab sets
// @route   GET /api/sets
// @access  Private
const getSets = async (req, res) => {
    const userId = req.user._id.toString();
    const cacheKey = `sets_${userId}`;

    if (myCache.has(cacheKey)) {
        return res.json(myCache.get(cacheKey));
    }

    const sets = await VocabSet.find({ user: req.user._id });
    
    myCache.set(cacheKey, sets);

    res.json(sets);
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
    
    myCache.del(`sets_${req.user._id.toString()}`);
    if (isPublic) {
        myCache.del('public_sets');
    }

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
        
        myCache.del(`sets_${req.user._id.toString()}`);
        myCache.del('public_sets'); // Invalidate public cache on any update

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
        
        myCache.del(`sets_${req.user._id.toString()}`);
        if(set.isPublic) {
            myCache.del('public_sets');
        }

        res.json({ message: 'Set removed' });
    } else {
        res.status(404).json({ message: 'Set not found' });
    }
};


// --- COMMUNITY ROUTES ---

// @desc    Get all public vocab sets
// @route   GET /api/sets/community
// @access  Private
const getPublicSets = async (req, res) => {
    if (myCache.has('public_sets')) {
        return res.json(myCache.get('public_sets'));
    }

    const sets = await VocabSet.find({ 
            isPublic: true, 
            user: { $ne: req.user._id } // Exclude user's own sets
        })
        .sort({ cloneCount: -1, publishedAt: -1 })
        .limit(100); // Limit to 100 sets for now

    myCache.set('public_sets', sets);
    res.json(sets);
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
    
    // Invalidate caches
    myCache.del(`sets_${req.user._id.toString()}`);
    myCache.del('public_sets');

    const updatedUser = { clonedSets: user.clonedSets };

    res.status(201).json({ newSet: savedNewSet, updatedUser });
};


module.exports = {
    getSets,
    createSet,
    updateSet,
    deleteSet,
    getPublicSets,
    getPublicSetDetails,
    cloneSet,
};