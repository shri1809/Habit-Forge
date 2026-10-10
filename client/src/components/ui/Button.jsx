import { useState, forwardRef } from "react";

/**
 * 21st.dev-inspired interactive button component with:
 * - Spring physics press micro-interactions (cubic-bezier spring overshoot)
 * - Dynamic cursor-centered radial click ripple effect
 * - Subtle glass specular sheen sweep on hover
 * - Zero external library dependency, 100% React 19 compatible
 */
export const Button = forwardRef(function Button(
  {
    children,
    variant = "default",
    size = "md",
    className = "",
    disabled = false,
    loading = false,
    ripple = true,
    rippleColor,
    onClick,
    type = "button",
    ...props
  },
  ref
) {
  const [ripples, setRipples] = useState([]);

  const handlePointerDown = (e) => {
    if (disabled || loading || !ripple) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const diameter = Math.max(rect.width, rect.height) * 2.2;
    const x = e.clientX - rect.left - diameter / 2;
    const y = e.clientY - rect.top - diameter / 2;

    const newRipple = {
      id: Date.now() + Math.random(),
      x,
      y,
      size: diameter,
    };

    setRipples((prev) => [...prev.slice(-2), newRipple]);
  };

  const removeRipple = (id) => {
    setRipples((prev) => prev.filter((r) => r.id !== id));
  };

  const variantStyles = {
    primary:
      "bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold shadow-[0_0_20px_rgba(16,185,129,0.3),inset_0_1px_0_0_rgba(255,255,255,0.3)] border border-emerald-400/40",
    glass:
      "bg-slate-900/60 hover:bg-slate-800/80 text-slate-200 hover:text-white backdrop-blur-xl border border-white/10 hover:border-white/20 shadow-[0_8px_32px_0_rgba(0,0,0,0.36),inset_0_1px_0_0_rgba(255,255,255,0.08)]",
    secondary:
      "bg-slate-800/80 hover:bg-slate-700 text-slate-200 hover:text-white border border-slate-700/80",
    danger:
      "bg-red-500 hover:bg-red-400 text-white font-bold shadow-[0_0_15px_rgba(239,68,68,0.35)]",
    ghost:
      "bg-transparent hover:bg-white/[0.06] text-slate-400 hover:text-slate-200 border border-transparent",
    outline:
      "bg-transparent hover:bg-white/[0.05] text-slate-300 hover:text-white border border-white/15 hover:border-white/30",
    default: "",
  };

  const sizeStyles = {
    sm: "px-3 py-1.5 text-xs rounded-lg",
    md: "px-4 py-2.5 text-sm rounded-xl",
    lg: "px-5 py-3 text-base rounded-xl",
    icon: "p-2 rounded-xl",
    none: "",
  };

  const springScale =
    size === "icon"
      ? "active:scale-[0.91]"
      : size === "sm"
      ? "active:scale-[0.94]"
      : "active:scale-[0.95]";

  const defaultRippleColor =
    rippleColor ||
    (variant === "primary"
      ? "rgba(255, 255, 255, 0.45)"
      : variant === "danger"
      ? "rgba(255, 255, 255, 0.4)"
      : "rgba(255, 255, 255, 0.22)");

  const hasPosition = /\b(absolute|fixed|sticky|static)\b/.test(className);

  const computedClass = [
    "group overflow-hidden inline-flex items-center justify-center font-medium select-none transition-all duration-200 ease-[cubic-bezier(0.34,1.56,0.64,1)]",
    hasPosition ? "" : "relative",
    !disabled && !loading ? "hover:scale-[1.02] active:translate-y-0 cursor-pointer" : "",
    !disabled && !loading ? springScale : "",
    variantStyles[variant] || "",
    sizeStyles[size] || "",
    disabled ? "opacity-50 cursor-not-allowed" : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled || loading}
      onPointerDown={handlePointerDown}
      onClick={onClick}
      className={computedClass}
      {...props}
    >
      {/* Specular sheen sweep on hover (21st.dev visual polish) */}
      {!disabled && !loading && (
        <span
          className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-700 ease-in-out bg-gradient-to-r from-transparent via-white/[0.14] to-transparent pointer-events-none"
          aria-hidden="true"
        />
      )}

      {/* Dynamic radial click ripple wave */}
      {ripple && (
        <span
          className="absolute inset-0 pointer-events-none overflow-hidden rounded-[inherit]"
          aria-hidden="true"
        >
          {ripples.map((r) => (
            <span
              key={r.id}
              onAnimationEnd={() => removeRipple(r.id)}
              className="animate-ripple"
              style={{
                position: "absolute",
                left: r.x,
                top: r.y,
                width: r.size,
                height: r.size,
                borderRadius: "9999px",
                backgroundColor: defaultRippleColor,
                pointerEvents: "none",
              }}
            />
          ))}
        </span>
      )}

      {/* Button content */}
      <span className="relative z-10 flex items-center justify-center gap-2">
        {children}
      </span>
    </button>
  );
});

export default Button;
