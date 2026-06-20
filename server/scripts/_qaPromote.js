import "dotenv/config";
import dns from "dns";
import mongoose from "mongoose";
import User from "../src/models/User.js";

dns.setServers(["8.8.8.8", "1.1.1.1"]);

async function run() {
  await mongoose.connect(process.env.MONGODB_URI);
  const res = await User.updateOne(
    { email: "qa-test-admin-verify@example.com" },
    { $set: { role: "ADMIN" } }
  );
  console.log(JSON.stringify(res));
  await mongoose.disconnect();
}

run();
