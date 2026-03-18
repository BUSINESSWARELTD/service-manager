import { Router, type IRouter } from "express";
import healthRouter from "./health.js";
import ticketsRouter from "./tickets.js";
import partsRouter from "./parts.js";
import techniciansRouter from "./technicians.js";
import settingsRouter from "./settings.js";
import downloadRouter from "./download.js";

const router: IRouter = Router();

router.use(healthRouter);
router.use(ticketsRouter);
router.use(partsRouter);
router.use(techniciansRouter);
router.use(settingsRouter);
router.use(downloadRouter);

export default router;
