// Run with: node scripts/setBranding.js  (from the server/ directory)
// Sets the GyanKosh company name and logo in company settings.
import "dotenv/config";
import dns from "dns";
import mongoose from "mongoose";
import CompanySettings from "../src/models/CompanySettings.js";

dns.setServers(["8.8.8.8", "1.1.1.1"]);

await mongoose.connect(process.env.MONGODB_URI);

let settings = await CompanySettings.findOne();
if (!settings) settings = new CompanySettings();
settings.companyName = "GyanKosh";
settings.logoUrl = "/brand/gyankosh-logo-dark-bg.svg";
await settings.save();

console.log(`companyName: ${settings.companyName}`);
console.log(`logoUrl:     ${settings.logoUrl}`);
await mongoose.disconnect();
