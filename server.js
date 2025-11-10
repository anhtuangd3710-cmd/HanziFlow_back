const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const connectDB = require('./config/db');

// Import routes
const userRoutes = require('./routes/userRoutes');
const setRoutes = require('./routes/setRoutes');
const quizHistoryRoutes = require('./routes/quizHistoryRoutes'); // Import new routes

// Load env vars
dotenv.config();

// Connect to database
connectDB();

const app = express();

// Body parser
app.use(express.json());

// Enable CORS
app.use(cors({
  origin: '*', // Cho phép tất cả domain
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// Mount routers
app.use('/api/users', userRoutes);
app.use('/api/sets', setRoutes);
app.use('/api/history', quizHistoryRoutes); // Mount new routes

const PORT = process.env.PORT || 5001;

app.listen(PORT, console.log(`Server running on port ${PORT}`));



