import express from 'express';

const app = express();
const port = 3000;

app.get('/mock', (req, res) => {
  res.json({ message: 'Mock data', status: 'success' });
});

app.listen(port, () => {
  console.log(`Server listening at http://localhost:${port}`);
});

// Keep server running and handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n👋 Shutting down mock server...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n👋 Shutting down mock server...');
  process.exit(0);
});