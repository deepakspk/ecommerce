import { useState, useRef, useEffect, useMemo } from "react";

const MAX_SIZE_MB = 5;

// Single-image drag'n'drop upload zone for admin forms.
// `file` is a staged File (not yet uploaded); `existingUrl` is an already-saved
// image shown until the admin replaces or removes it.
export default function ImageDropzone({
  label,
  file,
  existingUrl,
  onFile,
  onClear,
  heightClass = "h-40",
}) {
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState("");
  const inputRef = useRef();

  const previewUrl = useMemo(() => (file ? URL.createObjectURL(file) : null), [file]);
  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  function acceptFile(candidate) {
    if (!candidate) return;
    if (!candidate.type.startsWith("image/")) {
      setError("Only image files are allowed");
      return;
    }
    if (candidate.size > MAX_SIZE_MB * 1024 * 1024) {
      setError(`Image must be ${MAX_SIZE_MB}MB or smaller`);
      return;
    }
    setError("");
    onFile(candidate);
  }

  function handleDrop(e) {
    e.preventDefault();
    setDragging(false);
    acceptFile(e.dataTransfer.files?.[0]);
  }

  const shownImage = previewUrl || existingUrl;

  return (
    <div>
      <div
        role="button"
        tabIndex={0}
        onClick={() => inputRef.current?.click()}
        onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") inputRef.current?.click(); }}
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        className={`relative ${heightClass} border-2 border-dashed rounded-lg flex items-center justify-center cursor-pointer transition-colors overflow-hidden ${
          dragging
            ? "border-brand-500 bg-brand-50 dark:bg-brand-900/20"
            : "border-gray-300 hover:border-brand-400 dark:border-gray-600 dark:hover:border-brand-500"
        }`}
      >
        {shownImage ? (
          <>
            <img src={shownImage} alt="" className="w-full h-full object-contain" />
            <span className="absolute bottom-1.5 right-1.5 text-[11px] font-medium bg-black/60 text-white rounded px-2 py-0.5">
              Click or drop to replace
            </span>
          </>
        ) : (
          <span className="text-sm text-gray-500 dark:text-gray-400 px-4 text-center">
            Drag 'n' drop {label} here
          </span>
        )}
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            acceptFile(e.target.files?.[0]);
            e.target.value = "";
          }}
        />
      </div>

      <div className="mt-1.5 flex items-center justify-between gap-2">
        <p className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
          <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 0 1 1.063.852l-.708 2.836a.75.75 0 0 0 1.063.853l.041-.021M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9-3.75h.008v.008H12V8.25Z" />
          </svg>
          Max files: 1, Max size/file: {MAX_SIZE_MB}MB
        </p>
        {(file || existingUrl) && onClear && (
          <button
            type="button"
            onClick={onClear}
            className="text-xs font-medium text-red-600 hover:text-red-700 dark:text-red-400"
          >
            Remove
          </button>
        )}
      </div>
      {error && <p className="text-xs text-red-600 dark:text-red-400 mt-1">{error}</p>}
    </div>
  );
}
