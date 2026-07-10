/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["@leadpilot/ui", "@leadpilot/types"],
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**",
      },
    ],
  },
  compress: true,
  poweredByHeader: false,
  reactStrictMode: true,
};

export default nextConfig;
