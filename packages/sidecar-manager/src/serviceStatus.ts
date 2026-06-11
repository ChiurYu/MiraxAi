export type ServiceStatus = "missing" | "stopped" | "starting" | "running" | "error";

export interface ServiceHealth {
  name: string;
  status: ServiceStatus;
  message: string;
}
