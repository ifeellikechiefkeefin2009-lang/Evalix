const express = require('express');
const cors = require('cors');
const { evaluate } = require('./lib/evaluator');

const app = express();
app.use(cors());
app.use(express.json({ limit: '100kb' }));

app.get('/', (req, res) => {
  res.json({ ok: true, message: 'Evalix evaluator running' });
});

app.post('/evaluate', (req, res) => {
  const { response } = req.body || {};
  if (!response || typeof response !== 'string') {
    return res.status(400).json({ error: 'Missing or invalid "response" field (string required).' });
  }

  try {
    const result = evaluate(response);
    return res.json(result);
  } catch (err) {
    console.error('Evaluator error:', err);
    return res.status(500).json({ error: 'Internal evaluator error.' });
  }
});

// Start server when run directly; export app for tests
if (require.main === module) {
  const port = process.env.PORT || 3000;
  app.listen(port, () => {
    // eslint-disable-next-line no-console
    console.log(`Evalix server listening on ${port}`);
  });
}

module.exports = app;
