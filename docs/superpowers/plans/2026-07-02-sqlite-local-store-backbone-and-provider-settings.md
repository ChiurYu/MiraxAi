# SQLite 本地存储骨架与 Provider 设置迁移实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: 使用 superpowers:executing-plans 按 task 逐步执行。

**Goal:** 建立真实 SQLite 本地存储骨架，并将 settings 与 Provider 数据从 localStorage 迁移到 SQLite，同时保证 API Key 仅保存在本机 SQLite，不进入 snapshot / debug / 日志 / Git / localStorage。

**Architecture:** `packages/local-store` 提供与 Tauri 无关的 `LocalStoreDb` 驱动接口、repository contract 与迁移；`apps/desktop` 提供 `tauri-plugin-sql` 适配器并在 `main.ts` mount 前初始化；`useAppSettings` 优先使用 SQLite，失败回退 localStorage；`AiServicesSettings.vue` 不再明文回显 key。

**Tech Stack:** Tauri v2, `tauri-plugin-sql`, `@tauri-apps/plugin-sql`, Vue 3, Vitest, better-sqlite3 (via plugin), TypeScript.

## Global Constraints

- 允许修改：`packages/local-store/*`、`apps/desktop/src/composables/useAppSettings.ts`、`apps/desktop/src/components/settings/AiServicesSettings.vue`、`apps/desktop/src-tauri/*`（最小权限）、`apps/desktop/src/main.ts`、相关测试文件。
- 禁止修改：`docs/reverse-engineering/legacy-ui-gap-list.md`、`docs/人工提示词.md`、`docs/superpowers/PROJECT-STATE.md`、`.codex/dispatch-state.json`。
- 不要 commit / push。
- API Key 不得进入 snapshot / debug / export / log / Git / localStorage（除旧版迁移后的空 secret）。
- 不改变 provider real/mock 路由规则。

---

## Task 1: Schema 与 Record 类型扩展

**Files:**
- Modify: `packages/local-store/src/schema.ts`
- Modify: `packages/local-store/src/repositories.ts`
- Test: `packages/local-store/tests/schema.test.ts`

**Interfaces:**
- Consumes: 现有 `LOCAL_STORE_SCHEMA_TABLES`、`LOCAL_STORE_MIGRATIONS`。
- Produces: 新增 `provider_secrets` 迁移；`ProviderConfigRecord` 增加 `credentialRef?: string`；新增 `ProviderSecretsRecord`、`ProviderSecretsRepository` 类型。

**实现要点：**
1. 在 `LOCAL_STORE_SCHEMA_TABLES` 中加入 `"provider_secrets"`。
2. 在 `LOCAL_STORE_MIGRATIONS` 末尾追加：
   ```sql
   CREATE TABLE IF NOT EXISTS provider_secrets (
     credential_ref TEXT PRIMARY KEY,
     api_key TEXT NOT NULL,
     created_at TEXT NOT NULL,
     updated_at TEXT NOT NULL
   );
   ```
3. `ProviderConfigRecord` 增加 `credentialRef?: string;`。
4. 新增：
   ```ts
   export interface ProviderSecretsRecord {
     credentialRef: string;
     apiKey: string;
     createdAt: string;
     updatedAt: string;
   }

   export interface ProviderSecretsRepository {
     getByCredentialRef(credentialRef: string): Promise<ProviderSecretsRecord | undefined>;
     save(record: ProviderSecretsRecord): Promise<void>;
     deleteByCredentialRef(credentialRef: string): Promise<void>;
   }
   ```

**验收标准：**
- `createLocalStoreMigrationSql()` 输出包含 `CREATE TABLE IF NOT EXISTS provider_secrets`。
- `packages/local-store/tests/schema.test.ts` 新增断言：
  - `provider_secrets` 表存在。
  - `provider_secrets` SQL 中不包含除 `api_key` 之外的敏感字段名（token/cookie/password）。

**验证命令：**
```bash
pnpm test packages/local-store/tests/schema.test.ts
```

---

## Task 2: LocalStoreDb 驱动接口、Fake DB 与迁移 runner

