/** @type {import('next').NextConfig} */
const nextConfig = {
    reactStrictMode: true,
    async headers() {
      return [
        {
          source: "/embed/:id",
          headers: [
            {
              key: "Content-Security-Policy",
              value: "frame-ancestors *; frame-src https://www.youtube.com",
            },
          ],
        },
      ];
    },
  };
  
  module.exports = nextConfig;