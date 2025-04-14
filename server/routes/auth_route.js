const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');

const router = express.Router();

// "Database" for development, something like Mongo for prod
const users = [
  {
    id: 1,
    username: 'admin',
    passwordHash: '$2b$10$X7SogAYSvtNIzc5gYJKqDeRbJp1p8ZV9mxj/FG9krS3ElGOxMNO3G' // Example hashed password for prod
  }
];

router.post('/login', async (req, res) => {
  const { username, password } = req.body;
  
  const user = users.find(u => u.username === username);
  if (!user) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }
  
  const validPassword = await bcrypt.compare(password, user.passwordHash);
  if (!validPassword) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }
  
  const token = jwt.sign(
    { id: user.id, username: user.username },
    process.env.JWT_SECRET,
    { expiresIn: '1h' }
  );
  
  res.json({ token });
});

module.exports = router;