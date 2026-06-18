import api from "./client";

export const initiateKhalti = (orderId) => api.post("/payments/khalti/initiate", { orderId }).then(r => r.data);
export const verifyKhalti = (pidx) => api.post("/payments/khalti/verify", { pidx }).then(r => r.data);

export const initiateEsewa = (orderId) => api.post("/payments/esewa/initiate", { orderId }).then(r => r.data);
export const verifyEsewa = (transactionUuid) => api.post("/payments/esewa/verify", { transactionUuid }).then(r => r.data);
