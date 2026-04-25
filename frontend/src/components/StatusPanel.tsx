type Props = {
  title: string;
  items: Array<{ label: string; value: string; meta?: string }>;
  compact?: boolean;
};

export default function StatusPanel({ title, items, compact = false }: Props) {
  return (
    <section className={compact ? "panel compact-panel" : "panel"}>
      <div className="panel-header">
        <h3>{title}</h3>
      </div>
      <div className={compact ? "status-grid compact-status-grid" : "status-grid"}>
        {items.map((item) => (
          <article className="status-card" key={`${title}-${item.label}`}>
            <strong>{item.label}</strong>
            <span>{item.value}</span>
            {item.meta ? <small>{item.meta}</small> : null}
          </article>
        ))}
      </div>
    </section>
  );
}
