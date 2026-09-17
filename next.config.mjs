/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Prisma needs to be treated as an external during server bundling.
  experimental: {
    serverComponentsExternalPackages: ["@prisma/client", "bcryptjs", "nodemailer"],
  },
  // Standalone output keeps the Docker image small (see Dockerfile).
  output: "standalone",
};

export default nextConfig;
