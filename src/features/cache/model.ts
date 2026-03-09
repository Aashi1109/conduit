import { DataTypes, Model, Optional } from "sequelize";
import { DB_CONNECTION_NAMES, getDBConnection } from "@/shared";

interface CacheEntryAttributes {
  key: string;
  value: unknown;
  expiresAt: Date | null;
  createdAt?: Date;
  updatedAt?: Date;
}

type CacheEntryCreationAttributes = Optional<
  CacheEntryAttributes,
  "expiresAt" | "createdAt" | "updatedAt"
>;

class CacheEntry
  extends Model<CacheEntryAttributes, CacheEntryCreationAttributes>
  implements CacheEntryAttributes
{
  public key!: string;
  public value!: unknown;
  public expiresAt!: Date | null;

  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

const sequelize = getDBConnection(DB_CONNECTION_NAMES.Default);

CacheEntry.init(
  {
    key: {
      type: DataTypes.STRING,
      primaryKey: true,
    },
    value: {
      type: DataTypes.JSONB,
      allowNull: false,
    },
    expiresAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: "expires_at",
    },
  },
  {
    sequelize,
    tableName: "cache_entries",
    underscored: true,
  }
);

// Ensure table exists when this model is imported
void CacheEntry.sync();

export default CacheEntry;

