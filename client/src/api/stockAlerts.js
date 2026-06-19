import api from "./client";

export const createStockAlert = (variantId) =>
  api.post("/stock-alerts", { variantId }).then((r) => r.data);
