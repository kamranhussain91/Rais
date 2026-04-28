import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import bikesRouter from "./bikes";
import customersRouter from "./customers";
import salesRouter from "./sales";
import dashboardRouter from "./dashboard";
import adminRouter from "./admin";
import banksRouter from "./banks";
import expensesRouter from "./expenses";
import purchaseOrdersRouter from "./purchase-orders";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(bikesRouter);
router.use(customersRouter);
router.use(salesRouter);
router.use(dashboardRouter);
router.use(adminRouter);
router.use(banksRouter);
router.use(expensesRouter);
router.use(purchaseOrdersRouter);

export default router;
