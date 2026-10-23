import Link from "next/link";
import type { ReactNode } from "react";
import { maskLabel, menu, site } from "@/lib/site";

/**
 * The page frame: masthead + (on content pages) the section content + footer.
 * Home shows only the numbered menu; every other page pins the title top-left.
 * Everything here is rendered to static HTML at build time.
 */
export function Shell({ home = false, children }: { home?: boolean; children?: ReactNode }) {
  const brand = (
    <Link className="site-title" href="/">
      {site.name}
    </Link>
  );

  return (
    <>
      <main id="main" className={home ? "is-home" : undefined}>
        <header className="masthead">
          {home ? <h1 className="brand">{brand}</h1> : <p className="brand">{brand}</p>}
          <nav className="index" id="index" aria-label="Main">
            {menu.map((item, i) => (
              <Link key={item.slug} className="idx-link" href={`/${item.slug}/`}>
                <span className="n" aria-hidden="true">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span className="t" data-masked={maskLabel(item)}>
                  <span className="full">{item.label}</span>
                </span>
              </Link>
            ))}
          </nav>
        </header>
        {home ? (
          <p className="sr-only">{site.description}</p>
        ) : (
          <section id="app">{children}</section>
        )}
      </main>
      <footer id="footer">
        {!home && (
          <nav className="footnav" aria-label="Footer">
            {menu.map((item) => (
              <Link key={item.slug} href={`/${item.slug}/`}>
                {item.label.toLowerCase()}
              </Link>
            ))}
          </nav>
        )}
        <p>
          © {new Date().getFullYear()} {site.name}
        </p>
      </footer>
    </>
  );
}
