import { Sequelize } from "sequelize";
import { DB_CONNECTION_NAMES, config, logger } from "@/shared";

type DbConnectionName = (typeof DB_CONNECTION_NAMES)["Default"];

const postgresConnection: Partial<Record<DbConnectionName, Sequelize>> = {};

export const getConnections = (): Partial<
  Record<DbConnectionName, Sequelize>
> => postgresConnection;

const connect = (name: DbConnectionName): Sequelize => {
  const sequelize = new Sequelize(config.db[name], {
    logging: (msg, duration) =>
      logger.debug({
        message: msg,
        duration: typeof duration === "number" ? duration : null,
      }),
    benchmark: process.env.NODE_ENV !== "production",
    retry: {
      max: 5,
      match: [
        /ConnectionError/,
        /SequelizeConnectionError/,
        /SequelizeConnectionRefusedError/,
        /SequelizeHostNotFoundError/,
        /SequelizeHostNotReachableError/,
        /SequelizeInvalidConnectionError/,
        /SequelizeConnectionTimedOutError/,
        /SequelizeConnectionAcquireTimeoutError/,
      ],
    },
    pool: {
      max: 20,
      min: 0,
      acquire: 60000,
      idle: 10000,
    },
    dialectOptions: {
      application_name: config.infrastructure.appName || "Local",
      fallback_application_name: config.infrastructure.appName || "Local",
    },
  });

  return sequelize;
};

export async function disconnect() {
  const disconnecting: Promise<void>[] = [];

  for (const connection of Object.values(postgresConnection)) {
    if (connection) {
      disconnecting.push(connection.close());
    }
  }

  await Promise.all(disconnecting);
}

export function getDBConnection(
  name: DbConnectionName = DB_CONNECTION_NAMES.Default,
): Sequelize {
  if (postgresConnection[name]) {
    return postgresConnection[name] as Sequelize;
  }
  if (!config.db[name]) {
    throw new Error(`DB connection not exists: ${name}`);
  }
  postgresConnection[name] = connect(name);
  return postgresConnection[name] as Sequelize;
}
