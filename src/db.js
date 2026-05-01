const mongoose = require('mongoose');

const DEFAULT_MONGODB_URI = 'mongodb://127.0.0.1:27017/fenmo_expense_tracker';
let connectionPromise;

function getMongoUri() {
  return process.env.MONGODB_URI || DEFAULT_MONGODB_URI;
}

async function connectToDatabase() {
  if (mongoose.connection.readyState === 1) {
    return mongoose.connection;
  }

  if (!connectionPromise) {
    connectionPromise = mongoose
      .connect(getMongoUri(), {
        serverSelectionTimeoutMS: 5000,
      })
      .then(() => mongoose.connection)
      .catch((error) => {
        connectionPromise = undefined;
        throw error;
      });
  }

  return connectionPromise;
}

module.exports = {
  connectToDatabase,
  getMongoUri,
};