export default function StatStrip({ items, className = "" }) {
  return (
    <div className={`stat-strip${className ? ` ${className}` : ""}`}>
      {items.map(({ label, value, unit, icon: Icon, color }) => (
        <div className="stat-chip" key={label}>
          <Icon size={16} className="stat-icon" />
          <div>
            <span className="stat-label">{label}</span>
            <span className="stat-value" style={color ? { color } : undefined}>
              {value}
              {unit && <small>{unit}</small>}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}
