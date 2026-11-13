import { AlertCircle, CheckCircle2, Info, TriangleAlert } from "lucide-react";

const ICONS = {
  error: AlertCircle,
  success: CheckCircle2,
  warning: TriangleAlert,
  info: Info,
};

const TINTS = {
  error: { border: "var(--danger)", background: "color-mix(in srgb, var(--danger) 12%, transparent)" },
  success: { border: "var(--success)", background: "color-mix(in srgb, var(--success) 12%, transparent)" },
  warning: { border: "var(--warning)", background: "color-mix(in srgb, var(--warning) 12%, transparent)" },
  info: { border: "var(--accent)", background: "color-mix(in srgb, var(--accent) 12%, transparent)" },
};

export default function Alert({ variant = "info", children }) {
  const Icon = ICONS[variant] || ICONS.info;
  const tint = TINTS[variant] || TINTS.info;
  const role = variant === "error" || variant === "warning" ? "alert" : "status";

  return (
    <div
      role={role}
      className="rounded-lg border p-3 text-sm"
      style={{
        borderColor: tint.border,
        background: tint.background,
        color: "var(--text)",
      }}
    >
      <div className="flex items-start gap-2">
        <Icon size={16} style={{ color: tint.border, flexShrink: 0 }} />
        <div>{children}</div>
      </div>
    </div>
  );
}
