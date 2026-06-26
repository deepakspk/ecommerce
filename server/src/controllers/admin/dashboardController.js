import Order from "../../models/Order.js";
import ReturnRequest from "../../models/ReturnRequest.js";
import ProductVariant from "../../models/ProductVariant.js";
import Payment from "../../models/Payment.js";

const IN_DELIVERY_STATUSES = ["SHIPPED", "ARRIVED", "OUT_FOR_DELIVERY"];
const RETURN_IN_PROCESS_STATUSES = ["REQUESTED", "APPROVED", "PICKED_UP"];

function dateKey(d) {
  return d.toISOString().slice(0, 10);
}

// Mongo's $group only emits buckets that actually have data — this fills the
// gaps so a quiet day still shows as a zero point on the trend line instead
// of a gap in the x-axis.
function fillDailySeries(rows, startDate, days, valueKeys) {
  const byDate = new Map(rows.map((r) => [r._id, r]));
  const series = [];
  for (let i = 0; i < days; i++) {
    const d = new Date(startDate);
    d.setDate(d.getDate() + i);
    const key = dateKey(d);
    const row = byDate.get(key);
    const point = { date: key };
    for (const k of valueKeys) point[k] = row?.[k] ?? 0;
    series.push(point);
  }
  return series;
}

const MONTH_LABELS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export async function getDashboardStats(req, res) {
  const now = new Date();
  const startOfToday = new Date(now);
  startOfToday.setHours(0, 0, 0, 0);

  const trendDays = 30;
  const trendStart = new Date(startOfToday);
  trendStart.setDate(trendStart.getDate() - (trendDays - 1));

  const codTrendDays = 7;
  const codTrendStart = new Date(startOfToday);
  codTrendStart.setDate(codTrendStart.getDate() - (codTrendDays - 1));

  const monthWindows = [0, 1, 2].map((i) => {
    const start = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const end = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);
    return { start, end, label: `${MONTH_LABELS[start.getMonth()]} ${start.getFullYear()}` };
  }).reverse();

  const [
    totalOrders,
    deliveredCount,
    inDeliveryCount,
    pendingOrders,
    valuesAgg,
    returnsRefundedCount,
    totalReturnsCount,
    returnsInProcessCount,
    returnedValueAgg,
    pendingCODAgg,
    lowStockCount,
    todayOrders,
    todayRevenueAgg,
    todayDeliveredCount,
    todayReturnsCount,
    lastPaidCOD,
    avgDeliveryFeeAgg,
    statusBreakdownRaw,
    monthlyTrendRaw,
    codTrendRaw,
    returnRateRaw,
  ] = await Promise.all([
    Order.countDocuments({}),
    Order.countDocuments({ status: "DELIVERED" }),
    Order.countDocuments({ status: { $in: IN_DELIVERY_STATUSES } }),
    Order.countDocuments({ status: "PENDING" }),
    Order.aggregate([
      { $match: { status: { $ne: "CANCELLED" } } },
      {
        $group: {
          _id: null,
          orderValue: { $sum: "$total" },
          deliveredValue: { $sum: { $cond: [{ $eq: ["$status", "DELIVERED"] }, "$total", 0] } },
          pendingValue: { $sum: { $cond: [{ $eq: ["$status", "DELIVERED"] }, 0, "$total"] } },
        },
      },
    ]),
    ReturnRequest.countDocuments({ status: "REFUNDED" }),
    ReturnRequest.countDocuments({}),
    ReturnRequest.countDocuments({ status: { $in: RETURN_IN_PROCESS_STATUSES } }),
    Payment.aggregate([
      { $match: { status: "REFUNDED" } },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]),
    Order.aggregate([
      { $match: { paymentMethod: "COD", paymentStatus: { $ne: "PAID" }, status: { $ne: "CANCELLED" } } },
      { $group: { _id: null, total: { $sum: "$total" } } },
    ]),
    ProductVariant.countDocuments({ stockQuantity: { $lt: 5 } }),
    Order.countDocuments({ createdAt: { $gte: startOfToday } }),
    Order.aggregate([
      { $match: { createdAt: { $gte: startOfToday }, status: { $ne: "CANCELLED" } } },
      { $group: { _id: null, total: { $sum: "$total" } } },
    ]),
    Order.countDocuments({ deliveredAt: { $gte: startOfToday } }),
    ReturnRequest.countDocuments({ createdAt: { $gte: startOfToday } }),
    Order.findOne({ paymentMethod: "COD", paymentStatus: "PAID" }).sort({ createdAt: -1 }).select("createdAt total"),
    Order.aggregate([{ $group: { _id: null, avg: { $avg: "$deliveryFee" } } }]),
    Order.aggregate([{ $group: { _id: "$status", count: { $sum: 1 } } }]),
    Order.aggregate([
      { $match: { createdAt: { $gte: trendStart } } },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
          orders: { $sum: 1 },
          sales: { $sum: { $cond: [{ $ne: ["$status", "CANCELLED"] }, "$total", 0] } },
        },
      },
    ]),
    Order.aggregate([
      { $match: { createdAt: { $gte: codTrendStart }, paymentMethod: "COD" } },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
          value: { $sum: "$total" },
        },
      },
    ]),
    Promise.all(
      monthWindows.map(async ({ start, end, label }) => {
        const [orders, returns] = await Promise.all([
          Order.countDocuments({ createdAt: { $gte: start, $lt: end }, status: { $ne: "CANCELLED" } }),
          ReturnRequest.countDocuments({ createdAt: { $gte: start, $lt: end } }),
        ]);
        return { month: label, orders, returns, rate: orders > 0 ? Math.round((returns / orders) * 1000) / 10 : 0 };
      })
    ),
  ]);

  const values = valuesAgg[0] || { orderValue: 0, deliveredValue: 0, pendingValue: 0 };
  const returnRate = totalOrders > 0 ? Math.round((totalReturnsCount / totalOrders) * 1000) / 10 : 0;

  const statusBreakdown = statusBreakdownRaw.map((r) => ({ status: r._id, count: r.count }));

  res.json({
    totals: {
      totalOrders,
      deliveredCount,
      returnsRefundedCount,
      returnRate,
      inDeliveryCount,
      pendingOrders,
      returnsInProcessCount,
      pendingCOD: pendingCODAgg[0]?.total ?? 0,
      lowStockCount,
    },
    today: {
      orders: todayOrders,
      revenue: todayRevenueAgg[0]?.total ?? 0,
      delivered: todayDeliveredCount,
      returns: todayReturnsCount,
    },
    values: {
      orderValue: values.orderValue,
      deliveredValue: values.deliveredValue,
      returnedValue: returnedValueAgg[0]?.total ?? 0,
      pendingValue: values.pendingValue,
    },
    cod: {
      lastDate: lastPaidCOD?.createdAt ?? null,
      lastAmount: lastPaidCOD?.total ?? null,
      pendingCOD: pendingCODAgg[0]?.total ?? 0,
      avgDeliveryFee: Math.round((avgDeliveryFeeAgg[0]?.avg ?? 0) * 100) / 100,
    },
    charts: {
      statusBreakdown,
      deliveredVsReturned: { delivered: deliveredCount, returned: returnsRefundedCount },
      monthlyTrend: fillDailySeries(monthlyTrendRaw, trendStart, trendDays, ["orders", "sales"]),
      codTrend: fillDailySeries(codTrendRaw, codTrendStart, codTrendDays, ["value"]),
      returnRateByMonth: returnRateRaw,
    },
  });
}
