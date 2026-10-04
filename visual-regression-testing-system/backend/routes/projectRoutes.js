const express = require('express');
const Project = require('../models/Project');
const TestRun = require('../models/TestRun');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

router.use(protect);

router.get('/', async (req, res) => {
  try {
    const projects = await Project.find({ owner: req.user._id }).sort({ createdAt: -1 });
    res.json(projects);
  } catch (error) {
    res.status(500).json({ message: error.message || 'Failed to fetch projects' });
  }
});

router.post('/', async (req, res) => {
  try {
    const { name, url, description } = req.body;

    if (!name || !url) {
      return res.status(400).json({ message: 'Project name and URL are required' });
    }

    const project = await Project.create({
      name,
      url,
      description: description || '',
      owner: req.user._id
    });

    res.status(201).json(project);
  } catch (error) {
    res.status(500).json({ message: error.message || 'Project creation failed' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const project = await Project.findOne({ _id: req.params.id, owner: req.user._id });
    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    res.json(project);
  } catch (error) {
    res.status(500).json({ message: error.message || 'Failed to fetch project' });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const project = await Project.findOne({ _id: req.params.id, owner: req.user._id });
    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    const { name, url, description } = req.body;
    if (name) project.name = name;
    if (url) project.url = url;
    if (description !== undefined) project.description = description;

    await project.save();
    res.json(project);
  } catch (error) {
    res.status(500).json({ message: error.message || 'Project update failed' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const project = await Project.findOne({ _id: req.params.id, owner: req.user._id });
    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    await TestRun.deleteMany({ project: project._id });
    await project.deleteOne();
    res.json({ message: 'Project deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message || 'Project deletion failed' });
  }
});

module.exports = router;
