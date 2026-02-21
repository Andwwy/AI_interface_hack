/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "**.mzstatic.com" },
    ],
  },
  webpack: (config) => {
    config.watchOptions = {
      ...config.watchOptions,
      ignored: [
        "**/node_modules/**",
        "**/Gallery (Copy)/**",
        "**/hand-gesture-animation/**",
      ],
    };
    return config;
  },
};

export default nextConfig;
