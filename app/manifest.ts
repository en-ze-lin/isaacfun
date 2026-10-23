import type { MetadataRoute } from "next";
import { site } from "@/lib/site";

export const dynamic = "force-static";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: site.name,
    short_name: "isaacfun",
    description: site.description,
    start_url: "/",
    display: "standalone",
    background_color: "#c9c9c9",
    theme_color: "#c9c9c9",
    icons: [{ src: "/favicon.png", sizes: "256x256", type: "image/png" }],
  };
}