**Files:**
- Create: `packages/local-store/src/db.ts`
- Create: `packages/local-store/src/migrate.ts`
- Create: `packages/local-store/src/fakeDb.ts`
- Modify: `packages/local-store/src/index.ts`
- Test: `packages/local-store/tests/db.test.ts`（或 `migrate.test.ts`）

**Interfaces:**
- Consumes: 无。
- Produces:
  ```ts
  export interface LocalStoreDb {
    execute(sql: string, bind?: unknown[]): Promise<void>;
    select<T extends Record<string, unknown>>(sql: string, bind?: unknown[]): Promise<T[]>;
  }

  export function migrateLocalStore(db: LocalStoreDb): Promise<void>;

  export interface RecordedCall {
    sql: string;
    bind?: unknown[];
  }

  export class FakeLocalStoreDb implements LocalStoreDb {
    calls: RecordedCall[];
    nextSelectRows: Record<string, unknown[]>;
    execute(sql: string, bind?: unknown[]): Promise<void>;
    select<T extends Record<string, unknown>>(sql: string, bind?: unknown[]): Promise<T[]>;
    whenSelect(sql: string, rows: Record<string, unknown>[]): void;
    clear(): void;
  }
  ```

**实现要点：**
1. `db.ts` 仅导出 `LocalStoreDb` 接口。
2. `migrate.ts` 中 `migrateLocalStore(db)` 拆分 `createLocalStoreMigrationSql()` 并按分号逐条 `execute`。
3. `fakeDb.ts` 中 `FakeLocalStoreDb`：
   - `execute` 记录调用到 `calls`，返回 resolved Promise。
   - `select` 记录调用，并按精确 SQL 字符串从 `nextSelectRows` 返回预设 rows；未命中返回空数组。
4. `index.ts` 导出 `LocalStoreDb`、`migrateLocalStore`、`FakeLocalStoreDb`。

**验收标准：**
- `migrateLocalStore(fakeDb)` 调用次数等于 `LOCAL_STORE_MIGRATIONS.length`，且最后一条 SQL 包含 `provider_secrets`。
- `FakeLocalStoreDb` 的 `execute`/`select` 调用记录可被测试读取。
- `whenSelect` 预设 rows 能按 SQL 返回。

**验证命令：**
```bash
pnpm test packages/local-store/tests/db.test.ts
```

---

## Task 3: Repository 工厂实现与测试

**Files:**
- Create: `packages/local-store/src/repositories/appSettingsRepository.ts`
- Create: `packages/local-store/src/repositories/sidecarConfigRepository.ts`
- Create: `packages/local-store/src/repositories/providerConfigRepository.ts`
- Create: `packages/local-store/src/repositories/providerSecretsRepository.ts`
- Create: `packages/local-store/src/repositories/index.ts`
- Modify: `packages/local-store/src/index.ts`（从 repositories/index 重新导出）
- Test: `packages/local-store/tests/repositories.test.ts`

**Interfaces:**
- Consumes: `LocalStoreDb`、`FakeLocalStoreDb`、record 类型。
- Produces:
  ```ts
  export function createAppSettingsRepository(db: LocalStoreDb): AppSettingsRepository;
  export function createSidecarConfigRepository(db: LocalStoreDb): SidecarConfigRepository;
  export function createProviderConfigRepository(db: LocalStoreDb): ProviderConfigRepository;
  export function createProviderSecretsRepository(db: LocalStoreDb): ProviderSecretsRepository;
  ```

**实现要点：**
1. 每个 repository 使用 snake_case 列名与 `?` 占位符。
2. `save` 使用 `INSERT OR REPLACE INTO ...`。
3. `ProviderConfigRepository.list()` 读取全部；`getById(id)` 使用 `WHERE id = ?`。
4. `ProviderSecretsRepository.getByCredentialRef(ref)` 使用 `WHERE credential_ref = ? LIMIT 1`；`deleteByCredentialRef(ref)` 使用 `DELETE FROM provider_secrets WHERE credential_ref = ?`。
5. 时间戳统一使用 ISO 字符串（`new Date().toISOString()`）。

