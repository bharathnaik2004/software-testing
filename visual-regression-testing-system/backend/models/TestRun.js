const mongoose = require('mongoose');

const testRunSchema = new mongoose.Schema({
  project: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Project',
    required: true
  },
  status: {
    type: String,
    enum: ['PASS', 'FAIL'],
    required: true
  },
  differencePercentage: {
    type: Number,
    default: 0
  },
  failureReason: {
    type: String,
    default: ''
  },
  baselineImage: {
    type: String,
    default: ''
  },
  currentImage: {
    type: String,
    default: ''
  },
  diffImage: {
    type: String,
    default: ''
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('TestRun', testRunSchema);
