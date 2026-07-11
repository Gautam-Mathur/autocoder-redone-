const express = require('express');
const taskController = require('../controllers/taskController');

const router = express.Router();

// GET /tasks
router.get('/tasks', taskController.getAllTasks);

// POST /tasks
router.post('/tasks', taskController.createTask);

// PUT /tasks/:id
router.put('/tasks/:id', taskController.updateTask);

// DELETE /tasks/:id
router.delete('/tasks/:id', taskController.deleteTask);

module.exports = router;
