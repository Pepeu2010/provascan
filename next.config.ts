import type { NextConfig } from "next";

const scriptSrc = ["'self'", "'unsafe-inline'"];

if (process.env.NODE_ENV !== "production") {
  scriptSrc.push("'unsafe-eval'");
}

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
          {
            key: "Content-Security-Policy",
            value: [
              "default-src 'self'",
              "img-src 'self' data: blob:",
              "style-src 'self' 'unsafe-inline'",
              `script-src ${scriptSrc.join(" ")}`,
              "font-src 'self' https://fonts.gstatic.com",
              "connect-src 'self' https://sheets.googleapis.com",
              "object-src 'none'",
              "frame-src 'none'",
              "frame-ancestors 'none'",
              "base-uri 'self'",
              "form-action 'self'",
              "worker-src 'self' blob:",
            ].join("; "),
          },
        ],
      },
    ];
  },
};

export default nextConfig;
