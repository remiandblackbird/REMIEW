const Anthropic = require('@anthropic-ai/sdk');

const MODEL = process.env.CLAUDE_MODEL || 'claude-opus-5';
const EFFORT = process.env.CLAUDE_EFFORT || 'medium';

let client = null;
function getClient() {
  if (!client) client = new Anthropic();
  return client;
}

function hasApiKey() {
  return !!process.env.ANTHROPIC_API_KEY;
}

function extractText(content) {
  return (content || []).map((b) => b.text || '').join('\n').trim();
}

function parseJsonResponse(text) {
  const cleaned = text.replace(/^```json/i, '').replace(/^```/, '').replace(/```$/, '').trim();
  return JSON.parse(cleaned);
}

async function createMessage({ system, messages, maxTokens = 1000 }) {
  const response = await getClient().messages.create({
    model: MODEL,
    max_tokens: maxTokens,
    system,
    messages,
    output_config: { effort: EFFORT },
  });
  return extractText(response.content);
}

module.exports = { hasApiKey, createMessage, parseJsonResponse, MODEL, EFFORT };
