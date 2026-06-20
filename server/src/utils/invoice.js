import PDFDocument from "pdfkit";

const fmt = (n) => `Rs. ${Number(n).toLocaleString("en-NP")}`;

export function streamInvoicePdf(res, order, customer) {
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `attachment; filename="invoice-${order._id}.pdf"`);

  const doc = new PDFDocument({ size: "A4", margin: 50 });
  doc.pipe(res);

  doc.fontSize(20).text("Ecommerce Nepal", { continued: false });
  doc.fontSize(10).fillColor("#666").text("Tax Invoice");
  doc.moveDown(1.5);

  doc.fillColor("#000").fontSize(11);
  doc.text(`Invoice for Order #${order._id}`);
  doc.text(`Date: ${order.createdAt.toLocaleDateString("en-NP")}`);
  doc.text(`Status: ${order.status}  |  Payment: ${order.paymentMethod} (${order.paymentStatus})`);
  doc.moveDown(1);

  doc.fontSize(12).text("Bill To", { underline: true });
  doc.fontSize(11);
  doc.text(customer.name || order.address.recipientName);
  if (customer.email) doc.text(customer.email);
  doc.text(order.address.phone);
  doc.text(
    [order.address.area, order.address.street, order.address.city, order.address.district, order.address.province]
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
