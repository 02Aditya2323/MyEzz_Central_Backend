require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const connectDB = require('./config/database');
const orderRoutes = require('./routes/orderRoutes');
const errorHandler = require('./middleware/errorHandler');

// Initialize App
const app = express();

// Connect to Database
connectDB();

// Middleware
app.use(helmet()); // Security headers
app.use(cors()); // Enable CORS for generic access (restrict in production)
app.use(express.json()); // Parse JSON bodies
app.use(morgan('dev')); // Logger

// Routes
app.get('/', (req, res) => {
    res.send('MyEzz Central Backend API is running...');
});

app.use('/api', orderRoutes);

// Error Handling Middleware (must be last)
app.use(errorHandler);

// Start Server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
