import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { users } from '../data/db.js';

const router = express.Router();
const SECRET = process.env.JWT_SECRET || 'dev_secret_key';

router.post('/register', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ message: 'Email and password are required' });
  }
  const existing = users.find((user) => user.email === email.toLowerCase());
  if (existing) {
    return res.status(409).json({ message: 'Email already registered' });
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const newUser = {
    id: `${Date.now()}-${Math.random()}`,
    email: email.toLowerCase(),
    passwordHash,
  };
  users.push(newUser);
  const token = jwt.sign({ id: newUser.id, email: newUser.email }, SECRET, { expiresIn: '8h' });
  res.status(201).json({ token, user: { id: newUser.id, email: newUser.email } });
});

router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ message: 'Email and password are required' });
  }

  const user = users.find((user) => user.email === email.toLowerCase());
  if (!user) {
    return res.status(401).json({ message: 'Invalid credentials' });
  }

  const validPassword = await bcrypt.compare(password, user.passwordHash);
  if (!validPassword) {
    return res.status(401).json({ message: 'Invalid credentials' });
  }

  const token = jwt.sign({ id: user.id, email: user.email }, SECRET, { expiresIn: '8h' });
  res.json({ token, user: { id: user.id, email: user.email } });
});

export default router;
