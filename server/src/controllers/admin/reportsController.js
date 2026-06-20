import Order from "../../models/Order.js";
import User from "../../models/User.js";

function parseRange(query) {
  const { from, to } = query;
  const range = {};
  if (from) range.$gte = new Date(from);
  if (to) {
    const end = new Date(to);
    end.setHours(23, 59, 59, 999);
    range.$lte = end;
  }
  return range;
}

export async function getReportSummary(req, res) {
  const range = parseRange(req.query);
  const createdAtFilter = Object.keys(range).length ? { createdAt: range } : {};
  const salesFilter = { ...createdAtFilter, status: { $ne: "CANCELLED" } };

  const [salesAgg, totalOrders, newCustomers, salesOverTime, topByRevenue, topByUnits] = await Promise.all([
    Order.aggregate([
      { $match: salesFilter },
      { $group: { _id: null, totalSales: { $sum: "$total" }, orderCount: { $sum: 1 } } },
    ]),
    Order.countDocuments(createdAtFilter),
    User.countDocuments({ ...createdAtFilter, role: "CUSTOMER" }),
    Order.aggregate([
      { $match: salesFilter },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt", timezone: "Asia/Kathmandu" } },
          total: { $sum: "$total" },
          orders: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
      { $project: { _id: 0, date: "$_id", total: 1, orders: 1 } },
    ]),
    Order.aggregate([
      { $match: salesFilter },
      { $unwind: "$items" },
      {
        $group: {
          _id: "$items.productName",
          revenue: { $sum: { $multiply: ["$items.unitPrice", "$items.quantity"] } },
          units: { $sum: "$items.quantity" },
        },
      },
      { $sort: { revenue: -1 } },
      { $limit: 10 },
      { $project: { _id: 0, productName: "$_id", revenue: 1, units: 1 } },
    ]),
    Order.aggregate([
      { $match: salesFilter },
      { $unwind: "$items" },
      {
        $group: {
          _id: "$items.productName",
          revenue: { $sum: { $multiply: ["$items.unitPrice", "$items.quantity"] } },
          units: { $sum: "$items.quantity" },
        },
      },
      { $sort: { units: -1 } },
      { $limit: 10 },
      { $project: { _id: 0, productName: "$_id", revenue: 1, units: 1 } },
    ]),
  ]);

  const totalSales = salesAgg[0]?.totalSales ?? 0;
  const sellingOrderCount = salesAgg[0]?.orderCount ?? 0;

  res.json({
    summary: {
      totalSales,
      totalOrders,
      newCustomers,
      avgOrderValue: sellingOrderCount ? totalSales / sellingOrderCount : 0,
    },
    salesOverTime,
    topProductsByRevenue: topByRevenue,
    topProductsByUnits: topByUnits,
  });
}

function csvEscape(value) {
  const str = value === null || value === undefined ? "" : String(value);
  if (/[",\n]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export async function exportOrdersCsv(req, res) {
  const range = parseRange(req.query);
  const filter = Object.keys(range).length ? { createdAt: range } : {};

  res.setHeader("Content-Type", "text/csv");
  res.setHeader("Content-Disposition", 'attachment; filename="orders-report.csv"');

  res.write(
    ["Order ID", "Date", "Customer Name", "Customer Email", "Status", "Payment Method", "Payment Status", "Subtotal", "Discount", "Delivery Fee", "Total", "Items"]
      .map(csvEscape)
      .join(",") + "\n"
  );

  const cursor = Order.find(filter)
    .populate("userId", "name email")
    .sort("createdAt")
    .cursor();

  for await (const order of cursor) {
    const row = [
      order._id.toString(),
      order.createdAt.toISOString(),
      order.userId?.name ?? "",
      order.userId?.email ?? "",
      order.status,
      order.paymentMethod,
      order.paymentStatus,
      order.subtotal,
      order.discountAmount,
      order.deliveryFee,
      order.total,
      order.items.reduce((sum, i) => sum + i.quantity, 0),
    ];
    res.write(row.map(csvEscape).join(",") + "\n");
  }

  res.end();
}
