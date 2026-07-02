const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuid } = require('uuid');
const { transact } = require('../db');
const { JWT_SECRET } = require('../middleware/auth');

const router = express.Router();

function issueToken(manager) {
  return jwt.sign({ sub: manager.id, username: manager.username }, JWT_SECRET, {
    expiresIn: '7d'
  });
}

// POST /api/auth/register
router.post('/register', async (req, res) => {
  const { username, password } = req.body || {};
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required.' });
  }
  if (password.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters.' });
  }

  try {
    const result = await transact(async (data) => {
      const exists = data.managers.find(
        (m) => m.username.toLowerCase() === username.toLowerCase()
      );
      if (exists) {
        return { error: 'That username is already taken.' };
      }
      const passwordHash = await bcrypt.hash(password, 10);
      const manager = {
        id: uuid(),
        username,
        passwordHash,
        createdAt: new Date().toISOString()
      };
      data.managers.push(manager);
      return { manager };
    });

    if (result.error) return res.status(409).json({ error: result.error });

    const token = issueToken(result.manager);
    res.status(201).json({
      token,
      manager: { id: result.manager.id, username: result.manager.username }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not create account. Please try again.' });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  const { username, password } = req.body || {};
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required.' });
  }

  const { load } = require('../db');
  const data = load();
  const manager = data.managers.find(
    (m) => m.username.toLowerCase() === username.toLowerCase()
  );
  if (!manager) {
    return res.status(401).json({ error: 'Incorrect username or password.' });
  }

  const ok = await bcrypt.compare(password, manager.passwordHash);
  if (!ok) {
    return res.status(401).json({ error: 'Incorrect username or password.' });
  }

  const token = issueToken(manager);
  res.json({ token, manager: { id: manager.id, username: manager.username } });
});

// GET /api/auth/me
router.get('/me', require('../middleware/auth').requireAuth, (req, res) => {
  res.json({ manager: req.manager });
});

module.exports = router;
