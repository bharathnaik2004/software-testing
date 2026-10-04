# Visual Regression Testing System

## Technologies
- React
- Node.js
- Express
- MongoDB
- Selenium
- Pixelmatch
- PNGJS

## Requirements
- Node.js
- MongoDB
- Google Chrome
- VS Code

## Installation
### Backend
```bash
cd backend
npm install
```

### Frontend
```bash
cd frontend
npm install
```

## Environment
Create a file named `backend/.env` using the example below:

```env
PORT=5000
MONGODB_URI=mongodb://127.0.0.1:27017/visual_regression_testing
JWT_SECRET=change_this_secret
```

You must configure `MONGODB_URI` and `JWT_SECRET` before starting the backend.

If MongoDB is not running locally, start it with MongoDB Server or use MongoDB Atlas. The app will not start without a valid MongoDB connection.

## Run backend
```bash
cd backend
npm run dev
```

## Run frontend
```bash
cd frontend
npm run dev
```

## How the system works
User -> React -> Express -> Selenium -> Screenshot -> Pixelmatch -> PASS/FAIL -> MongoDB -> Report

## How to test
1. Register
2. Login
3. Create a project
4. Create the baseline screenshot
5. Change the website content
6. Run the visual regression test
7. View the result and report

## Demo website
The project includes a local demo page at:

http://localhost:5000/demo/

This page is used to test visual comparisons.
