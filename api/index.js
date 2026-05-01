const serverless = require('serverless-http');
const { app } = require('../server');
export default function handler(req, res) {
  res.status(200).send("Backend is working 🚀");
}
module.exports = serverless(app);
