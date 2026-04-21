/** @type {import('next').NextConfig} */

const securityHeaders = [
  // Prevent clickjacking
  { key: "X-Frame-Options", value: "DENY" },
  // Block MIME-type sniffing
  { key: "X-Content-Type-Options", value: "nosniff" },
  // Referrer — no leaking URLs across origins
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // Enforce HTTPS for 1 year (prod only — harmless in dev)
  { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" },
  // Permissions policy — lock down browser features
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), payment=(self)",
  },
  // Content-Security-Policy
  // - 'self' for scripts/styles by default
  // - next/font inlines base64 fonts → font-src data:
  // - Stripe.js loaded for payments
  // - Google Document AI is server-side only — no browser script needed
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      // Next.js requires 'unsafe-inline' for its inline scripts in dev;
      // in production, inline scripts are hashed — keep nonce-based in the future
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://js.stripe.com",
      "style-src 'self' 'unsafe-inline'",
      "font-src 'self' data: https://fonts.gstatic.com",
      "img-src 'self' data: blob:",
      "connect-src 'self' https://api.stripe.com",
      "frame-src https://js.stripe.com https://hooks.stripe.com",
      "frame-ancestors 'none'",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
    ].join("; "),
  },
];

const nextConfig = {
  // output: 'standalone' génère un build minimal pour Docker (node server.js)
  // Requis pour le Dockerfile multi-stage — décommenter pour activer le déploiement Docker
  // Désactivé par défaut car Vercel (déploiement principal) ne le requiert pas
  // output: "standalone",
  experimental: {
    // @prisma/client doit être externe pour SSR
    // @google-cloud/documentai est une dépendance optionnelle de production
    // importée dynamiquement — on l'externalise pour éviter l'erreur webpack
    serverComponentsExternalPackages: [
      "@prisma/client",
      "prisma",
      "@google-cloud/documentai",
    ],
  },
  images: {
    remotePatterns: [],
  },
  async headers() {
    return [
      {
        // Apply security headers to all routes
        source: "/(.*)",
        headers: securityHeaders,
      },
    ];
  },
  webpack: (config, { isServer }) => {
    if (isServer) {
      // Marque @google-cloud/documentai comme externe (prod only, not bundled)
      config.externals = [
        ...(Array.isArray(config.externals) ? config.externals : []),
        "@google-cloud/documentai",
      ];
    }
    return config;
  },
};

export default nextConfig;
