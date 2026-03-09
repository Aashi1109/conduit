import { config, logger } from "./src/shared";

const type = config.appType;

import(`./app/${type}`)
  .then(() => {
    logger.info(`App ${type} started`);
  })
  .catch((err) => {
    logger.error(`App ${type} failed to start`, err);
  });
