const fs = require('fs');
const path = require('path');
const { PNG } = require('pngjs');
const pixelmatch = require('pixelmatch');

const compareImages = (baselinePath, currentPath) => {
  try {
    if (!fs.existsSync(baselinePath) || !fs.existsSync(currentPath)) {
      return {
        differencePercentage: 100,
        diffPixels: 0,
        totalPixels: 0,
        status: 'FAIL',
        error: 'Baseline or current screenshot does not exist.'
      };
    }

    const baseline = PNG.sync.read(fs.readFileSync(baselinePath));
    const current = PNG.sync.read(fs.readFileSync(currentPath));

    const width = Math.max(baseline.width, current.width);
    const height = Math.max(baseline.height, current.height);

    if (baseline.width !== current.width || baseline.height !== current.height) {
      return {
        differencePercentage: 100,
        diffPixels: width * height,
        totalPixels: width * height,
        status: 'FAIL',
        error: 'Image dimensions differ. This is a visual difference and should be reported.'
      };
    }

    const diff = new PNG({ width: baseline.width, height: baseline.height });
    const diffPixels = pixelmatch(baseline.data, current.data, diff.data, baseline.width, baseline.height, { threshold: 0.1 });
    const totalPixels = baseline.width * baseline.height;
    const differencePercentage = (diffPixels / totalPixels) * 100;

    return {
      differencePercentage: Number(differencePercentage.toFixed(2)),
      diffPixels,
      totalPixels,
      status: differencePercentage <= 1 ? 'PASS' : 'FAIL',
      diffImage: diff
    };
  } catch (error) {
    return {
      differencePercentage: 100,
      diffPixels: 0,
      totalPixels: 0,
      status: 'FAIL',
      error: error.message || 'Image comparison failed.'
    };
  }
};

module.exports = { compareImages };
