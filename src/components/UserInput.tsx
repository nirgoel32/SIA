import { motion } from "framer-motion";
import type { JourneyInput } from "@/types";

type Props = {
  onSubmit: (input: JourneyInput) => void;
  loading?: boolean;
};

const DECADES = ["1890s", "1900s", "1910s", "1920s", "1950s", "1960s", "1970s", "1980s", "1990s", "2000s"];

const COUNTRIES = [
  "India",
  "China",
  "Mexico",
  "Ireland",
  "Italy",
  "Germany",
  "Philippines",
  "Vietnam",
  "South Korea",
  "England",
  "Scotland",
  "Japan",
];

export default function UserInput({ onSubmit, loading }: Props) {
  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    onSubmit({
      surname: (fd.get("surname") as string).trim(),
      country: (fd.get("country") as string) || undefined,
      decade: (fd.get("decade") as string) || undefined,
      firstName: (fd.get("firstName") as string)?.trim() || undefined,
    });
  };

  return (
    <motion.section
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      className="mx-auto max-w-2xl px-6 py-20"
    >
      <div className="flex items-center gap-3 text-museum-muted">
        <span className="folio">Form A · Inquiry</span>
        <span aria-hidden className="h-px flex-1 bg-museum-border/20" />
      </div>

      <h2 className="mt-6 font-display text-4xl font-medium leading-tight text-museum-text md:text-5xl">
        Begin an inquiry
      </h2>
      <p className="mt-4 font-serif text-base leading-relaxed text-museum-muted md:text-lg">
        Enter a surname — and, if known, a first name and country of origin.
        We will attempt to anchor the inquiry to a verified public-record
        profile, then construct a migration map, family network, and
        demographic context.
      </p>

      <form onSubmit={handleSubmit} className="mt-12 space-y-10">
        <div className="grid gap-x-10 gap-y-8 sm:grid-cols-2">
          <label className="block">
            <span className="eyebrow">Given name</span>
            <input
              name="firstName"
              placeholder="e.g. Mahatma"
              className="field-rule mt-3"
              disabled={loading}
            />
            <span className="mt-1.5 block text-xs italic text-museum-faint">
              Optional
            </span>
          </label>

          <label className="block">
            <span className="eyebrow">
              Surname{" "}
              <span className="not-italic text-gold">· required</span>
            </span>
            <input
              name="surname"
              required
              placeholder="e.g. Gandhi"
              className="field-rule mt-3"
              disabled={loading}
            />
            <span className="mt-1.5 block text-xs italic text-museum-faint">
              Anchors the inquiry
            </span>
          </label>
        </div>

        <div className="grid gap-x-10 gap-y-8 sm:grid-cols-2">
          <label className="block">
            <span className="eyebrow">Country of origin</span>
            <select
              name="country"
              className="input-field mt-3"
              disabled={loading}
            >
              <option value="">Auto-detect from surname…</option>
              {COUNTRIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="eyebrow">Immigration era</span>
            <select
              name="decade"
              className="input-field mt-3"
              disabled={loading}
            >
              <option value="">Unknown / skip</option>
              {DECADES.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </label>
        </div>

        <hr className="rule-ink" />

        <div className="flex flex-col-reverse items-stretch gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-museum-faint">
            Submissions are processed against open archives. Nothing is
            retained.
          </p>
          <button
            type="submit"
            className="btn-primary"
            disabled={loading}
          >
            {loading ? "Discovering…" : "Submit inquiry"}
          </button>
        </div>
      </form>
    </motion.section>
  );
}
