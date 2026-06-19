import QRCode from "qrcode";
import JsBarcode from "jsbarcode";

function esc(value) {
  return String(value ?? "").replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  }[c]));
}

function fmtCOD(charge) {
  const n = Number(charge) || 0;
  return `Rs. ${n.toLocaleString(undefined, { minimumFractionDigits: 2 })}`;
}

function fmtToday() {
  return new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "2-digit", year: "numeric" }).replaceAll("/", "-");
}

async function generateQrDataUrl(text) {
  return QRCode.toDataURL(text, { margin: 0, width: 200 });
}

function generateBarcodeDataUrl(text) {
  const canvas = document.createElement("canvas");
  JsBarcode(canvas, text, { format: "CODE128", displayValue: false, height: 50, margin: 0 });
  return canvas.toDataURL("image/png");
}

function buildLabelHtml(label, { qrDataUrl, barcodeDataUrl, barcodeText }) {
  const {
    orderid, delivery_type, cod_charge,
    to_branch = {}, from = {}, receiver = {},
    description = {},
  } = label;

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<title>Label #${esc(orderid)}</title>
<style>
  @page { size: 6in 4in landscape; margin: 0; }
  * { box-sizing: border-box; }
  html, body { margin: 0; padding: 0; }
  body {
    width: 6in; height: 4in;
    font-family: -apple-system, "Segoe UI", Arial, sans-serif;
    color: #111;
  }
  .label { width: 6in; height: 4in; padding: 0.18in 0.22in; display: flex; flex-direction: column; }
  .header { display: flex; justify-content: space-between; align-items: baseline; padding-bottom: 6px; border-bottom: 2px solid #111; }
  .brand { font-size: 16px; font-weight: 800; }
  .brand .url { font-weight: 500; color: #555; font-size: 13px; }
  .date { font-size: 11px; color: #666; margin-top: 3px; }
  .ord { font-size: 17px; font-weight: 600; }
  .ord b { font-weight: 800; }

  .body { flex: 1; display: flex; gap: 0.2in; margin-top: 0.1in; min-height: 0; }
  .col-left { flex: 1.3; display: flex; flex-direction: column; gap: 8px; min-width: 0; }
  .col-right { flex: 1; display: flex; flex-direction: column; align-items: flex-end; gap: 6px; text-align: right; }

  .tag { font-size: 8.5px; font-weight: 800; letter-spacing: 0.7px; color: #888; text-transform: uppercase; }
  .branch-block .name { font-size: 19px; font-weight: 800; line-height: 1.15; }
  .branch-block .code { font-size: 12px; color: #555; font-weight: 600; }
  .branch-block .district { font-size: 12px; font-weight: 700; margin-top: 2px; }

  .qr { width: 1.05in; height: 1.05in; }
  .meta-row { font-size: 12.5px; }
  .meta-row b { font-weight: 800; }

  .receiver { border: 1.5px solid #111; border-radius: 7px; padding: 7px 10px; text-align: right; }
  .receiver .name { font-size: 16px; font-weight: 800; }
  .receiver .phone { font-size: 13px; font-weight: 700; }
  .receiver .address { font-size: 11px; color: #333; margin-top: 2px; }

  .sender-row { display: flex; justify-content: space-between; font-size: 12px; }
  .sender-row b { font-weight: 700; }

  .barcode-block { display: flex; flex-direction: column; align-items: flex-start; }
  .barcode-block img { height: 0.5in; }
  .barcode-block .code-text { font-family: "Courier New", monospace; font-size: 10px; letter-spacing: 1px; margin-top: 1px; }

  .desc-block { font-size: 11.5px; line-height: 1.5; }
  .desc-block .row span:first-child { color: #555; }
  .desc-block .row b { font-weight: 700; }

  .footer { margin-top: auto; padding-top: 6px; border-top: 1px dashed #bbb; font-size: 9px; color: #888; text-align: center; }
  @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
</style>
</head>
<body>
  <div class="label">
    <div class="header">
      <div>
        <span class="brand">Nepal Can Move <span class="url">| www.nepalcanmove.com</span></span>
        <div class="date">${esc(fmtToday())}</div>
      </div>
      <div class="ord">ORD: <b>${esc(orderid)}</b></div>
    </div>

    <div class="body">
      <div class="col-left">
        <div class="branch-block">
          <span class="tag">Destination Branch</span>
          <div class="name">${esc(to_branch.name)}</div>
          <div class="code">${esc(to_branch.code)}</div>
          <div class="district">${esc(to_branch.district)}</div>
        </div>

        <div class="sender-row">
          <span>From: <b>${esc(from.name)}</b></span>
          <span>Phone: <b>${esc(from.phone)}</b></span>
        </div>

        <div class="barcode-block">
          <img src="${barcodeDataUrl}" alt="barcode" />
          <div class="code-text">${esc(barcodeText)}</div>
        </div>

        <div class="desc-block">
          <div class="row"><span>Description: </span><b>${esc(description.description) || "&mdash;"}</b></div>
          ${description.delivery_instruction ? `<div class="row"><span>Instruction: </span><b>${esc(description.delivery_instruction)}</b></div>` : ""}
          ${description.handling ? `<div class="row"><span>Handling: </span><b>${esc(description.handling)}</b></div>` : ""}
        </div>
      </div>

      <div class="col-right">
        <img class="qr" src="${qrDataUrl}" alt="QR code" />
        <div class="meta-row">Type: <b>${esc(delivery_type)}</b></div>
        <div class="meta-row">COD: <b>${esc(fmtCOD(cod_charge))}</b></div>

        <div class="receiver">
          <div class="meta-row">To: <span class="name">${esc(receiver.name)}</span></div>
          <div class="phone">${esc(receiver.phone)}${receiver.phone2 ? ` / ${esc(receiver.phone2)}` : ""}</div>
          <div class="address">${esc(receiver.address)}</div>
        </div>
      </div>
    </div>

    <div class="footer">Vendor Ref: ${esc(description.vendor_orderid) || "&mdash;"}</div>
  </div>
</body>
</html>`;
}

export async function printShippingLabel(label) {
  const win = window.open("", "_blank", "width=672,height=480");
  if (!win) return false;

  const barcodeText = label.description?.vendor_orderid || String(label.orderid);
  const [qrDataUrl, barcodeDataUrl] = await Promise.all([
    generateQrDataUrl(String(label.orderid)),
    Promise.resolve(generateBarcodeDataUrl(barcodeText)),
  ]);

  win.document.open();
  win.document.write(buildLabelHtml(label, { qrDataUrl, barcodeDataUrl, barcodeText }));
  win.document.close();
  win.focus();
  setTimeout(() => win.print(), 300);
  return true;
}