**验收标准：**
- 对 `FakeLocalStoreDb` 调用 `createAppSettingsRepository(fakeDb).save(...)` 后，可验证 SQL 包含 `INSERT OR REPLACE INTO app_settings` 且 bind 参数包含 `theme`、`output_paths_json`。
- `createProviderConfigRepository(fakeDb).list()` 在预设 rows 后能返回 camelCase 记录。
- `createProviderSecretsRepository(fakeDb).deleteByCredentialRef("p1")` 生成正确的 DELETE SQL。
- repository 返回的 `ProviderConfigRecord` 不包含 `apiKey`。

**验证命令：**
```bash
pnpm test packages/local-store/tests/repositories.test.ts
```

---

## Task 4: Tauri SQL Plugin 依赖与权限

**Files:**
- Modify: `apps/desktop/src-tauri/Cargo.toml`
- Modify: `apps/desktop/src-tauri/capabilities/default.json`
- Modify: `apps/desktop/package.json`
- Modify: `pnpm-lock.yaml`（通过 `pnpm install` 生成）

**实现要点：**
1. `Cargo.toml` dependencies 增加：
   ```toml
   tauri-plugin-sql = "2"
   ```
2. `apps/desktop/package.json` dependencies 增加：
   ```json
   "@tauri-apps/plugin-sql": "^2.0.0"
   ```
3. `capabilities/default.json` permissions数组增加 `"sql:default"`。
4. 运行 `pnpm install` 更新 lock 文件。

**验收标准：**
- `Cargo.toml` 包含 `tauri-plugin-sql`。
- `package.json` 包含 `@tauri-apps/plugin-sql`。
- `capabilities/default.json` 包含 `sql:default`。
- `pnpm install` 成功，无 lock 冲突。

**验证命令：**
```bash
pnpm install
```

---

## Task 5: Desktop SQLite 适配器与初始化

**Files:**
- Create: `apps/desktop/src/localStore/adapter.ts`
- Create: `apps/desktop/src/localStore/index.ts`
- Create: `apps/desktop/src/localStore/init.ts`
- Modify: `apps/desktop/src-tauri/src/lib.rs`
- Test: `apps/desktop/src/localStore/adapter.test.ts`（可选，mock plugin 即可）

**Interfaces:**
- Consumes: `LocalStoreDb`、`migrateLocalStore`。
- Produces:
  ```ts
  export class TauriLocalStoreDb implements LocalStoreDb {
    static async load(path: string): Promise<TauriLocalStoreDb>;
    execute(sql: string, bind?: unknown[]): Promise<void>;
    select<T extends Record<string, unknown>>(sql: string, bind?: unknown[]): Promise<T[]>;
  }

  export async function initLocalStore(): Promise<LocalStoreDb | undefined>;
  export function getLocalStoreDb(): LocalStoreDb | undefined;
  export function setLocalStoreDb(db: LocalStoreDb): void;
  ```

**实现要点：**
1. `adapter.ts` 中 `TauriLocalStoreDb` 使用 `Database.load(path)` 打开 SQLite。
2. `init.ts` 中 `initLocalStore()`：
   - 尝试调用 `TauriLocalStoreDb.load("sqlite:mirax.db")`。
   - 成功后 `migrateLocalStore(db)` 并 `setLocalStoreDb(db)`，返回 db。
   - 失败时 `console.warn` 并返回 `undefined`（fallback localStorage）。
3. `index.ts` 导出 `initLocalStore`、`getLocalStoreDb`、`setLocalStoreDb`、`TauriLocalStoreDb`。
4. `lib.rs` 中 builder 增加 `.plugin(tauri_plugin_sql::init())`。

**验收标准：**
- `initLocalStore()` 在 Tauri 环境能返回已迁移的 `TauriLocalStoreDb`。
- 在 dev:web / 无 Tauri 环境返回 `undefined`，不抛异常。
- `lib.rs` 注册了 `tauri_plugin_sql`。

**验证命令：**
```bash
pnpm --filter @mirax/desktop typecheck
```

---

## Task 6: useAppSettings SQLite 迁移

