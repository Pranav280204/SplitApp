const mongoose = require('mongoose');

     const groupSchema = new mongoose.Schema({
       name: { type: String, required: true, unique: true },
       members: [{ type: String, required: true }],
       created_at: { type: Date, default: Date.now },
     });

     module.exports = mongoose.model('Group', groupSchema);