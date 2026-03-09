import { DataTypes, Model, Optional } from "sequelize";
import { getDBConnection } from "@/shared";

export interface RateLimitCounterAttributes {
  bucketKey: string;
  count: number;
  windowEnd: Date;
  updatedAt?: Date;
}

type RateLimitCounterCreationAttributes = Optional<
  RateLimitCounterAttributes,
  "count" | "updatedAt"
>;

export class RateLimitCounter
  extends Model<RateLimitCounterAttributes, RateLimitCounterCreationAttributes>
  implements RateLimitCounterAttributes
{
  public bucketKey!: string;
  public count!: number;
  public windowEnd!: Date;

  public readonly updatedAt!: Date;
}

const sequelize = getDBConnection();

RateLimitCounter.init(
  {
    bucketKey: {
      type: DataTypes.STRING,
      primaryKey: true,
      field: "bucket_key",
    },
    count: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    windowEnd: {
      type: DataTypes.DATE,
      allowNull: false,
      field: "window_end",
    },
  },
  {
    sequelize,
    tableName: "rate_limit_counters",
    underscored: true,
  }
);

// This table is managed entirely by migrations (UNLOGGED); sync() is intentionally a no-op.
// eslint-disable-next-line @typescript-eslint/no-empty-function
RateLimitCounter.sync = (async () => {}) as unknown as typeof RateLimitCounter.sync;

