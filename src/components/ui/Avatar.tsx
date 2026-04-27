interface AvatarProps {
  name?: string | null;
  size?: number;
  color?: string;
  fg?: string;
  className?: string;
}

export function Avatar({ name, size = 32, color = "#0A0A0A", fg = "#C6F24E", className = "" }: AvatarProps) {
  const initial = (name || "?").trim().charAt(0).toUpperCase();
  return (
    <div
      className={`bz-avatar ${className}`}
      style={{
        width: size,
        height: size,
        fontSize: Math.round(size * 0.42),
        background: color,
        color: fg,
      }}
      aria-hidden="true"
    >
      {initial}
    </div>
  );
}

export default Avatar;
