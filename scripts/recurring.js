const mongoose = require('mongoose');
   const Expense = require('../models/Expense');
   const dotenv = require('dotenv');

   dotenv.config();

   mongoose.connect(process.env.MONGODB_URI)
     .then(async () => {
       console.log('Connected to MongoDB');

       // Create a recurring expense (e.g., monthly rent)
       const recurringExpense = {
         amount: 1500,
         description: 'Monthly Rent',
         paid_by: 'Shantanu',
         category: 'Utilities',
         split_type: 'equal',
         is_recurring: true,
         recurrence_interval: 'monthly',
       };

       const now = new Date();
       const expense = new Expense({
         ...recurringExpense,
         created_at: now,
       });
       await expense.save();

       console.log('Recurring expense added');
       process.exit(0);
     })
     .catch(err => {
       console.error('Error:', err);
       process.exit(1);
     });