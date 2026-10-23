import type { Metadata } from "next";
import Link from "next/link";
import { Shell } from "@/components/Shell";

export const metadata: Metadata = {
  title: "Page not found",
  description: "This page doesn't exist.",
  robots: { index: false, follow: false },
};

export default function NotFound() {
  return (
    <Shell>
      <h1 className="page-title">404</h1>
      <div className="about">
        <p>this page doesn&apos;t exist (anymore).</p>
      </div>
      <p className="back">
        <Link href="/">&larr; home</Link>
      </p>
    </Shell>
  );
}
