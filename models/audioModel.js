const mongoose = require('mongoose');

const audioFolderSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  name: {
    type: String,
    required: true,
    trim: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

const audioFileSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  folderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'AudioFolder',
    required: true,
  },
  name: {
    type: String,
    required: true,
    trim: true,
  },
  // Store Cloudinary URL instead of binary data
  cloudinaryUrl: {
    type: String,
    required: true,
  },
  // Store Cloudinary public ID for deletion
  cloudinaryPublicId: {
    type: String,
    required: true,
  },
  mimeType: {
    type: String,
    default: 'audio/mpeg',
  },
  duration: {
    type: Number,
    required: true,
    default: 0,
  },
  size: {
    type: Number,
    required: true,
    default: 0,
  },
  uploadedAt: {
    type: Date,
    default: Date.now,
  },
});

const AudioFolder = mongoose.model('AudioFolder', audioFolderSchema);
const AudioFile = mongoose.model('AudioFile', audioFileSchema);

module.exports = { AudioFolder, AudioFile };
