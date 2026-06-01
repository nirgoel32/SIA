import Link from "next/link";
import { motion } from "framer-motion";

type Props = {
  /** Name they searched for, used to personalize the headline. */
  searchedName: string;
};

/**
 * Shown when the genealogy search lands on the "modeled" fallback — i.e.,
 * no FamilySearch / WikiTree / Wikidata / Wikipedia profile matched the
 * user's name. Most ordinary families aren't in any of those archives;
 * the public archives skew heavily toward historically notable figures.
 *
 * Without this callout, users see the modeled-story output and assume the
 * app is broken because "it couldn't find my family." This banner sets the
 * expectation explicitly and points them at the two paths that DO produce
 * a real family-specific journey: GEDCOM upload, and manual entry.
 */
export default function NoMatchCallout({ searchedName }: Props) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      className="border border-gold/50 bg-gold/[0.04] p-6 md:p-8"
    >
      <div className="flex flex-wrap items-start gap-x-10 gap-y-6">
        <div className="min-w-0 flex-1">
          <p className="eyebrow-gold">This is expected — not an error</p>
          <h2 className="mt-3 font-display text-2xl font-medium leading-tight text-museum-text md:text-3xl">
            No public record matched {searchedName}
          </h2>
          <p className="mt-4 max-w-2xl font-serif text-base leading-relaxed text-museum-muted">
            Public genealogy archives — Wikipedia, WikiTree, Wikidata,
            FamilySearch — cover only a small fraction of families, mostly
            historically notable ones. <span className="text-museum-text">
              Your family almost certainly isn&rsquo;t in any of them, and
              that&rsquo;s normal.
            </span>{" "}
            What you&rsquo;re seeing below is a <em>modeled</em> story —
            generic migration patterns inferred from your surname and chosen
            era, useful as historical context but not your family&rsquo;s
            actual record.
          </p>
          <p className="mt-4 max-w-2xl font-serif text-base leading-relaxed text-museum-muted">
            To see <em>your</em> family&rsquo;s real journey — actual
            ancestors, real birthplaces, the routes they actually took — use
            one of the two options on the right.
          </p>
        </div>

        <aside className="flex w-full flex-col gap-3 sm:max-w-xs">
          <Link
            href="/my-family"
            className="btn-primary w-full justify-center text-center"
          >
            Upload your family tree
          </Link>
          <Link
            href="/my-family"
            className="btn-secondary w-full justify-center text-center"
          >
            Enter manually (3 generations)
          </Link>
          <p className="mt-2 text-[10px] uppercase tracking-[0.22em] text-museum-faint">
            Stays on your device · never uploaded
          </p>
        </aside>
      </div>

      <hr className="rule-ink mt-8" />

      <div className="mt-6 grid gap-x-10 gap-y-4 text-sm md:grid-cols-3">
        <div>
          <p className="eyebrow">Why no match</p>
          <p className="mt-2 font-serif leading-relaxed text-museum-muted">
            Public archives index biographies and curated family trees, not
            living people&rsquo;s ancestry.
          </p>
        </div>
        <div>
          <p className="eyebrow">What&rsquo;s below</p>
          <p className="mt-2 font-serif leading-relaxed text-museum-muted">
            A modeled journey using your surname&rsquo;s typical origin
            country and immigration era — for context, not record.
          </p>
        </div>
        <div>
          <p className="eyebrow">What you can do</p>
          <p className="mt-2 font-serif leading-relaxed text-museum-muted">
            Export a GEDCOM from FamilySearch or Ancestry (free) and upload
            it on the &ldquo;Your Family&rdquo; page.
          </p>
        </div>
      </div>
    </motion.section>
  );
}
