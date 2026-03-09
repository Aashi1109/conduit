import {
  DataTypes,
  type QueryInterface,
  type Sequelize,
  Sequelize as SequelizeCtor,
} from "sequelize";
import { getDBConnection } from "@/shared";

/**
 * Simple example migration wired to the shared Sequelize connection.
 *
 * Run with something like:
 *   tsx -r tsconfig-paths/register src/migrations/20260309-example-migration.ts up
 *   tsx -r tsconfig-paths/register src/migrations/20260309-example-migration.ts down
 */

const sequelize: Sequelize = getDBConnection();
const queryInterface: QueryInterface = sequelize.getQueryInterface();

export async function up(): Promise<void> {
  // users
  await queryInterface.createTable("users", {
    id: {
      type: DataTypes.UUID,
      allowNull: false,
      primaryKey: true,
    },
    name: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    email: {
      type: DataTypes.TEXT,
      allowNull: false,
      unique: true,
    },
    created_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: SequelizeCtor.literal("NOW()"),
    },
    updated_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: SequelizeCtor.literal("NOW()"),
    },
  });

  // api_keys
  await queryInterface.createTable("api_keys", {
    id: {
      type: DataTypes.UUID,
      allowNull: false,
      primaryKey: true,
    },
    key_hash: {
      type: DataTypes.TEXT,
      allowNull: false,
      unique: true,
    },
    key_prefix: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    name: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    owner: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    user_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: "users",
        key: "id",
      },
      onUpdate: "CASCADE",
      onDelete: "CASCADE",
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
    rate_limit: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 100,
    },
    rate_window: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 60,
    },
    last_used_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    created_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: SequelizeCtor.literal("NOW()"),
    },
    updated_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: SequelizeCtor.literal("NOW()"),
    },
  });

  // refresh_tokens
  await queryInterface.createTable("refresh_tokens", {
    id: {
      type: DataTypes.UUID,
      allowNull: false,
      primaryKey: true,
    },
    token_hash: {
      type: DataTypes.TEXT,
      allowNull: false,
      unique: true,
    },
    api_key_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: "api_keys",
        key: "id",
      },
      onUpdate: "CASCADE",
      onDelete: "CASCADE",
    },
    user_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: "users",
        key: "id",
      },
      onUpdate: "CASCADE",
      onDelete: "CASCADE",
    },
    is_used: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    expires_at: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    created_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: SequelizeCtor.literal("NOW()"),
    },
    updated_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: SequelizeCtor.literal("NOW()"),
    },
  });

  // usage_logs
  await queryInterface.createTable("usage_logs", {
    id: {
      type: DataTypes.BIGINT,
      allowNull: false,
      autoIncrement: true,
      primaryKey: true,
    },
    api_key_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: "api_keys",
        key: "id",
      },
      onUpdate: "CASCADE",
      onDelete: "CASCADE",
    },
    service: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    method: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    path: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    status_code: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    latency_ms: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    ip: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    created_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: SequelizeCtor.literal("NOW()"),
    },
    updated_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: SequelizeCtor.literal("NOW()"),
    },
  });

  await queryInterface.addIndex("usage_logs", ["api_key_id"], {
    name: "idx_usage_logs_api_key_id",
  });

  await queryInterface.addIndex("usage_logs", {
    name: "idx_usage_logs_created_at_desc",
    fields: [
      {
        name: "created_at",
        order: "DESC",
      },
    ],
  });

  // rate_limit_counters (unlogged table - use raw SQL to match)
  await sequelize.query(`
    CREATE UNLOGGED TABLE IF NOT EXISTS rate_limit_counters (
      bucket_key  TEXT PRIMARY KEY,
      count       INTEGER NOT NULL DEFAULT 0,
      window_end  TIMESTAMPTZ NOT NULL,
      updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  await queryInterface.addIndex("rate_limit_counters", ["window_end"], {
    name: "idx_rl_window_end",
  });

  // cache_entries
  await queryInterface.createTable("cache_entries", {
    key: {
      type: DataTypes.TEXT,
      allowNull: false,
      primaryKey: true,
    },
    value: {
      type: DataTypes.JSONB,
      allowNull: false,
    },
    expires_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    created_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: SequelizeCtor.literal("NOW()"),
    },
    updated_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: SequelizeCtor.literal("NOW()"),
    },
  });
}

export async function down(): Promise<void> {
  await queryInterface.dropTable("cache_entries");
  await queryInterface.removeIndex("rate_limit_counters", "idx_rl_window_end");
  await queryInterface.dropTable("rate_limit_counters");
  await queryInterface.removeIndex(
    "usage_logs",
    "idx_usage_logs_created_at_desc",
  );
  await queryInterface.removeIndex("usage_logs", "idx_usage_logs_api_key_id");
  await queryInterface.dropTable("usage_logs");
  await queryInterface.dropTable("refresh_tokens");
  await queryInterface.dropTable("api_keys");
  await queryInterface.dropTable("users");
}

// Optional CLI runner so you can call: tsx ... this-file.ts up|down
if (require.main === module) {
  const direction = process.argv[2] as "up" | "down" | undefined;

  (async () => {
    if (direction === "up") {
      await up();
    } else if (direction === "down") {
      await down();
    } else {
      // eslint-disable-next-line no-console
      console.error("Usage: ts-node <file> up|down");
      process.exitCode = 1;
    }
    await sequelize.close();
  })().catch((err) => {
    // eslint-disable-next-line no-console
    console.error(err);
    process.exitCode = 1;
  });
}
