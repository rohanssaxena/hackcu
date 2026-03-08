import { Router } from "express";
import {
  listConversations,
  createConversation,
  deleteConversation,
  getMessages,
  sendMessage,
  updateConversation,
} from "../controllers/chatController.js";

export const chatRouter = Router();

chatRouter.get("/conversations", listConversations);
chatRouter.post("/conversations", createConversation);
chatRouter.patch("/conversations/:id", updateConversation);
chatRouter.delete("/conversations/:id", deleteConversation);
chatRouter.get("/conversations/:id/messages", getMessages);
chatRouter.post("/conversations/:id/messages", sendMessage);
