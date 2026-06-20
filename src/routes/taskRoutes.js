import express from 'express';
import { tasks } from '../data/db.js';

const router = express.Router();

router.get('/', (req, res) => {
  const userTasks = tasks.filter((task) => task.ownerId === req.user.id);
  res.json(userTasks);
});

router.post('/', (req, res) => {
  const { title, description, dueDate, status } = req.body;
  if (!title) {
    return res.status(400).json({ message: 'Title is required' });
  }
  const newTask = {
    id: `${Date.now()}-${Math.random()}`,
    ownerId: req.user.id,
    title,
    description: description || '',
    dueDate: dueDate || null,
    status: status || 'todo',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  tasks.push(newTask);
  res.status(201).json(newTask);
});

router.get('/:id', (req, res) => {
  const task = tasks.find((task) => task.id === req.params.id && task.ownerId === req.user.id);
  if (!task) {
    return res.status(404).json({ message: 'Task not found' });
  }
  res.json(task);
});

router.put('/:id', (req, res) => {
  const task = tasks.find((task) => task.id === req.params.id && task.ownerId === req.user.id);
  if (!task) {
    return res.status(404).json({ message: 'Task not found' });
  }
  const { title, description, dueDate, status } = req.body;
  if (title !== undefined) task.title = title;
  if (description !== undefined) task.description = description;
  if (dueDate !== undefined) task.dueDate = dueDate;
  if (status !== undefined) task.status = status;
  task.updatedAt = new Date().toISOString();
  res.json(task);
});

router.delete('/:id', (req, res) => {
  const index = tasks.findIndex((task) => task.id === req.params.id && task.ownerId === req.user.id);
  if (index === -1) {
    return res.status(404).json({ message: 'Task not found' });
  }
  tasks.splice(index, 1);
  res.status(204).send();
});

export default router;
