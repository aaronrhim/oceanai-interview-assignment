import type { NextConfig } from "next";

const config: NextConfig = {
  reactStrictMode: true,
  experimental: {
    viewTransition: true,
    optimizePackageImports: [
      "motion",
      "@react-three/fiber",
      "@react-three/drei",
      "lottie-react",
    ],
  },
  webpack: (config) => {
    config.module.rules.push({
      test: /\.(glsl|vs|fs|vert|frag)$/,
      type: "asset/source",
    });
    return config;
  },
};

export default config;
