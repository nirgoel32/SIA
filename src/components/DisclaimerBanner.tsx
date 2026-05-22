type Props = {
  variant?: "info" | "simulation" | "record";
  children: React.ReactNode;
};

const LABEL: Record<NonNullable<Props["variant"]>, string> = {
  info: "Notice",
  simulation: "Educational model",
  record: "Source note",
};

export default function DisclaimerBanner({
  variant = "info",
  children,
}: Props) {
  return (
    <aside
      role="note"
      className="relative border-l-2 border-gold/70 bg-museum-surface/[0.025] py-3 pl-5 pr-4"
    >
      <p className="eyebrow-gold">{LABEL[variant]}</p>
      <div className="mt-1 font-serif text-sm leading-relaxed text-museum-muted">
        {children}
      </div>
    </aside>
  );
}
