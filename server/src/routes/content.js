import { Router } from "express";
import { generateContent } from "../controllers/contentController.js";

export const contentRouter = Router();

contentRouter.post("/generate", generateContent);
