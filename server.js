
const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const helmet = require('helmet');
const hpp = require('hpp');
const cookieParser = require('cookie-parser');
const rateLimit = require('express-rate-limit');
const connectDB = require('./config/db');

// Import routes
const userRoutes = require('./routes/userRoutes');
const setRoutes = require('./routes/setRoutes');
const quizHistoryRoutes = require('./routes/quizHistoryRoutes');

// Load env vars
dotenv.config();

// Connect to database
connectDB();

const app = express();

// Security Middleware
app.use(helmet()); // Set security headers
app.use(hpp()); // Prevent HTTP Parameter Pollution

// Rate Limiting
const authLimiter = rateLimit({
	windowMs: 15 * 60 * 1000, // 15 minutes
	max: 10, // Limit each IP to 10 login/register requests per windowMs
	standardHeaders: true, 
	legacyHeaders: false, 
    message: 'Too many authentication attempts from this IP, please try again after 15 minutes'
});


// Body parser & Cookie Parser
app.use(express.json());
app.use(cookieParser());

app.use(cors({
  origin: '*', // Cho phép tất cả domain
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
// Mount routers
app.use('/api/users', userRoutes);
app.use('/api/sets', setRoutes);
app.use('/api/history', quizHistoryRoutes);

// Apply the auth limiter to specific routes
app.use('/api/users/login', authLimiter);
app.use('/api/users/register', authLimiter);


const PORT = process.env.PORT || 5001;

app.listen(PORT, console.log(`Server running on port ${PORT}`));


