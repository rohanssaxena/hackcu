import { Router } from "express";
import { generateOutline } from "../controllers/outlineController.js";

export const outlineRouter = Router();

outlineRouter.post("/generate", generateOutline);
