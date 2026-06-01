(function () {
  const latinDecoder = typeof TextDecoder !== "undefined"
    ? new TextDecoder("windows-1252")
    : null;

  function decodeLatinMojibake(text) {
    if (!latinDecoder) {
      return text;
    }

    const bytes = new Uint8Array(Array.from(text, char => char.charCodeAt(0) & 255));
    return latinDecoder.decode(bytes);
  }

  function decodeMojibake(text) {
    if (typeof text !== "string" || !text) {
      return text;
    }

    let fixed = text;

    if (fixed.includes("â‹¯")) {
      fixed = fixed.replaceAll("â‹¯", "⋯");
    }

    if (/[ØÙÃ]/.test(fixed)) {
      try {
        fixed = decodeLatinMojibake(fixed);
      } catch (error) {
        return fixed;
      }
    }

    if (fixed.trim() === "القائمة") {
      return "Menu";
    }

    return fixed;
  }

  function fixNode(node) {
    if (!node) {
      return;
    }

    if (node.nodeType === Node.TEXT_NODE) {
      const fixed = decodeMojibake(node.nodeValue);
      if (fixed !== node.nodeValue) {
        node.nodeValue = fixed;
      }
      return;
    }

    if (node.nodeType !== Node.ELEMENT_NODE) {
      return;
    }

    ["placeholder", "title", "aria-label", "value"].forEach(attr => {
      if (!node.hasAttribute(attr)) {
        return;
      }

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

        mutation.addedNodes.forEach(fixNode);
      });
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
      characterData: true
    });
  });
})();
