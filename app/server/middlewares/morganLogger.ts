import logger from "@/shared/logger";
import morgan from "morgan";

const stream = {
  write: (message: string) => logger.info(message.trim()),
};

const skip = () => false;

const morganMiddleware = morgan(
  ":remote-addr :method :url :status :res[content-length] - :response-time ms",

  { stream, skip },
);

export default morganMiddleware;
