const express = require('express');
const fs = require('fs');
const path = require('path');
const { PNG } = require('pngjs');
const Project = require('../models/Project');
const TestRun = require('../models/TestRun');
const { protect } = require('../middleware/authMiddleware');
const { takeScreenshotForUrl, validateWebsiteUrl } = require('../services/seleniumService');
const { compareImages } = require('../services/imageComparisonService');

const router = express.Router();
const THRESHOLD = 1;

const buildPublicUrl = (relativePath) => {
  if (!relativePath) return '';
  return `http://localhost:${process.env.PORT || 5000}${relativePath}`;
};

const buildProjectImagePaths = (projectId, type) => {
  const fileName = `${projectId}-${type}.png`;
  return {
    fileName,
    fullPath: path.resolve(__dirname, '..', 'screenshots', type, fileName),
    publicPath: `/uploads/${type}/${fileName}`
  };
};

const ensureProjectAccess = async (req, projectId) => {
  const project = await Project.findOne({ _id: projectId, owner: req.user._id });
  if (!project) {
    throw new Error('Project not found');
  }
  return project;
};

const invalidUrlResult = (url) => ({
  success: false,
  status: 'INVALID_URL_FORMAT',
  message: 'Invalid URL format',
  explanation: 'The URL format is incorrect. Please enter a complete website URL.',
  example: 'https://example.com/',
  url,
  possibleReasons: ['The URL is missing http:// or https://', 'The domain name is incomplete'],
  suggestedSolution: 'Enter a complete URL that starts with https:// or http://.',
  testedAt: new Date()
});

const websiteErrorStatusCode = (status) => {
  if (status === 'TIMEOUT') return 504;
  if (status === 'WEBSITE_UNAVAILABLE') return 422;
  if (status === 'INVALID_URL_FORMAT') return 400;
  return 502;
};

const sendWebsiteError = (res, error, url) => {
  const status = error.status || 'SELENIUM_ERROR';
  res.status(websiteErrorStatusCode(status)).json({
    success: false,
    status,
    message: error.message || 'The browser could not complete the website check',
    explanation: error.explanation || 'The browser could not capture a screenshot, so no visual comparison was performed.',
    url,
    possibleReasons: error.possibleReasons || ['The browser could not load the website'],
    suggestedSolution: error.suggestedSolution || 'Check the URL and browser setup, then try again.',
    testedAt: new Date()
  });
};

router.use(protect);

router.post('/baseline/:projectId', async (req, res) => {
  try {
    const project = await ensureProjectAccess(req, req.params.projectId);
    if (!validateWebsiteUrl(project.url)) {
      return res.status(400).json(invalidUrlResult(project.url));
    }
    const screenshotData = buildProjectImagePaths(project._id, 'baseline');

    try {
      await takeScreenshotForUrl(project.url, 'baseline', screenshotData.fileName);
    } catch (error) {
      return sendWebsiteError(res, error, project.url);
    }
    project.baselineImage = screenshotData.publicPath;
    await project.save();

    res.json({
      success: true,
      status: 'BASELINE_CREATED',
      message: 'Baseline screenshot created successfully',
      baselineImage: screenshotData.publicPath
    });
  } catch (error) {
    res.status(400).json({ message: error.message || 'Failed to create baseline screenshot' });
  }
});

router.get('/run/:runId', async (req, res) => {
  try {
    const run = await TestRun.findById(req.params.runId).populate('project');
    if (!run) {
      return res.status(404).json({ message: 'Test run not found' });
    }

    const project = await Project.findOne({ _id: run.project._id, owner: req.user._id });
    if (!project) {
      return res.status(403).json({ message: 'Not allowed to view this test run' });
    }

    res.json(run);
  } catch (error) {
    res.status(500).json({ message: error.message || 'Failed to fetch test run' });
  }
});

router.get('/report/:runId', async (req, res) => {
  try {
    const run = await TestRun.findById(req.params.runId).populate('project');
    if (!run) {
      return res.status(404).json({ message: 'Test report not found' });
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
      failureReason: run.failureReason || '',
      threshold: THRESHOLD,
      message: run.status === 'PASS' ? 'Visual test passed' : 'Visual regression detected',
      explanation: run.status === 'PASS'
        ? 'The current webpage matches the approved baseline within the allowed threshold.'
        : 'The current webpage is visually different from the approved baseline.',
      suggestedSolution: run.status === 'PASS'
        ? 'No action is needed.'
        : 'Review the difference image and update the baseline only if the change is expected.',
      baselineImage: buildPublicUrl(run.baselineImage),
      currentImage: buildPublicUrl(run.currentImage),
      diffImage: buildPublicUrl(run.diffImage),
      testDate: run.createdAt
    });
  } catch (error) {
    res.status(500).json({ message: error.message || 'Report fetch failed' });
  }
});

