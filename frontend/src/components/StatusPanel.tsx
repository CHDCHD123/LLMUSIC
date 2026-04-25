type Props = {
  title: string;
  items: Array<{ label: string; value: string; meta?: string }>;
};

export default function StatusPanel({ title, items }: Props) {
  return (
    <section className="panel">
      <div className="panel-header">
        <h3>{title}</h3>
      </div>
      <div className="status-grid">
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
