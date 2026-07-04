import sanitizeHtml from "sanitize-html";

// Matches the formatting the admin rich text editor's toolbar can actually produce
// (bold/italic/underline/strike, headings, lists, links, blockquote) — anything
// else (script, style, iframe, on* handlers, javascript: urls) is stripped.
const RICH_TEXT_OPTIONS = {
  allowedTags: [
    "p", "br", "strong", "em", "u", "s", "blockquote",
    "h1", "h2", "h3", "ol", "ul", "li", "a", "span",
  ],
  allowedAttributes: {
    a: ["href", "target", "rel"],
    span: ["class"],
  },
  allowedSchemes: ["http", "https", "mailto"],
  transformTags: {
    a: sanitizeHtml.simpleTransform("a", { rel: "noopener noreferrer nofollow", target: "_blank" }),
  },
};

export function sanitizeRichText(html) {
  if (!html) return "";
  return sanitizeHtml(String(html), RICH_TEXT_OPTIONS).trim();
}

export function stripHtmlTags(html) {
  if (!html) return "";
  return sanitizeHtml(String(html), { allowedTags: [], allowedAttributes: {} }).trim();
}
