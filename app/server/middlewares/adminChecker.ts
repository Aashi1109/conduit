import { BadRequestError, config, ForbiddenError } from "@/shared";
import { Request, Response, NextFunction } from "express";

const adminChecker = (req: Request, res: Response, next: NextFunction) => {
  if (!config.security.adminKey) {
    throw new BadRequestError("Admin key is not configured");
  }
  if (req.headers["x-admin-key"] !== config.security.adminKey) {
    throw new ForbiddenError("Access not allowed");
  }
  next();
};

export default adminChecker;
