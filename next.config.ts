import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // gRPC uses Node-only APIs and loads proto/job-posting.proto from disk at runtime.
  serverExternalPackages: ["@grpc/grpc-js", "@grpc/proto-loader"],
  outputFileTracingIncludes: { "/**": ["./proto/**/*"] },
  experimental: {
    // Resume templates are up to 2 MB, sent to a Server Action as multipart form data.
    serverActions: { bodySizeLimit: "3mb" },
  },
};

export default nextConfig;
