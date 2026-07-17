(() => {
  "use strict";

  if (document.getElementById("floatingCalculator")) return;

  const POSITION_KEY = "romeo-pos-calculator-position";
  const OPEN_STATE_KEY = "romeo-pos-calculator-open";
  const EXPRESSION_KEY = "romeo-pos-calculator-expression";
  const root = document.createElement("div");
  root.innerHTML = `
    <button class="floating-calculator-toggle" id="calculatorToggle" type="button" aria-label="Calculator" aria-expanded="false">=</button>
    <section class="floating-calculator" id="floatingCalculator" aria-label="Calculator">
      <div class="calculator-drag-handle" id="calculatorDragHandle">
        <h2 class="calculator-title">Calculator</h2>
        <button class="calculator-close" id="calculatorClose" type="button" aria-label="Close">&#215;</button>
      </div>
      <div class="calculator-body">
        <div class="calculator-display" id="calculatorDisplay" aria-live="polite">0</div>
        <div class="calculator-keys" id="calculatorKeys">
          <button class="calculator-key calculator-clear" type="button" data-calculator-action="clear">C</button>
          <button class="calculator-key operator" type="button" data-calculator-action="backspace">&#9003;</button>
          <button class="calculator-key operator" type="button" data-calculator-value="%">%</button>
          <button class="calculator-key operator" type="button" data-calculator-value="/">&#247;</button>
          <button class="calculator-key" type="button" data-calculator-value="7">7</button>
          <button class="calculator-key" type="button" data-calculator-value="8">8</button>
          <button class="calculator-key" type="button" data-calculator-value="9">9</button>
          <button class="calculator-key operator" type="button" data-calculator-value="*">&#215;</button>
          <button class="calculator-key" type="button" data-calculator-value="4">4</button>
          <button class="calculator-key" type="button" data-calculator-value="5">5</button>
          <button class="calculator-key" type="button" data-calculator-value="6">6</button>
          <button class="calculator-key operator" type="button" data-calculator-value="-">&#8722;</button>
          <button class="calculator-key" type="button" data-calculator-value="1">1</button>
          <button class="calculator-key" type="button" data-calculator-value="2">2</button>
          <button class="calculator-key" type="button" data-calculator-value="3">3</button>
          <button class="calculator-key operator" type="button" data-calculator-value="+">+</button>
          <button class="calculator-key" type="button" data-calculator-value="0">0</button>
          <button class="calculator-key" type="button" data-calculator-value=".">.</button>
          <button class="calculator-key equals" type="button" data-calculator-action="equals">=</button>
        </div>
      </div>
    </section>
  `;

  while (root.firstElementChild) document.body.appendChild(root.firstElementChild);

  const toggle = document.getElementById("calculatorToggle");
  const panel = document.getElementById("floatingCalculator");
  const handle = document.getElementById("calculatorDragHandle");
  const closeButton = document.getElementById("calculatorClose");
  const display = document.getElementById("calculatorDisplay");
  const keys = document.getElementById("calculatorKeys");
  let expression = localStorage.getItem(EXPRESSION_KEY) || "";
  if (!/^[\d+\-*/. ()]*$/.test(expression)) expression = "";
  let drag = null;

  function saveExpression() {
    if (expression) localStorage.setItem(EXPRESSION_KEY, expression);
    else localStorage.removeItem(EXPRESSION_KEY);
  }

  function numberValue(value) {
    const parsed = parseFloat(String(value || "").replace(/[^\d.-]/g, ""));
    return Number.isFinite(parsed) ? parsed : 0;
  }

  function render(value) {
    const text = String(value || "0");
    display.textContent = text.length > 16 ? text.slice(-16) : text;
    display.title = text;
  }

  function update() {
    render(expression.replace(/\*/g, "x").replace(/\//g, "\u00f7").replace(/-/g, "\u2212") || "0");
  }

  function isOperator(value) {
    return ["+", "-", "*", "/"].includes(value);
  }

  function applyPercent() {
    const match = expression.match(/(\d+(?:\.\d+)?)$/);
    if (!match) return;
    expression = expression.slice(0, -match[1].length) + String(numberValue(match[1]) / 100);
    saveExpression();
    update();
  }

  function append(value) {
    if (!value) return;
    if (value === "%") {
      applyPercent();
      return;
    }

    const last = expression.slice(-1);
    if (isOperator(value)) {
      if (!expression && value !== "-") return;
      expression = isOperator(last) ? expression.slice(0, -1) + value : expression + value;
    } else if (value === ".") {
      const currentNumber = expression.split(/[+\-*/]/).pop();
      if (!currentNumber.includes(".")) expression += currentNumber ? "." : "0.";
    } else {
      expression += value;
    }
    saveExpression();
    update();
  }

  function clear() {
    expression = "";
    saveExpression();
    update();
  }

  function backspace() {
    expression = expression.slice(0, -1);
    saveExpression();
    update();
  }

  function calculate() {
    if (!expression || !/^[\d+\-*/. ()]+$/.test(expression)) {
      clear();
      return;
    }

    try {
      const safeExpression = expression.replace(/[+\-*/.]+$/, "");
      const result = Function(`"use strict"; return (${safeExpression});`)();
      if (!Number.isFinite(result)) throw new Error("Invalid result");
      expression = String(Math.round((result + Number.EPSILON) * 100) / 100);
      saveExpression();
      render(expression);
    } catch (error) {
      expression = "";
      saveExpression();
      render("Error");
    }
  }

  function clamp(left, top) {
    const rect = panel.getBoundingClientRect();
    return {
      left: Math.min(Math.max(8, left), Math.max(8, window.innerWidth - rect.width - 8)),
      top: Math.min(Math.max(8, top), Math.max(8, window.innerHeight - rect.height - 8))
    };
  }

  function place(left, top) {
    const next = clamp(left, top);
    panel.style.left = `${next.left}px`;
    panel.style.top = `${next.top}px`;
    panel.style.right = "auto";
    panel.style.bottom = "auto";
  }

  function savePosition() {
    const rect = panel.getBoundingClientRect();
    localStorage.setItem(POSITION_KEY, JSON.stringify({
      left: Math.round(rect.left),
      top: Math.round(rect.top)
    }));
  }

  function restorePosition() {
    try {
      const saved = JSON.parse(localStorage.getItem(POSITION_KEY) || "null");
      if (saved && Number.isFinite(saved.left) && Number.isFinite(saved.top)) {
        place(saved.left, saved.top);
      }
    } catch (error) {
      localStorage.removeItem(POSITION_KEY);
    }
  }

  function open() {
    panel.classList.add("open");
    toggle.setAttribute("aria-expanded", "true");
    localStorage.setItem(OPEN_STATE_KEY, "true");
    restorePosition();
    update();
  }

  function close() {
    panel.classList.remove("open");
    toggle.setAttribute("aria-expanded", "false");
    localStorage.removeItem(OPEN_STATE_KEY);
  }

  toggle.addEventListener("click", () => panel.classList.contains("open") ? close() : open());
  closeButton.addEventListener("click", close);

  keys.addEventListener("click", event => {
    const button = event.target.closest("button");
    if (!button) return;
    const action = button.dataset.calculatorAction;
    if (action === "clear") clear();
    else if (action === "backspace") backspace();
    else if (action === "equals") calculate();
    else append(button.dataset.calculatorValue);
  });

  handle.addEventListener("pointerdown", event => {
    if (event.target.closest("button")) return;
    const rect = panel.getBoundingClientRect();
    drag = { offsetX: event.clientX - rect.left, offsetY: event.clientY - rect.top };
    panel.classList.add("dragging");
    handle.setPointerCapture(event.pointerId);
  });

  handle.addEventListener("pointermove", event => {
    if (drag) place(event.clientX - drag.offsetX, event.clientY - drag.offsetY);
  });

  function finishDrag(event) {
    if (!drag) return;
    drag = null;
    panel.classList.remove("dragging");
    savePosition();
    if (handle.hasPointerCapture(event.pointerId)) handle.releasePointerCapture(event.pointerId);
  }

  handle.addEventListener("pointerup", finishDrag);
  handle.addEventListener("pointercancel", finishDrag);

  document.addEventListener("keydown", event => {
    if (!panel.classList.contains("open")) return;
    if (event.ctrlKey || event.altKey || event.metaKey) return;
    if (["INPUT", "TEXTAREA", "SELECT"].includes(document.activeElement?.tagName)) return;

    if (/^\d$/.test(event.key) || ["+", "-", "*", "/", ".", "%"].includes(event.key)) {
      event.preventDefault();
      append(event.key);
    } else if (event.key === "Enter" || event.key === "=") {
      event.preventDefault();
      calculate();
    } else if (event.key === "Backspace") {
      event.preventDefault();
      backspace();
    } else if (event.key === "Escape") {
      event.preventDefault();
      clear();
    }
  });

  window.addEventListener("resize", () => {
    if (!panel.classList.contains("open")) return;
    const rect = panel.getBoundingClientRect();
    place(rect.left, rect.top);
    savePosition();
  });

  if (localStorage.getItem(OPEN_STATE_KEY) === "true") {
    open();
  } else {
    update();
  }
})();
