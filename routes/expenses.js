const express = require('express');
     const router = express.Router();
     const expenseController = require('../controllers/expenseController');

     router.post('/', expenseController.createExpense);
     router.get('/', expenseController.getExpenses);
     router.put('/:id', expenseController.updateExpense);
     router.delete('/:id', expenseController.deleteExpense);

     module.exports = router;