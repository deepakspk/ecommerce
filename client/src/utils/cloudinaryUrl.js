// Inserts an f_auto,q_auto,w_<width> transform into a Cloudinary delivery URL.
// No-op for non-Cloudinary URLs so local/dev placeholder images keep working.
export function cloudinaryUrl(url, width) {
  if (!url || !url.includes("/upload/")) return url;
  return url.replace("/upload/", `/upload/f_auto,q_auto,w_${width}/`);
}
