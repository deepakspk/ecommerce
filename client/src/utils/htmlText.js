// Plain-text extraction for character counting and SEO meta descriptions only —
// never used to render markup, so a regex strip is safe here (no XSS surface).
export function stripHtml(html) {
  if (!html) return "";
  return String(html)
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}
