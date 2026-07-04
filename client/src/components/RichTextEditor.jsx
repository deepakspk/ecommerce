import { useMemo } from "react";
import ReactQuill from "react-quill-new";
import "react-quill-new/dist/quill.snow.css";
import { stripHtml } from "../utils/htmlText";

const COMPACT_MODULES = {
  toolbar: [
    ["bold", "italic", "underline", "strike"],
    [{ list: "ordered" }, { list: "bullet" }],
    ["link", "clean"],
  ],
};

const FULL_MODULES = {
  toolbar: [
    [{ header: [1, 2, 3, false] }],
    ["bold", "italic", "underline", "strike"],
    [{ list: "ordered" }, { list: "bullet" }],
    ["blockquote", "link"],
    ["clean"],
  ],
};

// variant "compact" is meant for short teaser fields (fewer formatting options);
// "full" (default) is for long-form fields like the main description.
export default function RichTextEditor({ value, onChange, placeholder, maxLength, variant = "full" }) {
  const modules = useMemo(() => (variant === "compact" ? COMPACT_MODULES : FULL_MODULES), [variant]);
  const plainTextLength = useMemo(() => stripHtml(value).length, [value]);
  const overLimit = maxLength !== undefined && plainTextLength > maxLength;

  return (
    <div>
      <div
        className={`rounded-lg border ${overLimit ? "border-red-400" : "border-gray-300 dark:border-gray-600"}`}
      >
        <ReactQuill
          theme="snow"
          value={value}
          onChange={onChange}
          modules={modules}
          placeholder={placeholder}
          className="[&_.ql-toolbar]:rounded-t-lg [&_.ql-toolbar]:border-0 [&_.ql-toolbar]:border-b [&_.ql-toolbar]:border-gray-300 dark:[&_.ql-toolbar]:border-gray-600 [&_.ql-container]:rounded-b-lg [&_.ql-container]:border-0 [&_.ql-editor]:min-h-24 [&_.ql-editor]:text-sm dark:[&_.ql-editor]:text-gray-100 dark:[&_.ql-toolbar]:bg-gray-800 dark:[&_.ql-container]:bg-gray-800"
        />
      </div>
      {maxLength !== undefined && (
        <p className={`text-xs mt-1 ${overLimit ? "text-red-600" : "text-gray-400"}`}>
          {plainTextLength} / {maxLength} characters
        </p>
      )}
    </div>
  );
}
