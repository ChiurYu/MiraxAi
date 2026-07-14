# 发布任务与历史 SQLite 优先迁移设计

## 目标

将 `publishTaskStore.ts` 与 `taskHistory.ts` 管理的发布任务和发布历史从 localStorage 优先迁移到 SQLite 优先，保持 localStorage fallback，不接入真实平台发布能力。

## 范围

- 复用已有 `publish_tasks` 表存储单个平台发布任务。
- 新增 `task_history` 表存储发布历史聚合项。
- 不修改账号系统、不接入真实平台 API、不伪造发布成功。
- 允许修改文件：
  - `packages/local-store/src/schema.ts`
  - `packages/local-store/src/repositories.ts`
  - `packages/local-store/tests/*`
  - `apps/desktop/src/features/task-center/*`
  - `apps/desktop/src/composables/usePublishPreparation.ts`
  - `apps/desktop/src/localStore/init.ts`
  - 相关测试文件

## 方案

采用 **store 函数内部分支 + 共享 db 注入** 方案，与 Workbench 草稿迁移模式保持一致。

### 1. 表结构

`publish_tasks` 表已存在，字段与 `PublishTask` 对齐，直接复用。

在 `packages/local-store/src/schema.ts` 新增 `task_history` 表：

```sql
CREATE TABLE IF NOT EXISTS task_history (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  title TEXT NOT NULL,
  task_ids_json TEXT NOT NULL,
  video_path TEXT NOT NULL,
  platforms_json TEXT NOT NULL,
  status TEXT NOT NULL,
  created_at TEXT NOT NULL
);
```

### 2. Repository

复用已有的 `PublishTaskRepository` / `createPublishTaskRepository`。

在 `packages/local-store/src/repositories.ts` 新增：

```typescript
export interface TaskHistoryRecord {
  id: string;
  projectId: string;
  title: string;
  taskIdsJson: string;
  videoPath: string;
  platformsJson: string;
  status: string;
  createdAt: string;
}

export interface TaskHistoryRepository {
  list(): Promise<TaskHistoryRecord[]>;
  save(record: TaskHistoryRecord): Promise<void>;
  deleteById(id: string): Promise<void>;
}

export function createTaskHistoryRepository(db: LocalStoreDb): TaskHistoryRepository;
```

### 3. publishTaskStore 改造

在 `apps/desktop/src/features/task-center/publishTaskStore.ts` 中：

- 新增模块级 `sharedDb` 与 `setPublishTaskStoreDb(db)`。
- `loadPublishTasks()`：优先从 SQLite 读取全部任务并反序列化；失败或无 db 时回退 localStorage。
- `savePublishTasks(tasks)`：优先写入 SQLite（逐条 `INSERT OR REPLACE`）；失败时 `console.warn` 并回退 localStorage。
- `appendPublishTask` / `appendPublishTasks` 基于上述读写实现，行为不变。
- 继续复用 `sanitizePublishTaskForStorage` 剔除凭证字段。

### 4. taskHistory 改造

在 `apps/desktop/src/features/task-center/taskHistory.ts` 中：

- 新增模块级 `sharedDb` 与 `setTaskHistoryDb(db)`。
- `loadTaskHistory()`：优先从 SQLite 读取全部历史项并反序列化；失败或无 db 时回退 localStorage。
- `saveTaskHistory(items)`：优先写入 SQLite（逐条 `INSERT OR REPLACE`）；失败时 `console.warn` 并回退 localStorage。
- `appendPublishHistoryItem` 基于上述读写实现，行为不变。
- `createPublishHistoryItem` 不改，submitted 任务仍生成 submitted 状态的历史项。

### 5. db 注入

`apps/desktop/src/localStore/init.ts` 在 `initLocalStore()` 成功后调用：

```typescript
setPublishTaskStoreDb(db);
setTaskHistoryDb(db);
```

### 6. 兼容与迁移

- 不主动迁移历史 localStorage 数据。
- SQLite 为空且 localStorage 有数据时，读取 localStorage 作为 fallback。
- 浏览器 dev:web 环境无 Tauri SQL，自动回退 localStorage。

## 测试覆盖

### packages/local-store

- `createTaskHistoryRepository`：
  - `save` 生成正确 SQL 与 bind。
  - `list` 映射 camelCase 字段。
  - `deleteById` 生成正确 SQL 与 bind。

### apps/desktop

- `publishTaskStore`：
  - SQLite 可用时优先从 SQLite 读取/写入。
  - SQLite 不可用时回退 localStorage。
  - payload 不包含 credential/token/password/apiKey/secret。
  - 保存失败/重试字段保持原值。
- `taskHistory`：
  - SQLite 可用时优先从 SQLite 读取/写入。
  - SQLite 不可用时回退 localStorage。
  - submitted 状态保持 submitted，不会被写成 success。

## 验证命令

- `pnpm test packages/local-store/tests/repositories.test.ts`
- `pnpm test apps/desktop/src/features/task-center/publishTaskStore.test.ts apps/desktop/src/features/task-center/taskHistory.test.ts`
- `pnpm --filter @mirax/desktop typecheck`
- `pnpm --filter @mirax/desktop build:web`
- `git diff --check`

## 风险

- `publish_tasks` 表已存在，无 schema 冲突。
- `task_history` 与 `publish_tasks` 职责分离，前者为聚合视图，后者为单平台任务。
- 浏览器环境无 Tauri SQL，已有 fallback 路径保证可用性。
