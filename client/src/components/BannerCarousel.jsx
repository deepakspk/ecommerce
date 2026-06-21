import { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import * as bannersApi from "../api/banners";
import { cloudinaryUrl } from "../utils/cloudinaryUrl";

const AUTO_ADVANCE_MS = 5000;

function BannerSlide({ banner }) {
  const img = (
    <img
      src={cloudinaryUrl(banner.imageUrl, 1400)}
      alt=""
      className="w-full h-full object-cover"
      loading="eager"
    />
  );
  if (!banner.link) return img;
  if (/^https?:\/\//.test(banner.link)) {
    return (
      <a href={banner.link} target="_blank" rel="noopener noreferrer" className="block w-full h-full">
        {img}
      </a>
    );
  }
  return (
    <Link to={banner.link} className="block w-full h-full">
      {img}
    </Link>
  );
}

export default function BannerCarousel() {
  const [banners, setBanners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const timerRef = useRef();

  useEffect(() => {
    bannersApi.getBanners()
      .then((d) => setBanners(d.banners))
      .catch(() => setBanners([]))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (banners.length <= 1 || paused) return;
    timerRef.current = setInterval(() => {
      setIndex((i) => (i + 1) % banners.length);
    }, AUTO_ADVANCE_MS);
    return () => clearInterval(timerRef.current);
  }, [banners.length, paused]);

  if (loading) {
    return (
      <div className="relative w-full aspect-[32/9] sm:aspect-[42/9] rounded-xl overflow-hidden bg-gray-200 animate-pulse" />
    );
  }

  if (banners.length === 0) return null;

  const goTo = (i) => setIndex(((i % banners.length) + banners.length) % banners.length);

  return (
    <div
      className="relative w-full aspect-[32/9] sm:aspect-[42/9] rounded-xl overflow-hidden bg-gray-100"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      {banners.map((banner, i) => (
        <div
          key={banner._id}
          className={`absolute inset-0 transition-opacity duration-500 ${i === index ? "opacity-100" : "opacity-0 pointer-events-none"}`}
        >
          <BannerSlide banner={banner} />
        </div>
      ))}

      {banners.length > 1 && (
        <>
          <button
            type="button"
            aria-label="Previous banner"
            onClick={() => goTo(index - 1)}
            className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-white/80 hover:bg-white text-gray-700 flex items-center justify-center shadow"
          >
            <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <button
            type="button"
            aria-label="Next banner"
            onClick={() => goTo(index + 1)}
            className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-white/80 hover:bg-white text-gray-700 flex items-center justify-center shadow"
          >
            <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </button>

          <div className="absolute bottom-3 left-0 right-0 flex justify-center gap-2">
            {banners.map((banner, i) => (
              <button
                key={banner._id}
                type="button"
                aria-label={`Go to banner ${i + 1}`}
                aria-current={i === index ? "true" : undefined}
                onClick={() => goTo(i)}
                className={`rounded-full transition-all shadow-sm ring-1 ring-black/10 ${
                  i === index ? "w-6 h-2.5 bg-white" : "w-2.5 h-2.5 bg-white/70 hover:bg-white/90"
                }`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
