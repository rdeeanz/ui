import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare"

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  outputFileTracingRoot: import.meta.dirname,
  // Packages that ship workerd-specific code must stay external so OpenNext
  // bundles the correct entrypoint for the Cloudflare Workers runtime.
  // See https://opennext.js.org/cloudflare/howtos/workerd
  serverExternalPackages: [
    "exceljs",
    "@prisma/client",
    ".prisma/client",
    "jose",
    "bcryptjs",
  ],
  eslint: { ignoreDuringBuilds: true },
  typescript: { ignoreBuildErrors: false },
}

// Makes Cloudflare bindings (e.g. the D1 `DB` binding) available during
// `next dev` via getCloudflareContext(), backed by a local Miniflare instance.
initOpenNextCloudflareForDev()

export default nextConfig
