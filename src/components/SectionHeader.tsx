type Props = {
  eyebrow?: string;
  title: string;
  description?: string;
};

export default function SectionHeader({ eyebrow, title, description }: Props) {
  // Try to split a folio number ("01 · Places") from the eyebrow label so
  // we can render it in mono.
  const parsed = (() => {
    if (!eyebrow) return null;
    const m = eyebrow.match(/^\s*(\d{1,2})\s*[·.\-—]\s*(.+)$/);
    if (m) return { num: m[1], label: m[2] };
    return { num: null, label: eyebrow };
  })();

  return (
    <header className="space-y-4">
      {parsed && (
        <div className="flex items-baseline gap-4">
          {parsed.num && (
            <span className="folio">Folio {parsed.num}</span>
          )}
          <span className="eyebrow">{parsed.label}</span>
          <span aria-hidden className="h-px flex-1 bg-museum-border/20" />
        </div>
      )}
      <h2 className="font-display text-3xl font-medium leading-tight text-museum-text md:text-5xl">
        {title}
      </h2>
      {description && (
        <p className="max-w-3xl font-serif text-base leading-relaxed text-museum-muted md:text-lg">
          {description}
        </p>
      )}
    </header>
  );
}
