import type { NextConfig } from "next";
import path from "node:path";

/*
 * Throwaway prototype: no image optimiser, no remote hosts, nothing to
 * configure. The frame sequences are plain static files under public/.
 *
 * turbopack.root pins the project root to this folder. Without it Next walks up
 * looking for a lockfile, finds a stray package-lock.json in the home directory
 * and warns that it would treat the whole home directory as the root.
 *
 * devIndicators is off only so the dev-mode badge does not sit on top of the
 * progress bar while the section is being judged.
 */
const nextConfig: NextConfig = {
  turbopack: { root: path.resolve(process.cwd()) },
  devIndicators: false,
};

export default nextConfig;
