import type { NotificationList } from "@/lib/types";
import { gatewayRequest } from "./gateway";

// REST client for the Notification Service, reached through the API Gateway
// (/api/notifications/*).

const request = <T>(method: string, path: string) => gatewayRequest<T>(method, path, { serviceName: "notification service" });

export const listMine = () => request<NotificationList>("GET", "/api/notifications/mine");

/** Marks every notification of the signed-in user as read. */
export const markAllRead = () => request<void>("POST", "/api/notifications/mine/read");
