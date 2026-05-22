import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
import ThemeToggle from "@/components/ThemeToggle";

type Props = {
  children: React.ReactNode;
  title?: string;
};

const NAV = [
  { href: "/", label: "Overview" },
  { href: "/explore", label: "Historical Figures" },
  { href: "/my-family", label: "Your Family" },
  { href: "/identify", label: "Identify" },
  { href: "/journey?mode=counterfactual", label: "Post-1965 Analysis" },
];

export default function Layout({ children, title }: Props) {
  const router = useRouter();
  const pageTitle = title
    ? `${title} — Immigration Journey`
    : "Immigration Journey · A Public-History Project";

  const isCurrent = (href: string) => {
    const target = href.split("?")[0];
    return router.pathname === target;
  };

  return (
    <>
      <Head>
        <title>{pageTitle}</title>
        <meta
          name="description"
          content="An interactive public-history project documenting American immigration through family stories, migration cartography, and demographic analysis."
        />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <div className="relative min-h-screen bg-museum-bg text-museum-text">
        <header className="sticky top-0 z-50 border-b border-museum-border/15 bg-museum-bg/92 backdrop-blur-xl">
          {/* Thin gold institutional rule at the very top */}
          <div className="h-[2px] w-full bg-gold/70" aria-hidden />
          <div className="mx-auto flex max-w-7xl items-center justify-between gap-6 px-6 py-4">
            <Link
              href="/"
              className="group flex items-center gap-3"
              aria-label="Immigration Journey · home"
            >
              {/* Editorial logomark — an engraved monogram */}
              <span
                aria-hidden
                className="relative flex h-8 w-8 items-center justify-center border border-gold/70"
              >
                <span className="font-display text-base leading-none text-gold">
                  IJ
                </span>
              </span>
              <span className="flex flex-col leading-tight">
                <span className="font-display text-lg tracking-wide text-museum-text">
                  Immigration Journey
                </span>
                <span className="text-[10px] uppercase tracking-[0.22em] text-museum-muted">
                  A Public-History Project
                </span>
              </span>
            </Link>
            <nav className="flex items-center gap-1" aria-label="Primary">
              {NAV.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="nav-link"
                  aria-current={isCurrent(item.href) ? "page" : undefined}
                >
                  {item.label}
                </Link>
              ))}
              <span
                aria-hidden
                className="mx-2 h-4 w-px bg-museum-border/20"
              />
              <ThemeToggle />
            </nav>
          </div>
        </header>

        <main className="relative z-10">{children}</main>

        <footer className="relative z-10 mt-24 border-t border-museum-border/15 bg-museum-bg">
          <div className="mx-auto max-w-7xl px-6 py-12">
            <div className="grid gap-10 md:grid-cols-3">
              <div>
                <p className="eyebrow-gold">About this project</p>
                <p className="mt-3 max-w-sm text-sm leading-relaxed text-museum-muted">
                  An interactive cartographic and demographic record of American
                  immigration. Built for educators, researchers, and museum
                  visitors. Open methodology — see citations on each figure.
                </p>
              </div>
              <div>
                <p className="eyebrow-gold">Primary sources</p>
                <ul className="mt-3 space-y-1.5 text-sm text-museum-muted">
                  <li>FamilySearch International — genealogical records</li>
                  <li>WikiTree — collaborative family tree</li>
                  <li>Wikidata + Wikipedia — public biography</li>
                  <li>U.S. Census Bureau — demographic series</li>
                  <li>Ellis Island Foundation — passenger manifests</li>
                </ul>
              </div>
              <div>
                <p className="eyebrow-gold">Citation</p>
                <p className="mt-3 max-w-sm font-mono text-xs leading-relaxed text-museum-muted">
                  &ldquo;Immigration Journey: A Public-History Project,&rdquo;
                  accessed {new Date().getFullYear()}.
                </p>
                <p className="mt-4 text-xs text-museum-faint">
                  All modeled data is labeled. Verified records are linked to
                  their source archive. No personal-record data is stored.
                </p>
              </div>
            </div>
            <div className="mt-10 flex flex-wrap items-center justify-between gap-4 border-t border-museum-border/10 pt-6">
              <p className="text-xs text-museum-faint">
                © {new Date().getFullYear()} Immigration Journey. Research and
                educational use.
              </p>
              <p className="text-[10px] uppercase tracking-[0.22em] text-museum-faint">
                Published edition · {new Date().getFullYear()}
              </p>
            </div>
          </div>
        </footer>
      </div>
    </>
  );
}
