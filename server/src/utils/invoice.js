import PDFDocument from "pdfkit";

const fmt = (n) => `Rs. ${Number(n).toLocaleString("en-NP")}`;

export function streamInvoicePdf(res, order, customer) {
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `attachment; filename="invoice-${order._id}.pdf"`);

  const doc = new PDFDocument({ size: "A4", margin: 50 });
  doc.pipe(res);

  // GyanKosh logo mark, drawn as vector paths (PDFKit can't embed SVG files).
  doc.save();
  doc.translate(50, 40).scale(0.6);
  doc.roundedRect(0, 0, 64, 64, 14).fill("#2563eb");
  doc.path("M32 10l8 9-8 11-8-11z").fill("#fbbf24");
  doc.path("M32 10l8 9H24z").fill("#fde68a");
  doc.path("M32 38c-4.5-3-11.5-3-16-1v14c4.5-2 11.5-2 16 1 4.5-3 11.5-3 16-1V37c-4.5-2-11.5-2-16 1z").fill("#ffffff");
  doc.restore();

  doc.font("Helvetica-Bold").fontSize(22).fillColor("#0f172a")
    .text("Gyan", 96, 46, { continued: true })
    .fillColor("#2563eb").text("Kosh");
  doc.font("Helvetica").fontSize(9).fillColor("#666")
    .text("ONLINE BOOKSTORE  ·  TAX INVOICE", 96, 72, { characterSpacing: 1.5 });

  doc.fillColor("#000").fontSize(11);
  doc.text(`Invoice for Order #${order._id}`, 50, 105);
  doc.text(`Date: ${order.createdAt.toLocaleDateString("en-NP")}`);
  doc.text(`Status: ${order.status}  |  Payment: ${order.paymentMethod} (${order.paymentStatus})`);
  doc.moveDown(1);

  doc.fontSize(12).text("Bill To", { underline: true });
  doc.fontSize(11);
  doc.text(customer.name || order.address.recipientName);
  if (customer.email) doc.text(customer.email);
  doc.text(order.address.phone);
  doc.text(
    [
      order.address.area,
      order.address.street,
      order.address.city,
      order.address.district,
      order.address.province,
      order.address.country !== "Nepal" ? order.address.country : null,
    ]
      .filter(Boolean)
      .join(", ")
  );
  doc.moveDown(1);

  const tableTop = doc.y;
  const cols = { item: 50, size: 270, qty: 340, price: 400, total: 480 };
  doc.fontSize(11).font("Helvetica-Bold");
  doc.text("Item", cols.item, tableTop);
  doc.text("Size/Color", cols.size, tableTop);
  doc.text("Qty", cols.qty, tableTop);
  doc.text("Price", cols.price, tableTop);
  doc.text("Total", cols.total, tableTop);
  doc.font("Helvetica");
  doc.moveTo(50, tableTop + 15).lineTo(545, tableTop + 15).strokeColor("#ccc").stroke();

  let y = tableTop + 22;
  for (const item of order.items) {
    doc.text(item.productName, cols.item, y, { width: 210 });
    doc.text(`${item.size}/${item.color}`, cols.size, y);
    doc.text(String(item.quantity), cols.qty, y);
    doc.text(fmt(item.unitPrice), cols.price, y);
    doc.text(fmt(item.unitPrice * item.quantity), cols.total, y);
    y += 20;
  }

  doc.moveTo(50, y).lineTo(545, y).strokeColor("#ccc").stroke();
  y += 10;

  const summaryLine = (label, value, bold = false) => {
    doc.font(bold ? "Helvetica-Bold" : "Helvetica");
    doc.text(label, cols.price - 60, y, { width: 100, align: "right" });
    doc.text(value, cols.total, y);
    y += 18;
  };
  summaryLine("Subtotal", fmt(order.subtotal));
  if (order.discountAmount > 0) summaryLine("Discount", `-${fmt(order.discountAmount)}`);
  summaryLine("Delivery Fee", fmt(order.deliveryFee));
  summaryLine("Total", fmt(order.total), true);

  doc.font("Helvetica");
  doc.end();
}
