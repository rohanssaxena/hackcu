import { Router } from "express";
import { generateDrill } from "../controllers/drillController.js";

export const drillRouter = Router();

drillRouter.post("/generate", generateDrill);
