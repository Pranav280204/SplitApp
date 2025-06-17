const mongoose = require('mongoose');
  const Expense = require('../models/Expense');
  const Person = require('../models/Person');
  const Group = require('../models/Group');
  const dotenv = require('dotenv');

  dotenv.config();

  mongoose.connect(process.env.MONGODB_URI)
    .then(async () => {
      console.log('Connected to MongoDB');

      await Expense.deleteMany({});
      await Person.deleteMany({});
      await Group.deleteMany({});

      const people = await Person.insertMany([
        { name: 'Shantanu' },
        { name: 'Sanket' },
        { name: 'Om' },
      ]);

      const group = await Group.create({
        name: 'Trip Group',
        members: ['Shantanu', 'Sanket', 'Om'],
      });

      await Expense.insertMany([
        {
          amount: 600,
          description: 'Dinner at restaurant',
          paid_by: 'Shantanu',
          category: 'Food',
          split_type: 'equal',
          group_id: group._id,
        },
        {
          amount: 450,
          description: 'Groceries',
          paid_by: 'Sanket',
          category: 'Food',
          split_type: 'percentage',
          split_details: [
            { person: 'Shantanu', percentage: 40 },
            { person: 'Sanket', percentage: 30 },
            { person: 'Om', percentage: 30 },
          ],
          group_id: group._id,
        },
        {
          amount: 300,
          description: 'Petrol',
          paid_by: 'Om',
          category: 'Travel',
          split_type: 'exact',
          split_details: [
            { person: 'Shantanu', amount: 100 },
            { person: 'Sanket', amount: 100 },
            { person: 'Om', amount: 100 },
          ],
          group_id: group._id,
        },
        {
          amount: 500,
          description: 'Movie Tickets',
          paid_by: 'Shantanu',
          category: 'Entertainment',
          split_type: 'equal',
          group_id: group._id,
        },
      ]);

      console.log('Database seeded successfully');
      process.exit(0);
    })
    .catch((err) => {
      console.error('Error seeding database:', err);
      process.exit(1);
    });