**Files:**
- Modify: `apps/desktop/src/composables/useAppSettings.ts`
- Test: `apps/desktop/src/composables/useAppSettings.test.ts`

**Interfaces:**
- Consumes: `LocalStoreDb`、`create*Repository`、record 类型、`setLocalStoreDb`/`getLocalStoreDb`。
- Produces: 扩展的 `UseAppSettingsOptions { db?: LocalStoreDb }`；`load`/`persist` 优先使用 DB；`removeProviderConfig` 联动删除 secret。

**实现要点：**
1. 在文件顶部新增：
   ```ts
   import type { LocalStoreDb } from "@mirax/local-store";
   import { createAppSettingsRepository, ... } from "@mirax/local-store";
   ```
2. 新增模块级变量 `let sharedDb: LocalStoreDb | undefined;` 与 `export function setLocalStoreDb(db: LocalStoreDb): void { sharedDb = db; }`。
3. `UseAppSettingsOptions` 增加 `db?: LocalStoreDb`。
4. `useAppSettings` 内部 `const db = options.db ?? sharedDb;`。
5. `load()`：
   - 若 `db` 存在，尝试从 repositories 读取；
   - 任何读取失败时回退 `localStorage`。
   - 若 DB 返回空且 localStorage 有旧 snapshot，先 `restore(snapshot)`，再异步将 metadata 写入 repositories（secret 为空），并清除 localStorage 中该 snapshot。
6. `persist()`：
   - 若 `db` 存在，写入 repositories（provider metadata + secret 分别写入）。
   - 否则保持 localStorage snapshot。
7. `removeProviderConfig(id)`：
   - 调用 repository 删除 provider config；
   - 调用 `providerSecretsRepo.deleteByCredentialRef(id)`。
8. `createSnapshot()` 保持不变，继续过滤 apiKey。

**验收标准：**
- 现有所有 localStorage-only 测试继续通过（不传 `db`）。
- 新增测试：传入 `FakeLocalStoreDb` 时，settings/provider 变更写入对应 repository。
- 新增测试：删除 provider 时调用 `providerSecretsRepo.deleteByCredentialRef(id)`。
- 新增测试：snapshot 仍不包含 apiKey / token / cookie / credential。
- 新增测试：DB 加载失败时回退 localStorage。

**验证命令：**
```bash
pnpm test apps/desktop/src/composables/useAppSettings.test.ts
```

---

## Task 7: AiServicesSettings.vue API Key 编辑改造

**Files:**
- Modify: `apps/desktop/src/components/settings/AiServicesSettings.vue`
- Test: `apps/desktop/src/components/settings/AiServicesSettings.test.ts`

**Interfaces：**
- Consumes: `useAppSettings` 提供的 `updateProviderConfig`、`addProviderConfig`。
- Produces: 编辑 drawer 中 `editingApiKey` ref；保存时保留原 key。

**实现要点：**
1. 在 `startAddProvider` / `startEditProvider` 中初始化 `editingApiKey.value = ""`。
2. API Key input 改为 `v-model="editingApiKey"`。
3. placeholder 改为：「已保存在本机，可留空保留，输入新值则替换」。
4. `saveProvider()` 中：
   ```ts
   const original = providerConfigs.value.find((c) => c.id === editingConfig.value!.id);
   const apiKey = editingApiKey.value.trim() || original?.apiKey || "";
   const configToSave = { ...editingConfig.value, apiKey };
   ```
5. 当 `original` 存在且 `editingApiKey` 为空时，保留原 key；新建 provider 时留空则 key 为空。
6. 编辑表单 input 不显示已保存 key（`type="password"`，value 为空）。

**验收标准：**
- `AiServicesSettings.test.ts` 中原断言「刷新后 API Key 不会保留」更新为新的提示文案。
- 源码仍包含 `apiKeyFieldName`、`autocomplete="new-password"`。
- 源码包含占位文案「已保存在本机，可留空保留，输入新值则替换」。
- 保存逻辑保留原 key 的路径可测试（通过检查 `updateProviderConfig` 被调用时 apiKey 非空）。

