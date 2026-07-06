import api from "./client";

export const getDistrictBranches = (district) =>
  api.get("/logistics/branches", { params: { district } }).then(r => r.data);

export const getDeliveryRate = (branchName) =>
  api.post("/logistics/rate", { branchName }).then(r => r.data);

export const getInternationalFee = () =>
  api.get("/logistics/international-fee").then(r => r.data);
