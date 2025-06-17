const Expense = require('../models/Expense');
  const Person = require('../models/Person');
  const Group = require('../models/Group');

  // Get all people
  exports.getAllPeople = async (req, res) => {
    try {
      const { group_id } = req.query;
      let people;
      if (group_id) {
        const group = await Group.findById(group_id);
        if (!group) return res.status(404).json({ success: false, message: 'Group not found' });
        people = await Person.find({ name: { $in: group.members } }).select('name');
      } else {
        people = await Person.find().select('name');
      }
      res.status(200).json({
        success: true,
        data: people.map(p => p.name),
        message: 'People retrieved successfully',
      });
    } catch (err) {
      res.status(500).json({
        success: false,
        message: 'Server error: ' + err.message,
      });
    }
  };

  // Get balances
  exports.getBalances = async (req, res) => {
    try {
      const { group_id } = req.query;
      const query = group_id ? { group_id } : {};
      const expenses = await Expense.find(query);
      let people = await Person.find().select('name');
      let groupMembers = null;

      if (group_id) {
        const group = await Group.findById(group_id);
        if (!group) return res.status(404).json({ success: false, message: 'Group not found' });
        groupMembers = group.members;
        people = people.filter(p => groupMembers.includes(p.name));
      }

      const balances = {};
      people.forEach(person => {
        balances[person.name] = { paid: 0, owed: 0, balance: 0 };
      });

      for (const expense of expenses) {
        const { amount, paid_by, split_type, split_details } = expense;
        balances[paid_by].paid += amount;

        if (split_type === 'equal') {
          const participants = group_id ? groupMembers : people.map(p => p.name);
          const share = amount / participants.length;
          participants.forEach(person => {
            balances[person].owed += share;
          });
        } else if (split_type === 'percentage' && split_details) {
          split_details.forEach(split => {
            balances[split.person].owed += (amount * split.percentage) / 100;
          });
        } else if (split_type === 'exact' && split_details) {
          split_details.forEach(split => {
            balances[split.person].owed += split.amount;
          });
        }
      }

      Object.keys(balances).forEach(person => {
        balances[person].balance = parseFloat((balances[person].paid - balances[person].owed).toFixed(2));
      });

      res.status(200).json({
        success: true,
        data: balances,
        message: 'Balances retrieved successfully',
      });
    } catch (err) {
      res.status(500).json({
        success: false,
        message: 'Server error: ' + err.message,
      });
    }
  };

  // Get simplified settlements
  exports.getSettlements = async (req, res) => {
    try {
      const { group_id } = req.query;
      const query = group_id ? { group_id } : {};
      const expenses = await Expense.find(query);
      let people = await Person.find().select('name');
      let groupMembers = null;

      if (group_id) {
        const group = await Group.findById(group_id);
        if (!group) return res.status(404).json({ success: false, message: 'Group not found' });
        groupMembers = group.members;
        people = people.filter(p => groupMembers.includes(p.name));
      }

      const balances = {};
      people.forEach(person => {
        balances[person.name] = 0;
      });

      for (const expense of expenses) {
        const { amount, paid_by, split_type, split_details } = expense;
        balances[paid_by] += amount;

        if (split_type === 'equal') {
          const participants = group_id ? groupMembers : people.map(p => p.name);
          const share = amount / participants.length;
          participants.forEach(person => {
            balances[person] -= share;
          });
        } else if (split_type === 'percentage' && split_details) {
          split_details.forEach(split => {
            balances[split.person] -= (amount * split.percentage) / 100;
          });
        } else if (split_type === 'exact' && split_details) {
          split_details.forEach(split => {
            balances[split.person] -= split.amount;
          });
        }
      }

      const settlements = [];
      const sortedBalances = Object.entries(balances)
        .map(([person, balance]) => ({ person, balance: parseFloat(balance.toFixed(2)) }))
        .filter(b => Math.abs(b.balance) > 0.01)
        .sort((a, b) => b.balance - a.balance);

      let i = 0, j = sortedBalances.length - 1;
      while (i < j) {
        const creditor = sortedBalances[i];
        const debtor = sortedBalances[j];
        const amount = Math.min(creditor.balance, -debtor.balance);

        if (amount > 0.01) {
          settlements.push({
            from: debtor.person,
            to: creditor.person,
            amount: parseFloat(amount.toFixed(2)),
          });
          creditor.balance -= amount;
          debtor.balance += amount;
        }

        if (Math.abs(creditor.balance) < 0.01) i++;
        if (Math.abs(debtor.balance) < 0.01) j--;
      }

      res.status(200).json({
        success: true,
        data: settlements,
        message: 'Settlements retrieved successfully',
      });
    } catch (err) {
      res.status(500).json({
        success: false,
        message: 'Server error: ' + err.message,
      });
    }
  };

  // Get category-wise summary
  exports.getCategorySummary = async (req, res) => {
    try {
      const { group_id } = req.query;
      const query = group_id ? { group_id } : {};
      const summary = await Expense.aggregate([
        { $match: query },
        {
          $group: {
            _id: '$category',
            total: { $sum: '$amount' },
            count: { $sum: 1 },
          },
        },
        {
          $project: {
            category: '$_id',
            total: 1,
            count: 1,
            _id: 0,
          },
        },
      ]);

      res.status(200).json({
        success: true,
        data: summary,
        message: 'Category summary retrieved successfully',
      });
    } catch (err) {
      res.status(500).json({
        success: false,
        message: 'Server error: ' + err.message,
      });
    }
  };