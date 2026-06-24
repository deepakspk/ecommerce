import { getDefaultProvider } from "../logistics/logisticsManager.js";
import * as settingsService from "./settingsService.js";

function calcFlatDeliveryFee(province) {
  return province?.toLowerCase().trim() === "bagmati" ? 100 : 200;
}

export async function resolveDeliveryFee(address) {
  if (address.branchName) {
    const provider = getDefaultProvider("rateCalculation");
    if (provider) {
      try {
        const { charge } = await provider.calculateRate({
          fromBranch: settingsService.get("LOGISTICS_PICKUP_BRANCH"),
          toBranch: address.branchName,
          deliveryType: "DOOR_TO_DOOR",
        });
        const fee = Number(charge);
        if (Number.isFinite(fee)) return fee;
      } catch (err) {
        console.error("[delivery-fee] live rate lookup failed, falling back to flat fee:", err.message);
      }
    }
  }
  return calcFlatDeliveryFee(address.province);
}
