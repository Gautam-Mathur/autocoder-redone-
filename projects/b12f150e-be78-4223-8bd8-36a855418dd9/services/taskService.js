const TaskModel = require('models/taskModel');

class TaskService {
  async getAllTasks() {
    try {
      const tasks = await TaskModel.findAll();
      return tasks;
    } catch (error) {
      throw new Error('Failed to fetch tasks: ' + error.message);
    }
  }

  async getTaskById(id) {
    try {
      const task = await TaskModel.findByPk(id);
      if (!task) {
        throw new Error('Task not found');
      }
      return task;
    } catch (error) {
      throw new Error('Failed to fetch task: ' + error.message);
    }
  }

  async createTask(task) {
    try {
      const newTask = await TaskModel.create(task);
      return newTask;
    } catch (error) {
      throw new Error('Failed to create task: ' + error.message);
    }
  }

  async updateTask(id, task) {
    try {
      const updatedTask = await TaskModel.update(task, { where: { id } });
      if (updatedTask[0] === 0) {
        throw new Error('Task not found');
      }
      return updatedTask;
    } catch (error) {
      throw new Error('Failed to update task: ' + error.message);
    }
  }

  async deleteTask(id) {
    try {
      const deleted = await TaskModel.destroy({ where: { id } });
      if (!deleted) {
        throw new Error('Task not found');
      }
      return true;
    } catch (error) {
      throw new Error('Failed to delete task: ' + error.message);
    }
  }
}

module.exports = TaskService;