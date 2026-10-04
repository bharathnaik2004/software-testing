const express = require('express');
const Project = require('../models/Project');
const TestRun = require('../models/TestRun');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

const buildPublicUrl = (relativePath) => {
  if (!relativePath) return '';
  return `http://localhost:${process.env.PORT || 5000}${relativePath}`;
};

router.get('/:runId', protect, async (req, res) => {
  try {
    const run = await TestRun.findById(req.params.runId).populate('project');
    if (!run) {
      return res.status(404).json({ message: 'Report not found' });
    }

    const project = await Project.findOne({ _id: run.project._id, owner: req.user._id });
    if (!project) {
      return res.status(403).json({ message: 'Not allowed to access this report' });
    }

    res.json({
      projectName: project.name,
      url: project.url,
      status: run.status,
      differencePercentage: run.differencePercentage,
      baselineImage: buildPublicUrl(run.baselineImage),
      currentImage: buildPublicUrl(run.currentImage),
      diffImage: buildPublicUrl(run.diffImage),
      testDate: run.createdAt
    });
  } catch (error) {
    res.status(500).json({ message: error.message || 'Failed to load report' });
  }
});

module.exports = router;
