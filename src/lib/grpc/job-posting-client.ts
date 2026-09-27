import "server-only";
import path from "node:path";
import * as grpc from "@grpc/grpc-js";
import * as protoLoader from "@grpc/proto-loader";
import { ApiError } from "@/lib/api/errors";
import type { RecruiterCaller } from "@/lib/identity.server";
import { grpcErrorToApiError } from "./job-mapper";

// gRPC client for the Job Posting Service. Runs only on the Next.js server:
// browsers can't speak gRPC, so pages reach it through Server Actions.

const DEADLINE_MS = 5000;

type UnaryMethod = (
  request: object,
  metadata: grpc.Metadata,
  options: grpc.CallOptions,
  callback: (err: grpc.ServiceError | null, response: unknown) => void,
) => void;

type JobPostingClient = grpc.Client & Record<string, UnaryMethod>;

// One client per server process. Kept on globalThis so dev hot reloads don't
// open a new channel every time this module is re-evaluated.
const globalForGrpc = globalThis as unknown as { jobPostingClient?: JobPostingClient };

function getClient(): JobPostingClient {
  if (globalForGrpc.jobPostingClient) return globalForGrpc.jobPostingClient;
  const url = process.env.JOB_POSTING_GRPC_URL;
  if (!url) throw new ApiError("CONFIG_ERROR", "JOB_POSTING_GRPC_URL is not set. Add it to .env.local and restart the dev server.");

  const definition = protoLoader.loadSync(path.join(process.cwd(), "proto", "job-posting.proto"), {
    keepCase: true,
    longs: String,
    enums: String,
    defaults: true,
    oneofs: true,
  });
  const loaded = grpc.loadPackageDefinition(definition) as unknown as {
    rolefit: { jobposting: { v1: { JobPostingService: grpc.ServiceClientConstructor } } };
  };
  const Client = loaded.rolefit.jobposting.v1.JobPostingService;
  globalForGrpc.jobPostingClient = new Client(url, grpc.credentials.createInsecure()) as JobPostingClient;
  return globalForGrpc.jobPostingClient;
}

/**
 * Calls one unary RPC. Sends the recruiter identity as metadata when given.
 * Rejects with an ApiError (never a raw gRPC error).
 */
export function callJobPosting<T>(method: string, request: object, caller?: RecruiterCaller): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const client = getClient();
    const metadata = new grpc.Metadata();
    if (caller) {
      metadata.set("x-user-id", caller.userId);
      metadata.set("x-company-id", caller.companyId);
    }
    client[method](request, metadata, { deadline: Date.now() + DEADLINE_MS }, (err, response) => {
      if (err) reject(grpcErrorToApiError(err));
      else resolve(response as T);
    });
  });
}
