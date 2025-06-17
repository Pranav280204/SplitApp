const Group = require('../models/Group');
  const Person = require('../models/Person');
  const Joi = require('joi');

  // Validation schema
  const groupSchema = Joi.object({
    name: Joi.string().min(3).required(),
    members: Joi.array().items(Joi.string().min(1)).min(1).required(),
  });

  const addMemberSchema = Joi.object({
    group_id: Joi.string().required(),
    member: Joi.string().min(1).required(),
  });

  // Create a group
  exports.createGroup = async (req, res) => {
    try {
      const { error } = groupSchema.validate(req.body);
      if (error) return res.status(400).json({ success: false, message: error.details[0].message });

      const { name, members } = req.body;

      const existingGroup = await Group.findOne({ name });
      if (existingGroup) return res.status(400).json({ success: false, message: 'Group name already exists' });

      for (const member of members) {
        let person = await Person.findOne({ name: member });
        if (!person) {
          person = await Person.create({ name: member });
        }
      }

      const group = await Group.create({ name, members });
      res.status(201).json({ success: true, data: group, message: 'Group created successfully' });
    } catch (err) {
      res.status(500).json({ success: false, message: 'Server error: ' + err.message });
    }
  };

  // Get all groups
  exports.getGroups = async (req, res) => {
    try {
      const groups = await Group.find();
      res.status(200).json({ success: true, data: groups, message: 'Groups retrieved successfully' });
    } catch (err) {
      res.status(500).json({ success: false, message: 'Server error: ' + err.message });
    }
  };

  // Add member to group
  exports.addMember = async (req, res) => {
    try {
      const { error } = addMemberSchema.validate(req.body);
      if (error) return res.status(400).json({ success: false, message: error.details[0].message });

      const { group_id, member } = req.body;
      const group = await Group.findById(group_id);
      if (!group) return res.status(404).json({ success: false, message: 'Group not found' });

      if (group.members.includes(member)) {
        return res.status(400).json({ success: false, message: 'Member already in group' });
      }

      let person = await Person.findOne({ name: member });
      if (!person) {
        person = await Person.create({ name: member });
      }

      group.members.push(member);
      await group.save();
      res.status(200).json({ success: true, data: group, message: 'Member added successfully' });
    } catch (err) {
      res.status(500).json({ success: false, message: 'Server error: ' + err.message });
    }
  };