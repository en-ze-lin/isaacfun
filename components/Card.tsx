import Link from "next/link";
import { initials, projectHref, resolveImage, type Project } from "@/lib/site";

/**
 * One project card. Built projects (with a `url`) are plain links — they're
 * static pages served from /public, outside Next's router. Placeholders link
 * to a generated stub page.
 */
export function Card({ section, item }: { section: string; item: Project }) {
  const href = projectHref(section, item);
  const image = resolveImage(item.image);

  const inner = (
    <>
      <div className="logo">
        {image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={image} alt="" width={150} height={150} loading="lazy" decoding="async" />
        ) : (
          initials(item.title)
        )}
      </div>
      <div className="body">
        <h2 className="title">{item.title}</h2>
        <p className="desc">{item.description}</p>
      </div>
    </>
  );

  return item.url ? (
    <a className="card" href={href}>
      {inner}
    </a>
  ) : (
    <Link className="card" href={href}>
      {inner}
    </Link>
  );
}
