const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const connectDB = require('./config/db');

// Import routes
const userRoutes = require('./routes/userRoutes');
const setRoutes = require('./routes/setRoutes');
const quizHistoryRoutes = require('./routes/quizHistoryRoutes'); // Import new routes
const adminRoutes = require('./routes/adminRoutes'); // Import admin routes
const audioRoutes = require('./routes/audioRoutes'); // Import audio routes

// Load env vars
dotenv.config();

// Connect to database
connectDB();

const app = express();

// Body parser with increased limit for audio files (base64)
// Audio files can be large when encoded as base64 (33% larger)
app.use(express.json({ limit: '100mb' }));
app.use(express.urlencoded({ limit: '100mb', extended: true }));

// Enable CORS
app.use(cors({
  origin: '*', // Cho phép tất cả domain
  // credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// Mount routers
app.use('/api/users', userRoutes);
app.use('/api/sets', setRoutes);
app.use('/api/history', quizHistoryRoutes); // Mount new routes
app.use('/api/admin', adminRoutes); // Mount admin routes
app.use('/api/audio', audioRoutes); // Mount audio routes

const PORT = process.env.PORT || 5001;

app.listen(PORT, console.log(`Server running on port ${PORT}`));
