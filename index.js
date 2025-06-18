const express = require('express');
const dotenv = require('dotenv');
const mongoose = require('mongoose');
const path = require('path'); // Add path module
const expenseRoutes = require('./routes/expenses');
const settlementRoutes = require('./routes/settlements');
const groupRoutes = require('./routes/groups');

// Load environment variables
dotenv.config();

const app = express();

// Middleware to parse JSON
app.use(express.json());

// Serve static files from the 'public' folder
app.use(express.static(path.join(__dirname, 'public')));

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('Connected to MongoDB'))
  .catch((err) => {
    console.error('MongoDB connection error:', err);
    process.exit(1);
  });

// Routes
app.use('/expenses', expenseRoutes);
app.use('/settlements', settlementRoutes);
app.use('/groups', groupRoutes);

// Basic API health check route
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: 'Split App Backend is running!',
  });
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
