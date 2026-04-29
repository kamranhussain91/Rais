import { Router, type Request, type Response } from "express";
import { HealthCheckResponse } from "@workspace/api-zod";

// Let TypeScript infer the router type from Router() directly
// IRouter is too loose for Express 5's updated handler signatures
const router = Router();

router.get("/healthz", (_req: Request, res: Response): void => {
  try {
    const data = HealthCheckResponse.parse({ status: "ok" });
    res.json(data);
  } catch (error) {
    // useUnknownInCatchVariables: true means error is "unknown", not "any"
    // Must narrow the type before accessing .message
    const message = error instanceof Error ? error.message : "Unknown error";
    res.status(500).json({ status: "error", message });
  }
});

export default router;
