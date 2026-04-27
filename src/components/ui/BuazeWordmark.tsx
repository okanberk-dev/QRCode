interface BuazeWordmarkProps {
  size?: number;
  dark?: boolean;
  className?: string;
}

export function BuazeWordmark({ size = 18, dark = false, className = "" }: BuazeWordmarkProps) {
  return (
    <span
      className={`bz-wordmark ${className}`}
      style={{ fontSize: size, color: dark ? "#fff" : "#0A0A0A" }}
    >
      buaze<span className="dot">.</span>
    </span>
  );
}

export default BuazeWordmark;
