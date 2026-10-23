/** @type {import('next').NextConfig} */
const nextConfig = {
  // Pre-render every page to plain HTML in ./out. No server, no client-side
  // routing needed to see the content — crawlers (and AI tools) get real HTML.
  output: "export",
  trailingSlash: true,
  reactStrictMode: true,
  images: { unoptimized: true },
};

export default nextConfig;
