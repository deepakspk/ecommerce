import { getInitials, getAvatarColor } from "../utils/avatar";

const SIZE_CLASSES = {
  sm: "w-8 h-8 text-xs",
  md: "w-10 h-10 text-sm",
  lg: "w-20 h-20 text-2xl",
};

export default function Avatar({ user, size = "md", className = "" }) {
  const sizeClass = SIZE_CLASSES[size] || SIZE_CLASSES.md;

  if (user?.avatarUrl) {
    return (
      <img
        src={user.avatarUrl}
        alt={user.name || "Avatar"}
        className={`${sizeClass} rounded-full object-cover flex-shrink-0 ${className}`}
      />
    );
  }

  return (
    <div
      className={`${sizeClass} ${getAvatarColor(user?.email || user?.name)} rounded-full flex items-center justify-center text-white font-semibold flex-shrink-0 ${className}`}
    >
      {getInitials(user?.name)}
    </div>
  );
}
