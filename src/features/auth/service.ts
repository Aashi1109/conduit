import { Op, type Transaction } from "sequelize";
import { User } from "@/features/user/model";
import { ApiKey, RefreshToken } from "@/features/auth/model";
import {
  config,
  generateApiKey,
  generateRefreshToken,
  hashToken,
  ConflictError,
  UnauthorizedError,
} from "@/shared";
import { fireWebhook } from "@/features/webhook/service";

interface RegisterInput {
  name: string;
  email: string;
}

interface RegisterResult {
  userId: string;
}

interface RotateInput {
  apiKeyUserId: string;
  apiKeyOwner: string;
  refreshToken: string;
}

interface RecoverInput {
  email: string;
}

const formatUserDate = (date: Date): string => {
  const iso = date.toISOString(); // e.g. 2026-03-09T12:34:56.789Z
  return iso.replace("T", " ").replace(/\.\d+Z$/, " UTC");
};

export async function registerUser(input: RegisterInput): Promise<RegisterResult> {
  const existing = await User.findOne({ where: { email: input.email } });
  if (existing) {
    throw new ConflictError("Email already registered");
  }

  const sequelize = User.sequelize!;

  const result = await sequelize.transaction(async (tx: Transaction) => {
    const user = await User.create(
      {
        name: input.name,
        email: input.email,
      },
      { transaction: tx }
    );

    const rawApiKey = generateApiKey();
    const rawRefreshToken = generateRefreshToken();

    const apiKey = await ApiKey.create(
      {
        keyHash: hashToken(rawApiKey),
        keyPrefix: rawApiKey.slice(0, 8),
        name: `Default key for ${user.email}`,
        owner: user.email,
        userId: user.id,
      },
      { transaction: tx }
    );

    const ttlDays = config.auth.refreshTokenTtlDays;
    const expiresAt = new Date(Date.now() + ttlDays * 24 * 60 * 60 * 1000);

    await RefreshToken.create(
      {
        tokenHash: hashToken(rawRefreshToken),
        apiKeyId: apiKey.id,
        userId: user.id,
        expiresAt,
      },
      { transaction: tx }
    );

    return { user, rawApiKey, rawRefreshToken, expiresAt };
  });

  void fireWebhook({
    event: "key.created",
    user: {
      id: result.user.id,
      name: result.user.name,
      email: result.user.email,
    },
    api_key: result.rawApiKey,
    refresh_token: result.rawRefreshToken,
    issued_at: formatUserDate(new Date()),
    expires_at: formatUserDate(result.expiresAt),
  }).catch(() => {});

  return { userId: result.user.id };
}

export async function rotateKey(input: RotateInput): Promise<void> {
  const tokenHash = hashToken(input.refreshToken);
  const token = await RefreshToken.findOne({ where: { tokenHash } });

  const now = new Date();
  if (
    !token ||
    token.isUsed ||
    token.expiresAt <= now ||
    token.userId !== input.apiKeyUserId
  ) {
    throw new UnauthorizedError("Invalid or expired token");
  }

  const sequelize = RefreshToken.sequelize!;

  const result = await sequelize.transaction(async (tx: Transaction) => {
    await token.update({ isUsed: true }, { transaction: tx });

    const oldKey = await ApiKey.findByPk(token.apiKeyId, { transaction: tx });
    if (oldKey) {
      await oldKey.update({ isActive: false }, { transaction: tx });
    }

    const rawApiKey = generateApiKey();
    const rawRefreshToken = generateRefreshToken();

    const newKey = await ApiKey.create(
      {
        keyHash: hashToken(rawApiKey),
        keyPrefix: rawApiKey.slice(0, 8),
        name: oldKey?.name || "Rotated key",
        owner: oldKey?.owner || input.apiKeyOwner,
        userId: input.apiKeyUserId,
      },
      { transaction: tx }
    );

    const ttlDays = config.auth.refreshTokenTtlDays;
    const expiresAt = new Date(Date.now() + ttlDays * 24 * 60 * 60 * 1000);

    await RefreshToken.create(
      {
        tokenHash: hashToken(rawRefreshToken),
        apiKeyId: newKey.id,
        userId: input.apiKeyUserId,
        expiresAt,
      },
      { transaction: tx }
    );

    return {
      userId: input.apiKeyUserId,
      owner: input.apiKeyOwner,
      rawApiKey,
      rawRefreshToken,
      expiresAt,
    };
  });

  void fireWebhook({
    event: "key.rotated",
    user: {
      id: result.userId,
      name: result.owner,
      email: result.owner,
    },
    api_key: result.rawApiKey,
    refresh_token: result.rawRefreshToken,
    issued_at: formatUserDate(new Date()),
    expires_at: formatUserDate(result.expiresAt),
  }).catch(() => {});
}

export async function recoverKey(input: RecoverInput): Promise<void> {
  if (!input.email) {
    return;
  }

  const user = await User.findOne({ where: { email: input.email } });
  if (!user) {
    return;
  }

  const now = new Date();
  const existingToken = await RefreshToken.findOne({
    where: {
      userId: user.id,
      isUsed: false,
      expiresAt: { [Op.gt]: now },
    },
    order: [["createdAt", "DESC"]],
  });

  if (!existingToken) {
    return;
  }

  const sequelize = RefreshToken.sequelize!;

  const result = await sequelize.transaction(async (tx: Transaction) => {
    await existingToken.update({ isUsed: true }, { transaction: tx });

    const oldKey = await ApiKey.findByPk(existingToken.apiKeyId, {
      transaction: tx,
    });
    if (oldKey) {
      await oldKey.update({ isActive: false }, { transaction: tx });
    }

    const rawApiKey = generateApiKey();
    const rawRefreshToken = generateRefreshToken();

    const newKey = await ApiKey.create(
      {
        keyHash: hashToken(rawApiKey),
        keyPrefix: rawApiKey.slice(0, 8),
        name: oldKey?.name || "Recovered key",
        owner: oldKey?.owner || user.email,
        userId: user.id,
      },
      { transaction: tx }
    );

    const ttlDays = config.auth.refreshTokenTtlDays;
    const expiresAt = new Date(Date.now() + ttlDays * 24 * 60 * 60 * 1000);

    await RefreshToken.create(
      {
        tokenHash: hashToken(rawRefreshToken),
        apiKeyId: newKey.id,
        userId: user.id,
        expiresAt,
      },
      { transaction: tx }
    );

    return {
      user,
      rawApiKey,
      rawRefreshToken,
      expiresAt,
    };
  });

  void fireWebhook({
    event: "key.recovered",
    user: {
      id: result.user.id,
      name: result.user.name,
      email: result.user.email,
    },
    api_key: result.rawApiKey,
    refresh_token: result.rawRefreshToken,
    issued_at: formatUserDate(new Date()),
    expires_at: formatUserDate(result.expiresAt),
  }).catch(() => {});
}

