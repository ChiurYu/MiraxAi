export type ServiceStatus = "missing" | "stopped" | "starting" | "running" | "error";

export interface ServiceHealth {
  name: string;
  status: ServiceStatus;
  message: string;
}

/**
 * sidecar 依赖的运行时接口。
 *
 * 边界说明：
 * - `start` / `stop` 由真实能力接入阶段实现；本 Task 只设计接口，不启动真实服务。
 * - 实现类负责通过 `credentialRef` 或安全方式获取凭证，禁止把本地路径、URL 中的 token 或 API Key 写入日志。
 */
export interface DependencyRuntime {
  start(): Promise<ServiceHealth>;
  stop(): Promise<ServiceHealth>;
  health(): Promise<ServiceHealth>;
}
