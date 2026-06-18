import { useState } from "react";
import { cloudinaryUrl } from "../utils/cloudinaryUrl";

export default function ItemThumb({ src, alt, width = 150, className = "" }) {
  const [failed, setFailed] = useState(false);

  if (!src || failed) {
    return <div className={`bg-gray-200 ${className}`} />;
  }

  return (
    <img
      src={cloudinaryUrl(src, width)}
      alt={alt}
      loading="lazy"
      onError={() => setFailed(true)}
      className={`object-cover ${className}`}
    />
  );
}
