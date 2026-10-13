function createInvoicePdf(data) {
  const invoiceNumber = `INV-${Utilities.formatDate(new Date(), TIME_ZONE, "yyyyMMdd-HHmmss")}`;
  const customerName = escapeHtml(data.customerName || "-");
  const customerPhone = escapeHtml(data.customerPhone || "-");
  const paymentMethod = escapeHtml(data.payment || data.paymentMethod || "-");
  const barber = escapeHtml(data.barber || "-");
  const invoiceDate = escapeHtml(getInvoiceDateTime(data));
  const total = formatInvoiceMoney(data.total || 0);
  const discountPercent = parseSheetAmount(data.discountPercent || 0);
  const discountAmount = formatInvoiceMoney(data.discountAmount || 0);

  const servicesText = String(data.services || "").trim();
  const services = servicesText
    ? servicesText.split(/[,\n]+/).map(service => service.trim()).filter(Boolean)
    : [];

  const servicesRows = services.length
    ? services.map((service, index) => `
        <tr>
          <td>${index + 1}</td>
          <td>${escapeHtml(service)}</td>
        </tr>
      `).join("")
    : `
        <tr>
          <td>1</td>
          <td>No services recorded</td>
        </tr>
      `;

  const html = `
    <!DOCTYPE html>
    <html lang="en" dir="ltr">
      <head>
        <meta charset="UTF-8">
        <style>
          * { box-sizing: border-box; }
          body {
            margin: 0;
            padding: 28px;
            font-family: Arial, Tahoma, sans-serif;
            color: #2a2118;
            background: #ffffff;
          }
          .invoice {
            width: 100%;
            max-width: 720px;
            margin: 0 auto;
            border: 1px solid #ead9bd;
            border-radius: 18px;
            overflow: hidden;
          }
          .header {
            background: #3b2412;
            color: #ffffff;
            padding: 26px 28px;
            text-align: center;
          }
          .brand { margin: 0; font-size: 28px; letter-spacing: 1px; font-weight: 800; }
          .subtitle { margin: 8px 0 0; color: #ead9bd; font-size: 14px; }
          .content { padding: 26px 28px 30px; }
          .meta { width: 100%; margin-bottom: 22px; border-collapse: collapse; }
          .meta td { width: 50%; padding: 10px 12px; border: 1px solid #f0dfc6; vertical-align: top; }
          .label { display: block; color: #7d6a58; font-size: 12px; margin-bottom: 5px; }
          .value { display: block; font-size: 16px; font-weight: 700; color: #2a2118; }
          .section-title { margin: 0 0 10px; font-size: 17px; font-weight: 800; }
          table.services { width: 100%; border-collapse: collapse; margin-bottom: 22px; }
          .services th { background: #f4ead9; color: #5b4633; font-size: 13px; text-align: left; padding: 12px; border: 1px solid #ead9bd; }
          .services td { padding: 13px 12px; border: 1px solid #ead9bd; font-size: 15px; }
          .services td:first-child, .services th:first-child { width: 70px; text-align: center; }
          .summary { margin: 0 0 12px; border: 1px solid #ead9bd; border-radius: 12px; overflow: hidden; }
          .summary-row { display: table; width: 100%; border-bottom: 1px solid #ead9bd; }
          .summary-row:last-child { border-bottom: 0; }
          .summary-label { display: table-cell; padding: 10px 12px; color: #7d6a58; font-size: 13px; font-weight: 700; }
          .summary-value { display: table-cell; padding: 10px 12px; color: #2a2118; font-size: 14px; font-weight: 800; text-align: right; }
          .total-box { background: #19764d; color: #ffffff; border-radius: 14px; padding: 18px 20px; display: table; width: 100%; margin-top: 12px; }
          .total-label { display: table-cell; font-size: 18px; font-weight: 800; vertical-align: middle; }
          .total-value { display: table-cell; font-size: 30px; font-weight: 900; text-align: right; vertical-align: middle; }
          .footer { margin-top: 24px; padding-top: 16px; border-top: 1px dashed #d9c3a3; text-align: center; color: #7d6a58; font-size: 13px; line-height: 1.7; }
        </style>
      </head>
      <body>
        <div class="invoice">
          <div class="header">
            <h1 class="brand">CUT HUB</h1>
            <p class="subtitle">Sales Invoice</p>
          </div>
          <div class="content">
            <table class="meta">
              <tr>
                <td><span class="label">Invoice No.</span><span class="value">${invoiceNumber}</span></td>
                <td><span class="label">Date</span><span class="value">${invoiceDate}</span></td>
              </tr>
              <tr>
                <td><span class="label">Customer Name</span><span class="value">${customerName}</span></td>
                <td><span class="label">Phone</span><span class="value">${customerPhone}</span></td>
              </tr>
              <tr>
                <td><span class="label">Payment Method</span><span class="value">${paymentMethod}</span></td>
                <td><span class="label">Barber</span><span class="value">${barber}</span></td>
              </tr>
            </table>
            <h2 class="section-title">Services</h2>
            <table class="services">
              <thead><tr><th>#</th><th>Service</th></tr></thead>
              <tbody>${servicesRows}</tbody>
            </table>
            <div class="summary">
              <div class="summary-row">
                <span class="summary-label">Discount Percent</span>
                <span class="summary-value">${discountPercent}%</span>
              </div>
              <div class="summary-row">
                <span class="summary-label">Discount Amount</span>
                <span class="summary-value">${discountAmount}</span>
              </div>
            </div>
            <div class="total-box">
              <div class="total-label">Total</div>
              <div class="total-value">${total}</div>
            </div>
            <div class="footer">
              Your style, our passion<br>
              Thank you for visiting CUT HUB
            </div>
          </div>
        </div>
      </body>
    </html>
  `;

  const blob = Utilities.newBlob(html, "text/html", "invoice.html")
    .getAs("application/pdf")
    .setName(`invoice-${Date.now()}.pdf`);

  let file = null;
  try {
    file = DriveApp.createFile(blob);
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    return `https://drive.google.com/file/d/${file.getId()}/view?usp=sharing`;
  } catch (error) {
    if (file) {
      try { file.setTrashed(true); } catch (cleanupError) {
        console.error("Incomplete invoice PDF cleanup failed:", cleanupError);
      }
    }
    throw error;
  }
}

function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function formatInvoiceMoney(value) {
  return `${parseSheetAmount(value).toLocaleString("en-US")} EGP`;
}
