(function () {
  "use strict";
  const escape = value => String(value || "").replace(/[&<>"']/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char]));
  const english = () => localStorage.getItem("romeo-pos-language") === "en";
  window.RomeoInvoicePdf = {
    button(invoice) {
      const id = invoice.invoiceRequestId || "";
      return `<button type="button" class="mini-btn" data-invoice-pdf="${escape(id)}" ${id ? "" : "disabled"}>${english() ? "Prepare PDF" : "تجهيز PDF"}</button>`;
    }
  };
  document.addEventListener("click", async event => {
    const button = event.target.closest("[data-invoice-pdf]");
    if (!button || button.disabled || !button.dataset.invoicePdf) return;
    button.disabled = true;
    const label = button.textContent;
    button.textContent = english() ? "Preparing PDF…" : "جارٍ تجهيز PDF…";
    const previous = button.nextElementSibling;
    if (previous?.classList.contains("invoice-pdf-error")) previous.remove();
    try {
      const result = await RomeoApi.request({ action: "getInvoicePdf", invoiceRequestId: button.dataset.invoicePdf });
      if (result?.status !== "success") throw new Error(result?.message || "تعذر تجهيز الملف. الفاتورة محفوظة.");
      const url = new URL(result.pdfUrl);
      if (url.origin !== "https://drive.google.com" || url.username || url.password || !/^\/file\/d\/[A-Za-z0-9_-]+\/view$/.test(url.pathname)) throw new Error("تعذر فتح رابط الملف.");
      const link = document.createElement("a");
      link.className = "mini-btn"; link.href = url.href; link.target = "_blank"; link.rel = "noopener";
      link.textContent = english() ? "Open PDF" : "فتح PDF";
      button.replaceWith(link);
    } catch (error) {
      button.disabled = false; button.textContent = label;
      const message = document.createElement("span"); message.className = "invoice-pdf-error"; message.setAttribute("role", "status");
      message.textContent = english() ? "Invoice saved. PDF could not be prepared; try again later." : error.message;
      button.after(message);
    }
  });
})();
