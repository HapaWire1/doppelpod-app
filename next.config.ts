import type { NextConfig } from "next";

const securityHeaders = [
  { key: "X-Frame-Options",           value: "DENY" },
  { key: "X-Content-Type-Options",    value: "nosniff" },
  { key: "Referrer-Policy",           value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy",        value: "camera=(), microphone=(self), geolocation=()" },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' https://vercel.live", // unsafe-inline required by Next.js; vercel.live is the preview feedback toolbar
      "style-src 'self' 'unsafe-inline' https://vercel.live",
      "img-src 'self' data: blob: https: https://vercel.live https://vercel.com https://assets.vercel.com",
      "media-src 'self' blob: https:",
      "font-src 'self' https://vercel.live https://assets.vercel.com",
      "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://api.stripe.com https://js.stripe.com https://vercel.live https://*.pusher.com wss://*.pusher.com wss://ws-us3.pusher.com",
      "frame-src https://js.stripe.com https://hooks.stripe.com https://vercel.live",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "upgrade-insecure-requests",
    ].join("; "),
  },
];

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
