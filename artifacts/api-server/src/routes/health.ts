import { Router, type IRouter, type Request, type Response } from "express";
import { HealthCheckResponse } from "@workspace/api-zod";

const router: IRouter = Router();

// Added explicit types for req and res to prevent the "Implicit Any" build error
router.get("/healthz", (_req: Request, res: Response) => {
  try {
    const data = HealthCheckResponse.parse({ status: "ok" });
    res.json(data);
  } catch (error: any) {
    res.status(500).json({ status: "error", message: error.message });
  }
});

export default router;
