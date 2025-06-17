const mongoose = require('mongoose');

  const expenseSchema = new mongoose.Schema({
    amount: {
      type: Number,
      required: true,
      min: [0.01, 'Amount must be positive'],
    },
    description: {
      type: String,
      required: true,
      trim: true,
    },
    paid_by: {
      type: String,
      required: true,
      trim: true,
    },
    category: {
      type: String,
      enum: ['Food', 'Travel', 'Utilities', 'Entertainment', 'Other'],
      default: 'Other',
    },
    split_type: {
      type: String,
      enum: ['equal', 'percentage', 'exact'],
      default: 'equal',
    },
    split_details: [{
      person: { type: String, required: true, trim: true },
      amount: { type: Number, min: 0 },
      percentage: { type: Number, min: 0, max: 100 },
    }],
    group_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Group',
    },
    is_recurring: {
      type: Boolean,
      default: false,
    },
    recurrence_interval: {
      type: String,
      enum: ['daily', 'weekly', 'monthly', 'yearly', null],
      default: null,
    },
    created_at: {
      type: Date,
      default: Date.now,
    },
  });

  module.exports = mongoose.model('Expense', expenseSchema);