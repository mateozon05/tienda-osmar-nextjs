import { prisma } from "@/lib/prisma";

export type AuditAction =
  | "LOGIN"
  | "LOGOUT"
  | "REGISTER"
  | "USER_APPROVED"
  | "USER_REJECTED"
  | "USER_PRICE_LIST_CHANGED"
  | "ORDER_CREATED"
  | "ORDER_STATUS_CHANGED"
  | "PRICE_LIST_CREATED"
  | "PRICE_LIST_UPDATED";

interface AuditParams {
  action: AuditAction;
  entity: string;
  entityId?: number;
  userId?: number;
  userName?: string;
  details?: object;
  ip?: string;
  userAgent?: string;
}

export async function audit(params: AuditParams): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        action:    params.action,
        entity:    params.entity,
        entityId:  params.entityId ?? null,
        userId:    params.userId   ?? null,
        userName:  params.userName ?? null,
        details:   params.details  ?? {},
        ip:        params.ip       ?? null,
        userAgent: params.userAgent ?? null,
      },
    });
  } catch (err) {
    // Never break the main flow
    console.error("[audit] failed:", err);
  }
}
