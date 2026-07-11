const express = require('express');
const app = express();
const port = process.env.PORT || 8080;

app.use(express.json());

// Auto-register routes if available
try {
  const taskRoutes = require('./routes/taskRoutes');
  app.use('/api', taskRoutes);
  app.use('/', taskRoutes);
} catch (err) {
  console.log("No taskRoutes found or failed to load:", err.message);
}

app.get('/health', (req, res) => res.json({ status: 'OK', message: 'Fallback server running' }));

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
