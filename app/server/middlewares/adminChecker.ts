import { config } from "@/shared";
import { Request, Response, NextFunction } from "express";

const adminChecker = (req: Request, res: Response, next: NextFunction) => {
  if (req.headers["x-admin-key"] !== config.security.adminKey) {
    return res.status(403).json({ error: "Forbidden" });
  }
  next();
};

export default adminChecker;
