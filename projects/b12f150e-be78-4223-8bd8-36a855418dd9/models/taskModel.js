const mongoose = require('mongoose');

// Define the Task schema
const TaskSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: { type: String, required: false },
  dueDate: { type: Date, required: false },
  status: { type: String, enum: ['pending', 'completed'], default: 'pending' }
});

// Add a method to validate tasks
TaskSchema.methods.validateTask = function() {
  if (!this.name) return false;
  if (this.dueDate && this.status === 'completed') return false;
  return true;
};

const TaskModel = mongoose.model('Task', TaskSchema);
module.exports = { TaskSchema, TaskModel };