const mongoose = require('mongoose');

const expenseSchema = new mongoose.Schema(
  {
    request_id: {
      type: String,
      index: true,
      unique: true,
      sparse: true,
      trim: true,
    },
    amount_cents: {
      type: Number,
      required: true,
      min: 1,
      validate: {
        validator: Number.isInteger,
        message: 'amount_cents must be an integer.',
      },
    },
    category: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      required: true,
      trim: true,
    },
    date: {
      type: Date,
      required: true,
      index: true,
    },
  },
  {
    timestamps: {
      createdAt: 'created_at',
      updatedAt: false,
    },
    versionKey: false,
  }
);

const Expense = mongoose.models.Expense || mongoose.model('Expense', expenseSchema);

module.exports = {
  Expense,
};