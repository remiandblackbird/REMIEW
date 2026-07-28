/*
 * Thin client for the local backend (server.js + server/routes.js). The
 * backend holds the Anthropic API key and calls the real model — or, if no
 * key is configured, returns local mock data automatically. The frontend
 * never talks to Anthropic directly and never sees the key.
 */
(function () {
  async function postJSON(path, body) {
    const res = await fetch(path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || `Request to ${path} failed`);
    }
    return data;
  }

  function readFileAsBase64(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result.split(',')[1]);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  window.RemiewAPI = {
    reviewLabel({ category, market, fileName, mediaType, base64Data }) {
      return postJSON('/api/review-label', { category, market, fileName, mediaType, imageBase64: base64Data });
    },

    async extractSpec(file) {
      const isPdf = file.type === 'application/pdf' || /\.pdf$/i.test(file.name);
      const fileBase64 = await readFileAsBase64(file);
      return postJSON('/api/extract-spec', {
        fileName: file.name,
        mediaType: file.type || (isPdf ? 'application/pdf' : 'image/png'),
        isPdf,
        fileBase64,
      });
    },

    generateDeclaration(names) {
      return postJSON('/api/generate-declaration', { names });
    },

    checkClaim(claimText, nip) {
      return postJSON('/api/check-claim', { claimText, nip });
    },

    async chatReply(history, moduleLabel) {
      const data = await postJSON('/api/chat', { history, moduleLabel });
      return data.reply;
    },
  };
})();
