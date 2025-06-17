const Expense = require('../models/Expense');
  const Person = require('../models/Person');
  const Group = require('../models/Group');
  const Joi = require('joi');

  // Validation schemas
  const expenseSchema = Joi.object({
    amount: Joi.number().positive().required(),
    description: Joi.string().min(3).required(),
    paid_by: Joi.string().min(1).required(),
    category: Joi.string().valid('Food', 'Travel', 'Utilities', 'Entertainment', 'Other').optional(),
    split_type: Joi.string().valid('equal', 'percentage', 'exact').required(),
    split_details: Joi.array().items(
      Joi.object({
        person: Joi.string().min(1).required(),
        amount: Joi.number().min(0).when('...split_type', { is: 'exact', then: Joi.required() }),
        percentage: Joi.number().min(0).max(100).when('...split_type', { is: 'percentage', then: Joi.required() }),
      })
    ).optional(),
    group_id: Joi.string().optional(),
    is_recurring: Joi.boolean().optional(),
    recurrence_interval: Joi.string().valid('daily', 'weekly', 'monthly', 'yearly', null).optional(),
  });

  const updateSchema = expenseSchema.fork(Object.keys(expenseSchema.describe().keys), (schema) => schema.optional());

  // Create expense
  exports.createExpense = async (req, res) => {
    try {
      const { error } = expenseSchema.validate(req.body, { context: { split_type: req.body.split_type } });
      if (error) return res.status(400).json({ success: false, message: error.details[0].message });

      const { amount, paid_by, split_type, split_details, group_id } = req.body;

      // Validate paid_by
      const payer = await Person.findOne({ name: paid_by });
      if (!payer) return res.status(400).json({ success: false, message: 'Payer not found' });

      // Validate group_id
      let groupMembers = null;
      if (group_id) {
        const group = await Group.findById(group_id);
        if (!group) return res.status(400).json({ success: false, message: 'Group not found' });
        groupMembers = group.members;
        if (!groupMembers.includes(paid_by)) {
          return res.status(400).json({ success: false, message: 'Payer must be a group member' });
        }
      }

      // Validate split_details
      let validatedSplitDetails = [];
      if (split_type === 'percentage' || split_type === 'exact') {
        if (!split_details || split_details.length === 0) {
          return res.status(400).json({ success: false, message: 'Split details required for custom splits' });
        }

        let total = 0;
        for (const detail of split_details) {
          const person = await Person.findOne({ name: detail.person });
          if (!person) return res.status(400).json({ success: false, message: `Person ${detail.person} not found` });
          if (group_id && !groupMembers.includes(detail.person)) {
            return res.status(400).json({ success: false, message: `Person ${detail.person} not in group` });
          }
          total += split_type === 'percentage' ? detail.percentage : detail.amount;
          validatedSplitDetails.push({
            person: detail.person,
            amount: split_type === 'exact' ? detail.amount : 0,
            percentage: split_type === 'percentage' ? detail.percentage : 0,
          });
        }

        if (split_type === 'percentage' && Math.abs(total - 100) > 0.01) {
          return res.status(400).json({ success: false, message: 'Percentages must sum to 100' });
        }
        if (split_type === 'exact' && Math.abs(total - amount) > 0.01) {
          return res.status(400).json({ success: false, message: 'Exact amounts must sum to total amount' });
        }
      } else if (split_type === 'equal' && group_id) {
        const group = await Group.findById(group_id);
        validatedSplitDetails = group.members.map((member) => ({
          person: member,
          amount: 0,
          percentage: 0,
        }));
      }

      const expense = await Expense.create({
        ...req.body,
        split_details: validatedSplitDetails,
      });

      res.status(201).json({ success: true, data: expense, message: 'Expense added successfully' });
    } catch (err) {
      res.status(500).json({ success: false, message: 'Server error: ' + err.message });
    }
  };

  // Get all expenses
  exports.getExpenses = async (req, res) => {
    try {
      const { group_id } = req.query;
      const query = group_id ? { group_id } : {};
      const expenses = await Expense.find(query).populate('group_id', 'name');
      res.status(200).json({ success: true, data: expenses, message: 'Expenses retrieved successfully' });
    } catch (err) {
      res.status(500).json({ success: false, message: 'Server error: ' + err.message });
    }
  };

  // Update expense
  exports.updateExpense = async (req, res) => {
    try {
      const { error } = updateSchema.validate(req.body, { context: { split_type: req.body.split_type || (await Expense.findById(req.params.id)).split_type } });
      if (error) return res.status(400).json({ success: false, message: error.details[0].message });

      const expense = await Expense.findById(req.params.id);
      if (!expense) return res.status(404).json({ success: false, message: 'Expense not found' });

      const { amount, paid_by, split_type, split_details, group_id } = req.body;

      // Validate paid_by
      if (paid_by) {
        const payer = await Person.findOne({ name: paid_by });
        if (!payer) return res.status(400).json({ success: false, message: 'Payer not found' });
      }

      // Validate group_id
      let groupMembers = null;
      const finalGroupId = group_id || expense.group_id;
      if (finalGroupId) {
        const group = await Group.findById(finalGroupId);
        if (!group) return res.status(400).json({ success: false, message: 'Group not found' });
        groupMembers = group.members;
        if (paid_by && !groupMembers.includes(paid_by)) {
          return res.status(400).json({ success: false, message: 'Payer must be a group member' });
        }
      }

      // Validate split_details
      let validatedSplitDetails = expense.split_details;
      if (split_type || split_details) {
        const finalSplitType = split_type || expense.split_type;
        if (finalSplitType === 'percentage' || finalSplitType === 'exact') {
          if (!split_details || split_details.length === 0) {
            return res.status(400).json({ success: false, message: 'Split details required for custom splits' });
          }

          let total = 0;
          validatedSplitDetails = [];
          for (const detail of split_details) {
            const person = await Person.findOne({ name: detail.person });
            if (!person) return res.status(400).json({ success: false, message: `Person ${detail.person} not found` });
            if (finalGroupId && !groupMembers.includes(detail.person)) {
              return res.status(400).json({ success: false, message: `Person ${detail.person} not in group` });
            }
            total += finalSplitType === 'percentage' ? detail.percentage : detail.amount;
            validatedSplitDetails.push({
              person: detail.person,
              amount: finalSplitType === 'exact' ? detail.amount : 0,
              percentage: finalSplitType === 'percentage' ? detail.percentage : 0,
            });
          }

          const finalAmount = amount || expense.amount;
          if (finalSplitType === 'percentage' && Math.abs(total - 100) > 0.01) {
            return res.status(400).json({ success: false, message: 'Percentages must sum to 100' });
          }
          if (finalSplitType === 'exact' && Math.abs(total - finalAmount) > 0.01) {
            return res.status(400).json({ success: false, message: 'Exact amounts must sum to total amount' });
          }
        } else if (finalSplitType === 'equal' && finalGroupId) {
          const group = await Group.findById(finalGroupId);
          validatedSplitDetails = group.members.map((member) => ({
            person: member,
            amount: 0,
            percentage: 0,
          }));
        }
      }

      Object.assign(expense, req.body, { split_details: validatedSplitDetails });
      await expense.save();
      res.status(200).json({ success: true, data: expense, message: 'Expense updated successfully' });
    } catch (err) {
      res.status(500).json({ success: false, message: 'Server error: ' + err.message });
    }
  };

  // Delete expense
  exports.deleteExpense = async (req, res) => {
    try {
      const expense = await Expense.findById(req.params.id);
      if (!expense) return res.status(404).json({ success: false, message: 'Expense not found' });
      await expense.deleteOne();
      res.status(200).json({ success: true, message: 'Expense deleted successfully' });
    } catch (err) {
      res.status(500).json({ success: false, message: 'Server error: ' + err.message });
    }
  };