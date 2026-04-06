import { Router, type IRouter } from "express";
import healthRouter from "./health.js";
import authRouter from "./auth.js";
import customersRouter from "./customers.js";
import buildingsRouter from "./buildings.js";
import elevatorsRouter from "./elevators.js";
import inspectionsRouter from "./inspections.js";
import dashboardRouter from "./dashboard.js";
import usersRouter from "./users.js";
import exportRouter from "./export.js";
import billingRouter from "./billing.js";

// TODO: Add requireActiveSubscription middleware after billing launch
// import { requireActiveSubscription } from "../middleware/auth.js";

const router: IRouter = Router();

router.use(healthRouter);
router.use("/auth", authRouter);
router.use("/customers", customersRouter);
router.use("/buildings", buildingsRouter);
router.use("/elevators", elevatorsRouter);
router.use("/inspections", inspectionsRouter);
router.use("/dashboard", dashboardRouter);
router.use("/users", usersRouter);
router.use("/export", exportRouter);
router.use("/billing", billingRouter);

export default router;