**验证命令：**
```bash
pnpm test apps/desktop/src/components/settings/AiServicesSettings.test.ts
```

---

## Task 8: main.ts 启动前初始化 SQLite

**Files:**
- Modify: `apps/desktop/src/main.ts`

**实现要点：**
1. 在文件顶部导入 `initLocalStore`。
2. 将原有同步 mount 改为 async：
   ```ts
   async function bootstrap() {
     const db = await initLocalStore();
     if (db) {
       // useAppSettings 内部通过 getLocalStoreDb 使用默认 db
     }
     const app = createApp(App);
     // ... existing directives/plugins ...
     app.mount("#app");
   }
   bootstrap();
   ```
3. 不阻塞 dev:web：若 `initLocalStore` 返回 `undefined`，直接 mount。

**验收标准：**
- `pnpm --filter @mirax/desktop typecheck` 通过。
- `pnpm --filter @mirax/desktop build:web` 通过（不依赖 Rust 编译）。
- 浏览器启动后，在 Tauri 环境下 `window.localStorage` 不包含新保存的 API Key。

**验证命令：**
```bash
pnpm --filter @mirax/desktop typecheck
pnpm --filter @mirax/desktop build:web
```

---

## Task 9: 全局验证与浏览器验收

**Files：** 所有已修改文件。

**验证命令：**
```bash
pnpm test packages/local-store
pnpm test apps/desktop/src/composables/useAppSettings.test.ts apps/desktop/src/components/settings/AiServicesSettings.test.ts
pnpm --filter @mirax/desktop typecheck
pnpm --filter @mirax/desktop build:web
git diff --check
```

**受保护文件 diff 检查：**
```bash
git diff --name-only | grep -E "(legacy-ui-gap-list\.md|人工提示词\.md|PROJECT-STATE\.md|\.codex/dispatch-state\.json)" && echo "FORBIDDEN FILES CHANGED" || echo "OK"
```

**浏览器验收标准：**
1. 打开桌面应用 / `pnpm --filter @mirax/desktop dev`。
2. 进入设置 → AI 服务，添加硅基流动 Provider，填写 baseUrl / model / apiKey。
3. 保存并点击「测试连接」，显示连接成功。
4. 刷新页面。
5. Provider 仍存在；点击编辑，API Key input 为空，placeholder 显示「已保存在本机，可留空保留，输入新值则替换」。
6. 不重新输入 key，点击「测试连接」仍成功。
7. 在 Workbench 进行 real rewrite，能正常调用该 provider。
8. 检查 localStorage、snapshot、页面日志：不包含 apiKey / `sk-`。

**当前执行状态（2026-07-02）：**
- 全局验证命令已全部通过（见下方 VERIFICATION）。
- Tauri 桌面端可正常启动，SQLite 迁移成功，所有表已创建。
- 浏览器验收第 1-8 步受限于当前环境无法自动化（Tauri webview 无法被 Playwright 直接操作，系统辅助功能权限未开启），需人工在桌面端执行；已准备手动验收清单，见最终报告 BROWSER VERIFICATION。

**完成报告字段：**
- STATUS: DONE / BLOCKED
- CHANGED FILES:
- SUMMARY:
- BROWSER VERIFICATION:
- VERIFICATION:
- BLOCKERS:
- NOTES:

---

## 计划自检

- **Spec 覆盖：**
  - Schema / `provider_secrets`：Task 1
  - `LocalStoreDb` 驱动接口 + Fake DB：Task 2
  - Repository 工厂：Task 3
  - Tauri SQL bridge / plugin / capability：Task 4-5
  - `useAppSettings` DB 迁移 + fallback：Task 6
  - `AiServicesSettings.vue` UI 改造：Task 7
  - `main.ts` 启动前初始化：Task 8
  - 安全（snapshot 过滤）：Task 6 / Task 9
- **无占位符：** 每个 task 包含具体文件、接口、验收标准、验证命令。
- **类型一致性：** `credentialRef` / `credential_ref`、`apiKey` / `api_key` 映射由 repository 负责；内存对象保持 camelCase。
