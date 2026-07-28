require('dotenv').config();
const express = require('express');
const path = require('path');
const apiRoutes = require('./server/routes');
const { hasApiKey, MODEL } = require('./server/anthropicClient');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: '20mb' }));
app.use('/api', apiRoutes);
app.use(express.static(path.join(__dirname, 'public')));

app.listen(PORT, () => {
  console.log(`Remiew running at http://localhost:${PORT}`);
  if (hasApiKey()) {
    console.log(`AI mode: LIVE (model: ${MODEL})`);
  } else {
    console.log('AI mode: MOCK (no ANTHROPIC_API_KEY set in .env — using local mock responses)');
  }
});
