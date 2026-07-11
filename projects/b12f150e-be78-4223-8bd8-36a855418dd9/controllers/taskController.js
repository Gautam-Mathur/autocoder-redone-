const express = require('express');
const taskService = require('../services/taskService');
const { validateTaskInput } = require('../middleware/validationMiddleware');

const TaskRouter = express.Router();

/**
 * @implementsFeatures getAllTasks()
 * @implementsFeatures getTaskById()
 * @implementsFeatures createTask()
 * @implementsFeatures updateTask()
 * @implementsFeatures deleteTask()
 */

TaskRouter.get('/tasks', taskService.getAllTasks);
TaskRouter.post('/tasks', validateTaskInput, taskService.createTask);
TaskRouter.put('/tasks/:id', validateTaskInput, taskService.updateTask);
TaskRouter.delete('/tasks/:id', taskService.deleteTask);

module.exports = {
  TaskRouter,
};
