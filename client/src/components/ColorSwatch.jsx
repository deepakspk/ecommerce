// Best-effort visual swatch for a stored color name (e.g. "Maroon", "Navy").
// Most common color words are valid CSS color keywords, so this works without
// a color-to-hex mapping table; unrecognized names just render a blank circle,
// which is why callers should always pair this with the text label too.
export default function ColorSwatch({ color, className = "w-4 h-4" }) {
  return (
    <span
      className={`${className} rounded-full border border-gray-300 flex-shrink-0 inline-block`}
      style={{ backgroundColor: color }}
      aria-hidden="true"
    />
  );
}
