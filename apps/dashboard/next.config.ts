import path from "node:path";

/** @type {import("next").NextConfig} */
const config = {
  outputFileTracingRoot: path.resolve(__dirname, "../.."),
  turbopack: { root: path.resolve(__dirname, "../..") },
  poweredByHeader: false,
  reactStrictMode: true,

  // Use git commit SHA as build ID so all multi-region replicas share the same ID.
  // Without this, each replica generates a different build ID, causing
  // "Failed to find Server Action" errors when requests hit different replicas.
  generateBuildId: () => process.env.GIT_COMMIT_SHA || crypto.randomUUID(),
  deploymentId: process.env.GIT_COMMIT_SHA,
  experimental: {
    optimizePackageImports: [
      "lucide-react",
      "react-icons",
      "date-fns",
      "framer-motion",
      "recharts",
      "@dnd-kit/core",
      "@dnd-kit/sortable",
      "usehooks-ts",
    ],
  },
  images: {
    unoptimized: true,
    loader: "custom",
    loaderFile: "./image-loader.ts",
    qualities: [80, 100],
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**",
      },
    ],
  },
  transpilePackages: [
    "@business-operations/ui",
    "@business-operations/tailwind",
    "@business-operations/invoice",
    "@business-operations/api",
  ],
  serverExternalPackages: ["@react-pdf/renderer", "@react-pdf/font", "pdfkit", "pino"],
  typescript: {
    ignoreBuildErrors: false,
  },
  devIndicators: false,
  async headers() {
    return [
      {
        source: "/((?!api/proxy).*)",
        headers: [
          {
            key: "X-Frame-Options",
            value: "DENY",
          },
        ],
      },
    ];
  },
};

export default config;
