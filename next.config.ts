import type { NextConfig } from "next";

// Static export: the whole app compiles to plain HTML/JS/CSS with no server.
// NEXT_PUBLIC_BASE_PATH is "/vaj" on GitHub Pages (project subpath) and empty
// when serving the build at a domain root.
const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

const nextConfig: NextConfig = {
  output: "export",
  basePath,
  trailingSlash: true,
  images: { unoptimized: true },
};

export default nextConfig;
