import { DataTypes, Model, Optional } from "sequelize";
import { getDBConnection } from "@/shared";
import { ApiKey } from "@/features/auth/model";

export interface UsageLogAttributes {
  id: number;
  apiKeyId: string;
  service: string;
  method: string;
  path: string;
  statusCode: number | null;
  latencyMs: number | null;
  ip: string | null;
  createdAt?: Date;
  updatedAt?: Date;
}

type UsageLogCreationAttributes = Optional<
  UsageLogAttributes,
  "id" | "statusCode" | "latencyMs" | "ip" | "createdAt" | "updatedAt"
>;

export class UsageLog
  extends Model<UsageLogAttributes, UsageLogCreationAttributes>
  implements UsageLogAttributes
{
  public id!: number;
  public apiKeyId!: string;
  public service!: string;
  public method!: string;
  public path!: string;
  public statusCode!: number | null;
  public latencyMs!: number | null;
  public ip!: string | null;

  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

const sequelize = getDBConnection();

UsageLog.init(
  {
    id: {
      type: DataTypes.BIGINT,
      primaryKey: true,
      autoIncrement: true,
    },
    apiKeyId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: "api_key_id",
    },
    service: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    method: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    path: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    statusCode: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: "status_code",
    },
    latencyMs: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: "latency_ms",
    },
    ip: {
      type: DataTypes.STRING,
      allowNull: true,
    },
  },
  {
    sequelize,
    tableName: "usage_logs",
    underscored: true,
  }
);

ApiKey.hasMany(UsageLog, { foreignKey: "apiKeyId" });
UsageLog.belongsTo(ApiKey, { foreignKey: "apiKeyId" });

void UsageLog.sync();

