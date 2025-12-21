import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

crons.interval(
  "cleanup stale paper rag",
  { hours: 24 },
  internal.rag.cleanupStalePaperRag,
);

export default crons;
