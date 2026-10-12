import type { NextConfig } from "next";
import { parsePublicEnv } from "./src/lib/env/public";
import { parseServerEnv } from "./src/lib/env/server-schema";

// Next.js loads .env files before this config. Fail before dev/build/start
// for invalid settings, without printing any supplied values.
parsePublicEnv(process.env);
parseServerEnv(process.env);

const nextConfig: NextConfig = {
  poweredByHeader: false,
  experimental: { agentFeedback: false },
  turbopack: {
    rules: {
      "*.css": { loaders: ["@tailwindcss/turbopack"], as: "*.css" },
    },
  },
};

export default nextConfig;
