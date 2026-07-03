(function () {
  const hasMojibake = text => /[\u00c2\u00c3\u00d8\u00d9\u00e2\u00db\u00cc]/.test(text || "");
  const arabicChars = text => (String(text || "").match(/[\u0600-\u06ff]/g) || []).length;
  const mojibakeChars = text => (String(text || "").match(/[\u00c2\u00c3\u00d8\u00d9\u00e2\u00db\u00cc\u0080-\u009f]/g) || []).length;
  const windows1252Reverse = {
    "\u20ac": 0x80,
    "\u201a": 0x82,
    "\u0192": 0x83,
    "\u201e": 0x84,
    "\u2026": 0x85,
    "\u2020": 0x86,
    "\u2021": 0x87,
    "\u02c6": 0x88,
    "\u2030": 0x89,
    "\u0160": 0x8a,
    "\u2039": 0x8b,
    "\u0152": 0x8c,
    "\u017d": 0x8e,
    "\u2018": 0x91,
    "\u2019": 0x92,
    "\u201c": 0x93,
    "\u201d": 0x94,
    "\u2022": 0x95,
    "\u2013": 0x96,
    "\u2014": 0x97,
    "\u02dc": 0x98,
    "\u2122": 0x99,
    "\u0161": 0x9a,
    "\u203a": 0x9b,
    "\u0153": 0x9c,
    "\u017e": 0x9e,
    "\u0178": 0x9f
  };

  function bytesFromMojibake(text) {
    return new Uint8Array(Array.from(text, char => {
      if (Object.prototype.hasOwnProperty.call(windows1252Reverse, char)) {
        return windows1252Reverse[char];
      }

      return char.charCodeAt(0) & 255;
    }));
  }

  function decodeByUtf8Bytes(text) {
    if (typeof TextDecoder === "undefined") return text;

    return new TextDecoder("utf-8").decode(bytesFromMojibake(text));
  }

  function decodeByWindows1252(text) {
    if (typeof TextDecoder === "undefined") return text;

    return new TextDecoder("windows-1252").decode(bytesFromMojibake(text));
  }

  function normalizeKnownArtifacts(text) {
    return String(text || "")
      .replaceAll("\u00e2\u2039\u00af", "\u22ef")
      .replaceAll("\u00c3\u00a2\u00e2\u20ac\u00b9\u00c2\u00af", "\u22ef")
      .replaceAll("\u00c2\u00a0", " ");
  }

  function decodeScore(text) {
    const value = String(text || "");
    const replacements = (value.match(/\ufffd/g) || []).length;
    const questionRuns = (value.match(/\?{2,}/g) || []).length;

    return (arabicChars(value) * 8) - (mojibakeChars(value) * 12) - (replacements * 40) - (questionRuns * 8);
  }

  function decodeMojibake(text) {
    if (typeof text !== "string" || !text) return text;

    let fixed = normalizeKnownArtifacts(text);

    if (!hasMojibake(fixed)) return fixed;

    let current = fixed;
    let best = fixed;
    let bestScore = decodeScore(fixed);

    for (let index = 0; index < 4; index++) {
      if (!hasMojibake(current)) break;

      const attempts = [
        decodeByUtf8Bytes(current),
        decodeByWindows1252(current)
      ];

      let next = current;
      let nextScore = decodeScore(current);

      attempts.forEach(decodedValue => {
        try {
          const decoded = normalizeKnownArtifacts(decodedValue);
          const score = decodeScore(decoded);

          if (decoded && decoded !== current && score > nextScore) {
            next = decoded;
            nextScore = score;
          }
        } catch (error) {
          // Try the next decoder.
        }
      });

      if (next === current) break;

      current = next;

      if (nextScore > bestScore) {
        best = current;
        bestScore = nextScore;
      }
    }

    return best;
  }

  function fixNode(node) {
    if (!node) return;

    if (node.nodeType === Node.TEXT_NODE) {
      const fixed = decodeMojibake(node.nodeValue);
      if (fixed !== node.nodeValue) node.nodeValue = fixed;
      return;
    }

    if (node.nodeType !== Node.ELEMENT_NODE) return;
    if (node.closest("script, style")) return;

    ["placeholder", "title", "aria-label", "alt", "value"].forEach(attr => {
      if (!node.hasAttribute(attr)) return;

      const current = node.getAttribute(attr);
      const fixed = decodeMojibake(current);
      if (fixed !== current) {
        node.setAttribute(attr, fixed);
        if ((node.tagName === "INPUT" || node.tagName === "TEXTAREA" || node.tagName === "OPTION") && attr === "value") {
          node.value = fixed;
        }
      }
    });

    Array.from(node.childNodes).forEach(fixNode);
  }

  function fixDocument(root) {
    if (document.title) {
      document.title = decodeMojibake(document.title);
    }

    fixNode(root || document.body);
  }

  const originalAlert = window.alert;
  const originalConfirm = window.confirm;
  const originalPrompt = window.prompt;

  window.alert = function (message) {
    return originalAlert.call(window, decodeMojibake(String(message ?? "")));
  };

  window.confirm = function (message) {
    return originalConfirm.call(window, decodeMojibake(String(message ?? "")));
  };

  window.prompt = function (message, defaultValue) {
    return originalPrompt.call(
      window,
      decodeMojibake(String(message ?? "")),
      typeof defaultValue === "string" ? decodeMojibake(defaultValue) : defaultValue
    );
  };

  window.__decodeText = decodeMojibake;
  window.__fixTextNodes = fixDocument;

  document.addEventListener("DOMContentLoaded", function () {
    fixDocument(document.body);

    const observer = new MutationObserver(function (mutations) {
      mutations.forEach(function (mutation) {
        if (mutation.type === "characterData") {
          fixNode(mutation.target);
          return;
        }

        if (mutation.type === "attributes") {
          fixNode(mutation.target);
          return;
        }

        mutation.addedNodes.forEach(fixNode);
      });
    });

    observer.observe(document.body, {
      attributes: true,
      attributeFilter: ["placeholder", "title", "aria-label", "alt", "value"],
      childList: true,
      subtree: true,
      characterData: true
    });
  });
})();
