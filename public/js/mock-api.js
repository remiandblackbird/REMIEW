/*
 * Local mock replacement for the Anthropic API calls the original Claude
 * Artifact prototype made directly from the browser. Every function here
 * returns data shaped exactly like the real API response did, so the rest
 * of the app doesn't need to change. When you're ready to connect the real
 * AI, replace the bodies of these functions with calls to your own backend
 * (never call api.anthropic.com directly from the frontend — see README.md).
 * The original prompts used for each of these are kept in prompts.reference.js.
 */
(function () {
  const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

  const ALLERGEN_KEYWORDS = ['milk', 'dairy', 'egg', 'fish', 'crustacean', 'prawn', 'shrimp', 'crab', 'tree nut', 'almond', 'cashew', 'walnut', 'hazelnut', 'pistachio', 'pecan', 'macadamia', 'peanut', 'sesame', 'soy', 'soybean', 'wheat', 'gluten', 'barley', 'rye', 'oat', 'lupin'];

  const ADDITIVE_LOOKUP = [
    { match: /sucralose/i, className: 'Sweetener', ins: '955' },
    { match: /citric acid/i, className: 'Acidity regulator', ins: '330' },
    { match: /ascorbic acid|vitamin c/i, className: 'Antioxidant', ins: '300' },
    { match: /xanthan gum/i, className: 'Thickener', ins: '415' },
    { match: /sodium benzoate/i, className: 'Preservative', ins: '211' },
    { match: /lecithin/i, className: 'Emulsifier', ins: '322' },
    { match: /annatto/i, className: 'Colour', ins: '160b' },
    { match: /potassium sorbate/i, className: 'Preservative', ins: '202' },
    { match: /sodium bicarbonate|baking soda/i, className: 'Raising agent', ins: '500' },
    { match: /pectin/i, className: 'Thickener', ins: '440' },
  ];

  const SPEC_TEMPLATES = [
    { match: /coconut cream/i, name: 'Coconut cream, regular fat', energy: 908, protein: 1.6, fat: 23.2, sat: 18.8, carb: 1.4, sugars: 1.4, sodium: 16 },
    { match: /coconut water/i, name: 'Coconut water', energy: 87, protein: 0.5, fat: 0.1, sat: 0.09, carb: 4.7, sugars: 4.7, sodium: 17 },
    { match: /cocoa/i, name: 'Cocoa powder', energy: 1420, protein: 20, fat: 12, sat: 7, carb: 36, sugars: 2, sodium: 20 },
    { match: /vanilla/i, name: 'Vanilla extract/flavour', energy: 300, protein: 0.1, fat: 0.1, sat: 0, carb: 12.7, sugars: 12.7, sodium: 5 },
    { match: /whey|protein/i, name: 'Whey protein concentrate', energy: 1620, protein: 78, fat: 6, sat: 4, carb: 6, sugars: 4, sodium: 350 },
    { match: /flavou?r/i, name: 'Natural flavour concentrate', energy: 120, protein: 0, fat: 0.2, sat: 0, carb: 6, sugars: 3, sodium: 8 },
  ];

  function titleCaseFromFilename(filename) {
    const base = filename.replace(/\.[^/.]+$/, '').replace(/[_-]+/g, ' ').trim();
    return base.replace(/\w\S*/g, (w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()) || 'Ingredient';
  }

  function randomRange(min, max) {
    return Math.round((min + Math.random() * (max - min)) * 10) / 10;
  }

  window.RemiewMockAPI = {
    async reviewLabel({ fileName }) {
      console.info('[Remiew mock] reviewLabel() — local placeholder data, not a real AI review.');
      await delay(2600);
      return {
        product_name: fileName ? titleCaseFromFilename(fileName) : 'Sample Product',
        critical: [
          { title: 'Allergen statement not detected', body: 'No "Contains" statement was found in the visible label area — mandatory allergens must be declared.', reference: 'Standard 1.2.3' },
        ],
        warnings: [
          { title: 'Ingredient list order unclear', body: 'Could not fully confirm ingredients are listed in descending order by weight — verify manually.', reference: 'Standard 1.2.4' },
          { title: 'Date mark format', body: 'Date mark is present but the format should be double-checked against the required "best before"/"use by" wording.', reference: 'Standard 1.2.5' },
        ],
        suggestions: [
          { title: 'Font size for mandatory text', body: 'Some mandatory text appears close to the minimum legibility requirement — consider increasing size slightly.', reference: 'Standard 1.2.9' },
        ],
        missing: ['Country of origin statement', 'Manufacturer/importer business address'],
      };
    },

    async extractSpec(file) {
      console.info('[Remiew mock] extractSpec() — local placeholder values for', file.name);
      await delay(1400);
      const hit = SPEC_TEMPLATES.find((t) => t.match.test(file.name));
      if (hit) {
        return { name: hit.name, energy: hit.energy, protein: hit.protein, fat: hit.fat, sat: hit.sat, carb: hit.carb, sugars: hit.sugars, sodium: hit.sodium };
      }
      return {
        name: titleCaseFromFilename(file.name),
        energy: randomRange(200, 1600),
        protein: randomRange(0, 20),
        fat: randomRange(0, 30),
        sat: randomRange(0, 15),
        carb: randomRange(0, 80),
        sugars: randomRange(0, 60),
        sodium: randomRange(0, 800),
      };
    },

    async generateDeclaration(names) {
      console.info('[Remiew mock] generateDeclaration() — local keyword heuristics, not real AI.');
      await delay(1100);
      const items = names.map((name) => {
        const lower = name.toLowerCase();
        const allergen = ALLERGEN_KEYWORDS.some((kw) => lower.includes(kw));
        const additive = ADDITIVE_LOOKUP.find((a) => a.match.test(name));
        return {
          name,
          allergen,
          class_name: additive ? additive.className : null,
          ins_code: additive ? additive.ins : null,
        };
      });
      return { items, flags: [] };
    },

    async checkClaim(claimText, nip) {
      console.info('[Remiew mock] checkClaim() — local keyword heuristics, not real AI.');
      await delay(1300);
      const lower = claimText.toLowerCase();

      if (/organic/.test(lower)) {
        return {
          claim_type: 'organic', type_label: 'Organic claim', verdict: 'needs_evidence', checked_against_nip: false,
          summary_title: 'Requires certification', summary_body: 'Organic claims in Australia are governed by certifier standards (e.g. ACO), not a single mandatory government standard — you need a valid certification to back this up.',
          reference: 'Certifier standard (e.g. ACO)', next_step: 'Confirm current certification covers this product before using the claim.',
        };
      }
      if (/product of|made in|grown in|australian made/.test(lower)) {
        return {
          claim_type: 'country_of_origin', type_label: 'Country of origin claim', verdict: 'needs_evidence', checked_against_nip: false,
          summary_title: 'Check "product of" vs "made in"', summary_body: 'These two phrasings have different legal tests under Country of Origin Food Labelling rules — the ingredients and processing location both matter.',
          reference: 'Country of Origin Food Labelling', next_step: 'Confirm which test this product actually meets before finalising the wording.',
        };
      }
      if (/reduces risk of|prevents|cures|lowers risk of/.test(lower)) {
        return {
          claim_type: 'health_high', type_label: 'High-level health claim', verdict: 'needs_evidence', checked_against_nip: false,
          summary_title: 'High-level claims need pre-approval', summary_body: 'Disease-risk claims are only permitted if they match a pre-approved Schedule 4 relationship, or are separately self-substantiated with rigorous evidence.',
          reference: 'Standard 1.2.7, Schedule 4', next_step: 'Check the claim against the approved high-level health claim list before use.',
        };
      }
      if (/supports|boosts|good for|aids|immunity|digestion|energy levels/.test(lower)) {
        return {
          claim_type: 'health_general', type_label: 'General health claim', verdict: 'needs_evidence', checked_against_nip: false,
          summary_title: 'Needs profiling + substantiation', summary_body: 'General-level health claims require the food to pass the Nutrient Profiling Scoring Criterion and need scientific substantiation on file.',
          reference: 'Standard 1.2.7', next_step: 'Confirm NPSC pass and hold supporting evidence before publishing.',
        };
      }
      if (/fat|sugar|protein|fibre|fiber|sodium|salt|kilojoule|energy|calorie|carb/.test(lower)) {
        if (nip) {
          let verdict = 'insufficient_info';
          let body = 'This nutrition content claim needs a specific numeric threshold check that this local mock cannot fully evaluate — verify against Schedule 4.';
          if (/low fat/.test(lower)) {
            verdict = nip.per100.fat <= 3 ? 'pass' : 'fail';
            body = `"Low fat" broadly requires ≤ 3g fat per 100g. Your calculated NIP shows ${nip.per100.fat}g per 100g.`;
          } else if (/low sugar/.test(lower)) {
            verdict = nip.per100.sugars <= 5 ? 'pass' : 'fail';
            body = `"Low sugar" broadly requires ≤ 5g sugars per 100g. Your calculated NIP shows ${nip.per100.sugars}g per 100g.`;
          }
          return {
            claim_type: 'nutrition_content', type_label: 'Nutrition content claim', verdict, checked_against_nip: verdict !== 'insufficient_info',
            summary_title: 'Checked against your calculated NIP', summary_body: body,
            reference: 'Standard 1.2.7, Schedule 4', next_step: 'Confirm the exact Schedule 4 threshold and wording for this specific claim before use.',
          };
        }
        return {
          claim_type: 'nutrition_content', type_label: 'Nutrition content claim', verdict: 'insufficient_info', checked_against_nip: false,
          summary_title: 'Run the NIP Calculator first', summary_body: 'This is a nutrition content claim governed by Standard 1.2.7 and Schedule 4 — without a calculated NIP this mock can only tell you a claim needs numbers, not whether you meet them.',
          reference: 'Standard 1.2.7, Schedule 4', next_step: 'Calculate your NIP, then re-check this claim.',
        };
      }
      return {
        claim_type: 'marketing_general', type_label: 'General marketing claim', verdict: 'not_fsanz', checked_against_nip: false,
        summary_title: 'Not Food Standards Code territory', summary_body: 'This looks like general marketing language, which falls under the Australian Consumer Law (misleading or deceptive conduct) rather than the Food Standards Code.',
        reference: 'Australian Consumer Law (ACCC)', next_step: 'Make sure you can substantiate this claim if challenged by the ACCC.',
      };
    },

    async chatReply(history, moduleLabel) {
      console.info('[Remiew mock] chatReply() — canned local response, not real AI.');
      await delay(900);
      const lastUser = [...history].reverse().find((m) => m.role === 'user');
      const q = ((lastUser && lastUser.content) || '').toLowerCase();

      if (/allergen/.test(q)) {
        return 'Australia mandates declaration of 10 allergen categories: milk, egg, fish, crustacea, tree nuts, peanuts, sesame, soybean, wheat/gluten cereals, and lupin. They need a "Contains" statement or clear bolding in the ingredient list.\n\n(This is a canned local demo answer — connect the real AI backend for full, current guidance.)';
      }
      if (/country of origin/.test(q)) {
        return '"Product of" and "Made in" claims have different legal tests under Country of Origin Food Labelling rules, generally about where ingredients came from and where processing happened.\n\n(This is a canned local demo answer — connect the real AI backend for full, current guidance.)';
      }
      if (/date mark|use by|best before/.test(q)) {
        return 'Most packaged food needs either a "use by" (safety-critical) or "best before" (quality) date mark, with a few exemptions for things like fresh produce.\n\n(This is a canned local demo answer — connect the real AI backend for full, current guidance.)';
      }
      return `This local prototype is running on mock data, so I can't give a real answer about "${moduleLabel}" topics yet. Connect the Anthropic API through a backend (see README.md) to get real answers here.`;
    },
  };
})();
