const express = require('express');
const router = express.Router();
const settlementController = require('../controllers/settlementController');

router.get('/people', settlementController.getAllPeople);
router.get('/balances', settlementController.getBalances);
router.get('/settlements', settlementController.getSettlements);

module.exports = router;