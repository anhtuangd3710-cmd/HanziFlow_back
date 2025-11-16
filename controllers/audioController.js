const { AudioFolder, AudioFile } = require('../models/audioModel');
const cloudinary = require('../config/cloudinary');
const { Readable } = require('stream');

// Create folder
exports.createFolder = async (req, res) => {
  try {
    const { name } = req.body;
    const userId = req.user.id;

    if (!name) {
      return res.status(400).json({ success: false, message: 'Folder name is required' });
    }

    const folder = new AudioFolder({
      userId,
      name,
    });

    await folder.save();
    res.status(201).json({ success: true, data: folder });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get all folders for user
exports.getFolders = async (req, res) => {
  try {
    const userId = req.user.id;
    const folders = await AudioFolder.find({ userId }).sort({ createdAt: -1 });
    res.status(200).json({ success: true, data: folders });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Delete folder
exports.deleteFolder = async (req, res) => {
  try {
    const { folderId } = req.params;
    const userId = req.user.id;

    const folder = await AudioFolder.findOne({ _id: folderId, userId });
    if (!folder) {
      return res.status(404).json({ success: false, message: 'Folder not found' });
    }

    // Get all audio files in folder to delete from Cloudinary
    const audioFiles = await AudioFile.find({ folderId });
    for (const audioFile of audioFiles) {
      try {
        await cloudinary.uploader.destroy(audioFile.cloudinaryPublicId, { resource_type: 'video' });
      } catch (error) {
        console.error(`Failed to delete Cloudinary file: ${audioFile.cloudinaryPublicId}`, error);
      }
    }

    // Delete all audio files from database
    await AudioFile.deleteMany({ folderId });
    await AudioFolder.deleteOne({ _id: folderId });

    res.status(200).json({ success: true, message: 'Folder deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Upload audio file to Cloudinary
exports.uploadAudioFile = async (req, res) => {
  let uploadStream = null;
  
  try {
    const { folderId, name, audioData, duration, size, mimeType } = req.body;
    const userId = req.user.id;

    if (!folderId || !name || !audioData) {
      return res.status(400).json({ success: false, message: 'Missing required fields' });
    }

    // Verify folder exists and belongs to user
    const folder = await AudioFolder.findOne({ _id: folderId, userId });
    if (!folder) {
      return res.status(404).json({ success: false, message: 'Folder not found' });
    }

    // Convert base64 to Buffer
    let buffer;
    try {
      if (typeof audioData === 'string' && audioData.startsWith('data:')) {
        const base64String = audioData.split(',')[1];
        buffer = Buffer.from(base64String, 'base64');
      } else if (typeof audioData === 'string') {
        buffer = Buffer.from(audioData, 'base64');
      } else {
        buffer = audioData; // Already a buffer
      }
    } catch (error) {
      return res.status(400).json({ success: false, message: 'Invalid audio data format: ' + error.message });
    }

    // Create upload promise wrapper
    const uploadPromise = new Promise((resolve, reject) => {
      uploadStream = cloudinary.uploader.upload_stream(
        {
          resource_type: 'video',
          folder: `hanziflow/audio/${userId}`,
          public_id: `${name.replace(/\s+/g, '_')}_${Date.now()}`,
          format: 'mp3',
        },
        async (error, result) => {
          if (error) {
            reject(error);
            return;
          }

          try {
            // Save metadata to MongoDB
            const audioFile = new AudioFile({
              userId,
              folderId,
              name,
              cloudinaryUrl: result.secure_url,
              cloudinaryPublicId: result.public_id,
              duration: duration || 0,
              size: size || buffer.length,
              mimeType: mimeType || 'audio/mpeg',
            });

            await audioFile.save();

            resolve({
              _id: audioFile._id,
              userId: audioFile.userId,
              folderId: audioFile.folderId,
              name: audioFile.name,
              cloudinaryUrl: audioFile.cloudinaryUrl,
              duration: audioFile.duration,
              size: audioFile.size,
              uploadedAt: audioFile.uploadedAt,
            });
          } catch (dbError) {
            // Clean up Cloudinary file if database save fails
            try {
              await cloudinary.uploader.destroy(result.public_id, { resource_type: 'video' });
            } catch (cleanupError) {
              console.error('Failed to cleanup Cloudinary file:', cleanupError);
            }
            reject(dbError);
          }
        }
      );

      // Write buffer to stream
      uploadStream.write(buffer);
      uploadStream.end();
    });

    const audioFileData = await uploadPromise;
    res.status(201).json({ success: true, data: audioFileData });

  } catch (error) {
    console.error('Audio upload error:', error);
    res.status(500).json({ success: false, message: 'Failed to upload audio: ' + error.message });
  }
};

// Get audio files in folder
exports.getAudioFiles = async (req, res) => {
  try {
    const { folderId } = req.params;
    const userId = req.user.id;

    // Verify folder belongs to user
    const folder = await AudioFolder.findOne({ _id: folderId, userId });
    if (!folder) {
      return res.status(404).json({ success: false, message: 'Folder not found' });
    }

    // Return file list with Cloudinary URLs
    const audioFiles = await AudioFile.find({ folderId, userId })
      .select('-cloudinaryPublicId')
      .sort({ uploadedAt: -1 });

    res.status(200).json({ success: true, data: audioFiles });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Redirect to Cloudinary URL for playback
exports.streamAudioFile = async (req, res) => {
  try {
    const { fileId } = req.params;
    const userId = req.user.id;

    const audioFile = await AudioFile.findOne({ _id: fileId, userId });
    if (!audioFile) {
      return res.status(404).json({ success: false, message: 'Audio file not found' });
    }

    // Redirect to Cloudinary URL
    res.redirect(301, audioFile.cloudinaryUrl);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get single audio file metadata
exports.getAudioFile = async (req, res) => {
  try {
    const { fileId } = req.params;
    const userId = req.user.id;

    const audioFile = await AudioFile.findOne({ _id: fileId, userId })
      .select('-cloudinaryPublicId');
    if (!audioFile) {
      return res.status(404).json({ success: false, message: 'Audio file not found' });
    }

    res.status(200).json({ success: true, data: audioFile });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Delete audio file
exports.deleteAudioFile = async (req, res) => {
  try {
    const { fileId } = req.params;
    const userId = req.user.id;

    const audioFile = await AudioFile.findOne({ _id: fileId, userId });
    if (!audioFile) {
      return res.status(404).json({ success: false, message: 'Audio file not found' });
    }

    // Delete from Cloudinary
    try {
      await cloudinary.uploader.destroy(audioFile.cloudinaryPublicId, { resource_type: 'video' });
    } catch (cloudinaryError) {
      console.error('Failed to delete Cloudinary file:', cloudinaryError);
      // Continue with database deletion even if Cloudinary deletion fails
    }

    // Delete from MongoDB
    await AudioFile.deleteOne({ _id: fileId });
    res.status(200).json({ success: true, message: 'Audio file deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get all audio files for user
exports.getAllAudioFiles = async (req, res) => {
  try {
    const userId = req.user.id;
    const audioFiles = await AudioFile.find({ userId })
      .select('-cloudinaryPublicId')
      .sort({ uploadedAt: -1 });

    res.status(200).json({ success: true, data: audioFiles });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
