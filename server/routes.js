const express = require('express');
const anthropic = require('./anthropicClient');
const prompts = require('./prompts');
const mock = require('./mock');

const router = express.Router();

function useMock() {
  return !anthropic.hasApiKey();
}

router.post('/review-label', async (req, res) => {
  try {
    const { category, market, fileName, mediaType, imageBase64 } = req.body;
    if (useMock()) {
      return res.json(await mock.reviewLabel({ fileName }));
    }
    const text = await anthropic.createMessage({
      system: prompts.labelReviewSystemPrompt(market, category),
      messages: [{
        role: 'user',
        content: [
          { type: 'image', source: { type: 'base64', media_type: mediaType, data: imageBase64 } },
          { type: 'text', text: 'Review this food/beverage label.' },
        ],
      }],
      maxTokens: 1000,
    });
    res.json(anthropic.parseJsonResponse(text));
  } catch (err) {
    console.error('review-label failed:', err);
    res.status(500).json({ error: err.message || 'Label review failed' });
  }
});

router.post('/extract-spec', async (req, res) => {
  try {
    const { fileName, mediaType, isPdf, fileBase64 } = req.body;
    if (useMock()) {
      return res.json(await mock.extractSpec({ fileName }));
    }
    const contentBlock = isPdf
      ? { type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: fileBase64 } }
      : { type: 'image', source: { type: 'base64', media_type: mediaType || 'image/png', data: fileBase64 } };
    const text = await anthropic.createMessage({
      system: prompts.SPEC_EXTRACTION_SYSTEM_PROMPT,
      messages: [{
        role: 'user',
        content: [contentBlock, { type: 'text', text: 'Extract the per-100g nutritional values from this spec sheet.' }],
      }],
      maxTokens: 500,
    });
    res.json(anthropic.parseJsonResponse(text));
  } catch (err) {
    console.error('extract-spec failed:', err);
    res.status(500).json({ error: err.message || 'Spec extraction failed' });
  }
});

router.post('/generate-declaration', async (req, res) => {
  try {
    const { names } = req.body;
    if (useMock()) {
      return res.json(await mock.generateDeclaration(names));
    }
    const text = await anthropic.createMessage({
      system: prompts.DECLARATION_SYSTEM_PROMPT,
      messages: [{ role: 'user', content: JSON.stringify(names) }],
      maxTokens: 800,
    });
    res.json(anthropic.parseJsonResponse(text));
  } catch (err) {
    console.error('generate-declaration failed:', err);
    res.status(500).json({ error: err.message || 'Declaration generation failed' });
  }
});

router.post('/check-claim', async (req, res) => {
  try {
    const { claimText, nip } = req.body;
    if (useMock()) {
      return res.json(await mock.checkClaim(claimText, nip));
    }
    const nipContext = nip
      ? `The user has a calculated NIP available: per 100g — Energy ${nip.per100.energy}kJ, Protein ${nip.per100.protein}g, Fat total ${nip.per100.fat}g, Saturated fat ${nip.per100.sat}g, Carbohydrate ${nip.per100.carb}g, Sugars ${nip.per100.sugars}g, Sodium ${nip.per100.sodium}mg. Per serving (${nip.servingG}g) — Energy ${nip.perServe.energy}kJ, Protein ${nip.perServe.protein}g, Fat total ${nip.perServe.fat}g, Saturated fat ${nip.perServe.sat}g, Carbohydrate ${nip.perServe.carb}g, Sugars ${nip.perServe.sugars}g, Sodium ${nip.perServe.sodium}mg. If this claim is a nutrition content claim, use these numbers to check it directly.`
      : `No calculated NIP is available for this product. If this claim is a nutrition content claim, you cannot confirm pass/fail — only state the threshold and mark checked_against_nip as false.`;
    const text = await anthropic.createMessage({
      system: prompts.claimsReviewSystemPrompt(nipContext),
      messages: [{ role: 'user', content: `Claim to check: "${claimText}"` }],
      maxTokens: 700,
    });
    res.json(anthropic.parseJsonResponse(text));
  } catch (err) {
    console.error('check-claim failed:', err);
    res.status(500).json({ error: err.message || 'Claim check failed' });
  }
});

router.post('/chat', async (req, res) => {
  try {
    const { history, moduleLabel } = req.body;
    if (useMock()) {
      return res.json({ reply: await mock.chatReply(history, moduleLabel) });
    }
    const reply = await anthropic.createMessage({
      system: prompts.chatSystemPrompt(moduleLabel),
      messages: history,
      maxTokens: 600,
    });
    res.json({ reply: reply || "Sorry, I didn't get a response — try again." });
  } catch (err) {
    console.error('chat failed:', err);
    res.status(500).json({ error: err.message || 'Chat failed' });
  }
});

module.exports = router;
