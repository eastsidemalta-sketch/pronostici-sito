import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./i18n/request.ts");

const nextConfig: NextConfig = {
  output: "standalone",
  async redirects() {
    return [
      { source: "/it/it", destination: "/it", permanent: true },
      { source: "/it/it/:path*", destination: "/it/:path*", permanent: true },
      { source: "/pt-BR/pt-BR", destination: "/pt-BR", permanent: true },
      { source: "/pt-BR/pt-BR/:path*", destination: "/pt-BR/:path*", permanent: true },
      { source: "/ad2min3k/league-mapping", destination: "/ad2min3k/team-aliases-by-provider?tab=leghe", permanent: true },
      { source: "/ad2min3k/leghe", destination: "/ad2min3k/team-aliases-by-provider?tab=leghe", permanent: true },
    ];
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "media.api-sports.io",
        port: "",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "api-football.com",
        port: "",
        pathname: "/**",
      },
    ],
  },
  experimental: {
    serverActions: {
      bodySizeLimit: "10mb",
    },
    proxyClientMaxBodySize: "10mb",
  },
};

export default withNextIntl(nextConfig);