router.post('/run/:projectId', async (req, res) => {
  try {
    const project = await ensureProjectAccess(req, req.params.projectId);
    if (!validateWebsiteUrl(project.url)) {
      return res.status(400).json(invalidUrlResult(project.url));
    }
    if (!project.baselineImage) {
      return res.status(400).json({
        success: false,
        status: 'BASELINE_MISSING',
        message: 'Baseline screenshot is missing',
        explanation: 'A visual comparison needs an approved baseline screenshot.',
        url: project.url,
        possibleReasons: ['A baseline has not been created for this project'],
        suggestedSolution: 'Create a baseline screenshot, then run the visual test again.',
        testedAt: new Date()
      });
    }

    const baselineFileName = `${project._id}-baseline.png`;
    const currentFileName = `${project._id}-current-${Date.now()}.png`;
    const diffFileName = `${project._id}-diff-${Date.now()}.png`;

    const baselinePath = path.resolve(__dirname, '..', 'screenshots', 'baseline', baselineFileName);
    const currentPath = path.resolve(__dirname, '..', 'screenshots', 'current', currentFileName);
    const diffPath = path.resolve(__dirname, '..', 'screenshots', 'diff', diffFileName);

    if (!fs.existsSync(baselinePath)) {
      return res.status(400).json({
        success: false,
        status: 'BASELINE_MISSING',
        message: 'Baseline screenshot is missing',
        explanation: 'The saved baseline image could not be found on the server.',
        url: project.url,
        possibleReasons: ['The baseline image was moved or deleted'],
        suggestedSolution: 'Create a new baseline screenshot, then run the visual test again.',
        testedAt: new Date()
      });
    }

    try {
      await takeScreenshotForUrl(project.url, 'current', currentFileName);
    } catch (error) {
      return sendWebsiteError(res, error, project.url);
    }

    const comparison = compareImages(baselinePath, currentPath);
    if (comparison.error) {
      return res.status(422).json({
        success: false,
        status: 'IMAGE_COMPARISON_ERROR',
        message: 'Image comparison could not be completed',
        explanation: comparison.error,
        url: project.url,
        possibleReasons: ['The baseline or current screenshot is damaged or has incompatible dimensions'],
        suggestedSolution: 'Create a new baseline and run the visual test again.',
        testedAt: new Date()
      });
    }

    if (comparison.diffImage) {
      const diffBuffer = PNG.sync.write(comparison.diffImage);
      fs.writeFileSync(diffPath, diffBuffer);
    }

    const status = comparison.differencePercentage <= THRESHOLD ? 'PASS' : 'FAIL';
    const testedAt = new Date();
    const isPassing = status === 'PASS';

    const testRun = await TestRun.create({
      project: project._id,
      status,
      differencePercentage: comparison.differencePercentage,
      failureReason: isPassing ? '' : 'The current webpage is visually different from the approved baseline.',
      baselineImage: `/uploads/baseline/${baselineFileName}`,
      currentImage: `/uploads/current/${currentFileName}`,
      diffImage: comparison.diffImage ? `/uploads/diff/${diffFileName}` : '',
      createdAt: testedAt
    });

    res.json({
      success: true,
      message: isPassing ? 'Visual test passed' : 'Visual regression detected',
      status,
      explanation: isPassing
        ? 'The current webpage matches the approved baseline within the allowed threshold.'
        : 'The current webpage is visually different from the approved baseline.',
      url: project.url,
      differencePercentage: comparison.differencePercentage,
      threshold: THRESHOLD,
      failureReason: testRun.failureReason,
      possibleReasons: isPassing ? [] : ['The page content, styling, or layout changed since the baseline was approved'],
      suggestedSolution: isPassing
        ? 'No action is needed.'
        : 'Review the difference image and update the baseline only if the change is expected.',
      testedAt,
      baselineImage: `/uploads/baseline/${baselineFileName}`,
      currentImage: `/uploads/current/${currentFileName}`,
      diffImage: comparison.diffImage ? `/uploads/diff/${diffFileName}` : '',
      runId: testRun._id
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      status: 'INTERNAL_ERROR',
      message: 'The visual test could not be completed',
      explanation: error.message || 'The server encountered an unexpected problem before comparison finished.',
      possibleReasons: ['The server or database encountered an error'],
      suggestedSolution: 'Try again. If the problem continues, check the backend logs.'
    });
  }
});

router.get('/:projectId', async (req, res) => {
  try {
    const project = await ensureProjectAccess(req, req.params.projectId);
    const runs = await TestRun.find({ project: project._id }).sort({ createdAt: -1 });
    res.json(runs);
  } catch (error) {
    res.status(400).json({ message: error.message || 'Failed to find project test runs' });
  }
});

router.delete('/:runId', async (req, res) => {
  try {
    const run = await TestRun.findById(req.params.runId).populate('project');
    if (!run) {
      return res.status(404).json({ message: 'Test run not found' });
    }

    const project = await Project.findOne({ _id: run.project._id, owner: req.user._id });
    if (!project) {
      return res.status(403).json({ message: 'Not allowed to delete this test run' });
    }

    await run.deleteOne();
    res.json({ message: 'Test run deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message || 'Failed to delete test run' });
  }
});

module.exports = router;
