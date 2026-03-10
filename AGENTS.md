## Learned User Preferences

- Use config everywhere; never access process.env directly in feature code
- No `any` — use proper types; enforce no-explicit-any in ESLint
- Fix issues properly; don't hack or create unnecessary workaround files
- Logic belongs in service/controller layers; thin controllers, middleware for cross-cutting only
- Use shared error classes (CustomError subclasses) instead of manual res.status in controllers
- When told to "refer" something, reference only — don't replicate
- Keep AJV validation in feature-level validations.ts, not inline in routes
- Run migrations with explicit up/down args: `tsx ... migration.ts up` or `down`

## Learned Workspace Facts

- Server name: Conduit
- Models live in feature folders: src/features/{feature}/model.ts
- Migrations: single consolidated file preferred
- Middleware order defined in route files, not server/index.ts
- Swagger apis: include both .ts and .js for dev and build (build has only .js)
- Skip body parsing for proxy routes (/api/v1/proxy/*) so raw stream stays intact for the proxy
- Express body parsers: chain json then urlencoded; passing same next to both causes double next() → ERR_HTTP_HEADERS_SENT
- Winston logger: logger.http is below info level; use logger.info for morgan request logs when level is "info"
- Sequelize include: use { model: User }, not { association: ApiKey.associations.user }
- getDBConnection: type as Sequelize; ensure it never returns undefined
