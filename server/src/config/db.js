import dns from "dns";
import mongoose from "mongoose";

// Some networks/routers don't resolve mongodb+srv DNS SRV records correctly
// with the OS-assigned DNS servers. Fall back to public resolvers for lookups.
dns.setServers(["8.8.8.8", "1.1.1.1"]);

export async function connectDB() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error("MONGODB_URI is not set in the environment");
  }

  await mongoose.connect(uri);
  console.log("MongoDB connected");
}
