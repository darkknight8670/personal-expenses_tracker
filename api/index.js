require('dotenv').config();

const serverless = require('serverless-http');
const { app } = require('../server');
const { connectToDatabase } = require('../src/db');

const handler = serverless(app);

module.exports = async (req, res) => {
  try {
    // Ensure database connection is established before handling the request.
    await connectToDatabase();

    return handler(req, res);
  } catch (error) {
    console.error('Serverless function error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
