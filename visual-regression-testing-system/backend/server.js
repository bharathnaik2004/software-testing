const path = require('path');
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const dotenv = require('dotenv');

const authRoutes = require('./routes/authRoutes');
const projectRoutes = require('./routes/projectRoutes');
const testRoutes = require('./routes/testRoutes');
const reportRoutes = require('./routes/reportRoutes');

dotenv.config({ path: path.resolve(__dirname, '.env') });

const app = express();
const PORT = process.env.PORT || 5000;

if (!process.env.MONGODB_URI) {
  throw new Error('MongoDB URI is missing. Please configure MONGODB_URI in backend/.env');
}

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

app.use('/uploads', express.static(path.join(__dirname, 'screenshots')));
app.use('/demo', express.static(path.join(__dirname, 'test-website')));

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Visual Regression API is running' });
});

app.use('/api/auth', authRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/tests', testRoutes);
app.use('/api/reports', reportRoutes);

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ message: err.message || 'Server error' });
});

const startServer = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('MongoDB connected successfully');

    app.listen(PORT, () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error('MongoDB connection error:', error.message);
    process.exit(1);
  }
};

startServer();
