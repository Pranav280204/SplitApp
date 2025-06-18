const express = require('express');
   const dotenv = require('dotenv');
   const mongoose = require('mongoose');
   const expenseRoutes = require('./routes/expenses');
   const settlementRoutes = require('./routes/settlements');
   const groupRoutes = require('./routes/groups');

   // Load environment variables
   dotenv.config();

   const app = express();

   // Middleware to parse JSON
   app.use(express.json());

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

   // Root route for backend-only clarification
   app.get('/', (req, res) => {
     res.status(200).json({ success: true, message: 'Split App Backend API. Use /api/health or API endpoints.' });
   });

   // Start server
   const PORT = process.env.PORT || 3000;
   app.listen(PORT, () => {
     console.log(`Server running on port ${PORT}`);
   });
