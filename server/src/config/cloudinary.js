import { v2 as cloudinary } from "cloudinary";
import * as settingsService from "../services/settingsService.js";

function configureCloudinary() {
  cloudinary.config({
    cloud_name: settingsService.get("CLOUDINARY_CLOUD_NAME"),
    api_key: settingsService.get("CLOUDINARY_API_KEY"),
    api_secret: settingsService.get("CLOUDINARY_API_SECRET"),
  });
  return cloudinary;
}

export function uploadToCloudinary(buffer, folder = "ecommerce-nepal") {
  configureCloudinary();
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder, resource_type: "image" },
      (err, result) => (err ? reject(err) : resolve(result))
    );
    stream.end(buffer);
  });
}

export default cloudinary;
