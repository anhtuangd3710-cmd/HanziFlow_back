const express = require('express');
const router = express.Router();
const {
  createFolder,
  getFolders,
  deleteFolder,
  uploadAudioFile,
  getAudioFiles,
  getAudioFile,
  streamAudioFile,
  deleteAudioFile,
  getAllAudioFiles,
} = require('../controllers/audioController');
const { protect } = require('../middleware/authMiddleware');

// All routes require authentication
router.use(protect);

// Folder routes
router.post('/folders', createFolder);
router.get('/folders', getFolders);
router.delete('/folders/:folderId', deleteFolder);

// Audio file routes
router.post('/files', uploadAudioFile);
router.get('/files/:folderId', getAudioFiles);
router.get('/file/:fileId', getAudioFile);
router.get('/stream/:fileId', streamAudioFile);
router.delete('/files/:fileId', deleteAudioFile);
router.get('/all/files', getAllAudioFiles);

module.exports = router;
