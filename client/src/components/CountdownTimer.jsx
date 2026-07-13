import { useState, useEffect, useRef } from "react";

function partsOf(ms) {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  return {
    days: Math.floor(totalSeconds / 86400),
    hours: Math.floor(totalSeconds / 3600) % 24,
    mins: Math.floor(totalSeconds / 60) % 60,
    secs: totalSeconds % 60,
  };
}

// Ticking countdown to `target`. Shows a DAYS box only when relevant, so a
// flash sale reads "31 : 52 : 08" while a month-long campaign shows days too.
// Boxes are a fixed h-12 so sibling CTA buttons can match their height exactly.
export default function CountdownTimer({ target, onExpire }) {
  const [now, setNow] = useState(() => Date.now());
  const onExpireRef = useRef(null);

  useEffect(() => {
    onExpireRef.current = onExpire;
  }, [onExpire]);

  const remaining = new Date(target).getTime() - now;
  const expired = remaining <= 0;

  useEffect(() => {
    if (expired) {
      onExpireRef.current?.();
      return;
    }
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [expired, target]);

  const { days, hours, mins, secs } = partsOf(remaining);
  const boxes = [
    ...(days > 0 ? [{ value: days, label: days === 1 ? "DAY" : "DAYS" }] : []),
    { value: hours, label: "HOURS" },
    { value: mins, label: "MINS" },
    { value: secs, label: "SECS" },
  ];

  return (
    <div className="flex items-center gap-1" role="timer" aria-live="off">
      {boxes.map((box, i) => (
        <div key={box.label} className="flex items-center gap-1">
          {i > 0 && <span className="text-gray-300 font-bold">:</span>}
          <div className="w-12 sm:w-14 h-12 bg-white rounded-lg border border-gray-200 shadow-sm flex flex-col items-center justify-center">
            <span className="block text-lg font-bold leading-none text-brand-600">
              {String(box.value).padStart(2, "0")}
            </span>
            <span className="block text-[9px] font-semibold text-gray-500 tracking-wide mt-0.5">{box.label}</span>
          </div>
        </div>
      ))}
    </div>
  );
}
