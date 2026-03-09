import { DataTypes, Model, Optional } from "sequelize";
import { getDBConnection } from "@/shared";
import { uuidv7 } from "uuidv7";
import { User } from "@/features/user/model";

export interface ApiKeyAttributes {
  id: string;
  keyHash: string;
  keyPrefix: string;
  name: string;
  owner: string;
  userId: string;
  isActive: boolean;
  rateLimit: number;
  rateWindow: number;
  lastUsedAt: Date | null;
  createdAt?: Date;
  updatedAt?: Date;
}

type ApiKeyCreationAttributes = Optional<
  ApiKeyAttributes,
  | "id"
  | "isActive"
  | "rateLimit"
  | "rateWindow"
  | "lastUsedAt"
  | "createdAt"
  | "updatedAt"
>;

export class ApiKey
  extends Model<ApiKeyAttributes, ApiKeyCreationAttributes>
  implements ApiKeyAttributes
{
  public id!: string;
  public keyHash!: string;
  public keyPrefix!: string;
  public name!: string;
  public owner!: string;
  public userId!: string;
  public isActive!: boolean;
  public rateLimit!: number;
  public rateWindow!: number;
  public lastUsedAt!: Date | null;

  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

export interface RefreshTokenAttributes {
  id: string;
  tokenHash: string;
  apiKeyId: string;
  userId: string;
  isUsed: boolean;
  expiresAt: Date;
  createdAt?: Date;
  updatedAt?: Date;
}

type RefreshTokenCreationAttributes = Optional<
  RefreshTokenAttributes,
  "id" | "isUsed" | "createdAt" | "updatedAt"
>;

export class RefreshToken
  extends Model<RefreshTokenAttributes, RefreshTokenCreationAttributes>
  implements RefreshTokenAttributes
{
  public id!: string;
  public tokenHash!: string;
  public apiKeyId!: string;
  public userId!: string;
  public isUsed!: boolean;
  public expiresAt!: Date;

  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

const sequelize = getDBConnection();

ApiKey.init(
  {
    id: {
      type: DataTypes.UUID,
      primaryKey: true,
      defaultValue: uuidv7,
    },
    keyHash: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
      field: "key_hash",
    },
    keyPrefix: {
      type: DataTypes.STRING,
      allowNull: false,
      field: "key_prefix",
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    owner: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: "user_id",
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
      field: "is_active",
    },
    rateLimit: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 100,
      field: "rate_limit",
    },
    rateWindow: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 60,
      field: "rate_window",
    },
    lastUsedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: "last_used_at",
    },
  },
  {
    sequelize,
    tableName: "api_keys",
    underscored: true,
  },
);

RefreshToken.init(
  {
    id: {
      type: DataTypes.UUID,
      primaryKey: true,
      defaultValue: uuidv7,
    },
    tokenHash: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
      field: "token_hash",
    },
    apiKeyId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: "api_key_id",
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: "user_id",
    },
    isUsed: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      field: "is_used",
    },
    expiresAt: {
      type: DataTypes.DATE,
      allowNull: false,
      field: "expires_at",
    },
  },
  {
    sequelize,
    tableName: "refresh_tokens",
    underscored: true,
  },
);

User.hasMany(ApiKey, { foreignKey: "userId", onDelete: "CASCADE" });
ApiKey.belongsTo(User, { foreignKey: "userId" });

User.hasMany(RefreshToken, { foreignKey: "userId", onDelete: "CASCADE" });
RefreshToken.belongsTo(User, { foreignKey: "userId" });

ApiKey.hasMany(RefreshToken, { foreignKey: "apiKeyId", onDelete: "CASCADE" });
RefreshToken.belongsTo(ApiKey, { foreignKey: "apiKeyId" });

void ApiKey.sync();
void RefreshToken.sync();
