import multer from "multer";

const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith("image/")) {
    cb(null, true);
  } else {
    cb(new Error("Only image files are allowed"), false);
  }
};

export const upload = multer({
  storage: multer.memoryStorage(),
  fileFilter,
  // 10 MB — Cloudinary's free-tier per-image cap; animated GIFs routinely exceed the old 5 MB.
  limits: { fileSize: 10 * 1024 * 1024 },
});

const excelFileFilter = (req, file, cb) => {
  const isXlsx = /\.xlsx$/i.test(file.originalname || "");
  if (isXlsx) {
    cb(null, true);
  } else {
    cb(new Error("Only .xlsx files are allowed"), false);
  }
};

export const uploadExcel = multer({
  storage: multer.memoryStorage(),
  fileFilter: excelFileFilter,
  limits: { fileSize: 5 * 1024 * 1024 },
});
