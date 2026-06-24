import { getDefaultProvider, listBranchesForDistrict } from "../logistics/logisticsManager.js";
import * as settingsService from "../services/settingsService.js";

export async function listDistrictBranches(req, res) {
  const branches = await listBranchesForDistrict(req.query.district);
  res.json({ branches });
}

export async function getDeliveryRate(req, res) {
  const provider = getDefaultProvider("rateCalculation");
  if (!provider) return res.status(400).json({ message: "No logistics provider is configured for rate calculation" });

  const rate = await provider.calculateRate({
    fromBranch: settingsService.get("LOGISTICS_PICKUP_BRANCH"),
    toBranch: req.body.branchName,
    deliveryType: "DOOR_TO_DOOR",
  });
  res.json({ charge: Number(rate.charge) });
}
