import type { GenealogySource } from "@/types";

type Props = {
  source: GenealogySource | "";
  profileUrl?: string;
};

const LABEL: Record<GenealogySource, string> = {
  curated: "Curated",
  familysearch: "FamilySearch",
  wikitree: "WikiTree",
  wikidata: "Wikidata",
  wikipedia: "Wikipedia",
  enriched: "Modeled",
  user: "Your tree",
};

export default function SourceChip({ source, profileUrl }: Props) {
  if (!source) return null;
  const label = LABEL[source as GenealogySource];
  if (!label) return null;

  const className =
    "inline-flex items-center gap-2 px-2.5 py-1 text-[10px] uppercase tracking-[0.22em] text-museum-muted transition";
  const inner = (
    <>
      <span
        aria-hidden
        className="h-1.5 w-1.5 rounded-full bg-gold"
      />
      <span>Source · {label}</span>
    </>
  );

  if (profileUrl) {
    return (
      <a
        href={profileUrl}
        target="_blank"
        rel="noopener noreferrer"
        className={`${className} border-b border-museum-border/30 hover:border-gold hover:text-museum-text`}
        title={`View source profile on ${label}`}
      >
        {inner}
      </a>
    );
  }

  return <span className={className}>{inner}</span>;
}
