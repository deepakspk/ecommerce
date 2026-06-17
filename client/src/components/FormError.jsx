export function FormError({ message }) {
  if (!message) return null;
  return (
    <div className="rounded-md bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2 mb-4">
      {message}
    </div>
  );
}

export function FieldError({ errors, field }) {
  if (!errors?.[field]) return null;
  return <p className="text-red-600 text-sm mt-1">{errors[field]}</p>;
}
