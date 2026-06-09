(function () {
  const focusableSelector = [
    "a[href]",
    "button:not([disabled])",
    "input:not([disabled]):not([type='hidden'])",
    "label[for]",
    "select:not([disabled])",
    "textarea:not([disabled])",
    "[tabindex]:not([tabindex='-1'])"
  ].join(",");

  function isVisible(element) {
    if (!element) return false;
    const style = window.getComputedStyle(element);
    if (style.display === "none" || style.visibility === "hidden") return false;
    const rect = element.getBoundingClientRect();
    return rect.width > 0 && rect.height > 0;
  }

  function getFocusableElements() {
    return Array.from(document.querySelectorAll(focusableSelector))
      .filter(element => isVisible(element) && !element.closest("[aria-hidden='true']"));
  }

  function getCenter(rect) {
    return {
      x: rect.left + rect.width / 2,
      y: rect.top + rect.height / 2
    };
  }

  function getDirectionalScore(fromRect, toRect, direction) {
    const from = getCenter(fromRect);
    const to = getCenter(toRect);
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    const absDx = Math.abs(dx);
    const absDy = Math.abs(dy);

    if (direction === "ArrowRight" && dx <= 8) return null;
    if (direction === "ArrowLeft" && dx >= -8) return null;
    if (direction === "ArrowDown" && dy <= 8) return null;
    if (direction === "ArrowUp" && dy >= -8) return null;

    if (direction === "ArrowRight" || direction === "ArrowLeft") {
      return absDx + absDy * 2;
    }

    return absDy + absDx * 2;
  }

  function shouldKeepArrowForText(element, key) {
    const tag = element.tagName;
    const type = String(element.type || "").toLowerCase();
    const isTextField =
      tag === "TEXTAREA" ||
      (tag === "INPUT" && ["text", "tel", "number", "search", "password", "email", "url"].includes(type));

    if (!isTextField) return false;
    if (key === "ArrowUp" || key === "ArrowDown") return false;
    if (tag === "TEXTAREA") return false;

    const valueLength = String(element.value || "").length;
    const start = element.selectionStart || 0;
    const end = element.selectionEnd || 0;

    if (start !== end) return true;
    if (key === "ArrowLeft" && start > 0) return true;
    if (key === "ArrowRight" && end < valueLength) return true;

    return false;
  }

  function moveFocus(direction) {
    const active = document.activeElement;
    const focusables = getFocusableElements();
    const current = focusables.includes(active) ? active : focusables[0];
    if (!current) return;

    const currentRect = current.getBoundingClientRect();
    let bestElement = null;
    let bestScore = Infinity;

    focusables.forEach(element => {
      if (element === current) return;
      const score = getDirectionalScore(currentRect, element.getBoundingClientRect(), direction);
      if (score !== null && score < bestScore) {
        bestScore = score;
        bestElement = element;
      }
    });

    if (!bestElement) {
      const currentIndex = focusables.indexOf(current);
      const offset = direction === "ArrowUp" || direction === "ArrowLeft" ? -1 : 1;
      bestElement = focusables[(currentIndex + offset + focusables.length) % focusables.length];
    }

    bestElement.focus({ preventScroll: true });
    bestElement.scrollIntoView({ block: "nearest", inline: "nearest" });
  }

  function activateElement(element) {
    if (!element) return false;
    const tag = element.tagName;

    if (tag === "BUTTON" || element.getAttribute("role") === "button") {
      element.click();
      return true;
    }

    if (tag === "LABEL" && element.htmlFor) {
      const control = document.getElementById(element.htmlFor);
      element.click();
      if (control) control.focus({ preventScroll: true });
      return true;
    }

    if (tag === "A" && element.href) {
      element.click();
      return true;
    }

    return false;
  }

  function installFocusStyle() {
    if (document.getElementById("keyboardNavigationStyle")) return;

    const style = document.createElement("style");
    style.id = "keyboardNavigationStyle";
    style.textContent = `
      :focus-visible {
        outline: 3px solid rgba(190, 139, 56, .95);
        outline-offset: 3px;
      }
    `;
    document.head.appendChild(style);
  }

  function prepareLabels() {
    document.querySelectorAll("label[for]").forEach(label => {
      const control = document.getElementById(label.htmlFor);
      if (!control) return;

      const type = String(control.type || "").toLowerCase();
      if (type !== "radio" && type !== "checkbox") return;

      if (!label.hasAttribute("tabindex")) {
        label.tabIndex = 0;
      }

      if (!label.hasAttribute("role")) {
        label.setAttribute("role", "button");
      }
    });
  }

  document.addEventListener("DOMContentLoaded", () => {
    installFocusStyle();
    prepareLabels();
  });

  document.addEventListener("keydown", event => {
    const key = event.key;
    const active = document.activeElement;

    if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(key)) {
      if (shouldKeepArrowForText(active, key)) return;
      event.preventDefault();
      moveFocus(key);
      return;
    }

    if (key !== "Enter" || event.shiftKey || event.ctrlKey || event.altKey || event.metaKey) return;
    if (active && active.tagName === "TEXTAREA") return;

    if (activateElement(active)) {
      event.preventDefault();
    }
  });
})();
