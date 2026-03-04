import AuditLog, { AuditAction } from '@/models/AuditLog';
import { Types } from 'mongoose';

interface LogOptions {
  userId?: string | Types.ObjectId;
  action: AuditAction;
  resourceType: string;
  resourceId?: string | Types.ObjectId;
  description: string;
  metadata?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
}

/**
 * Registra una acción en el log de auditoría
 */
export async function logAction(options: LogOptions): Promise<void> {
  try {
    await AuditLog.create({
      userId: options.userId ? new Types.ObjectId(options.userId.toString()) : undefined,
      action: options.action,
      resourceType: options.resourceType,
      resourceId: options.resourceId ? new Types.ObjectId(options.resourceId.toString()) : undefined,
      description: options.description,
      metadata: options.metadata,
      ipAddress: options.ipAddress,
      userAgent: options.userAgent,
    });
  } catch (error) {
    // No lanzar error si falla el logging para no interrumpir el flujo principal
    console.error('Error logging audit action:', error);
  }
}

/**
 * Obtiene el IP address y User Agent de una request de Next.js
 */
export function getRequestInfo(request: Request): { ipAddress?: string; userAgent?: string } {
  const headers = request.headers;
  const ipAddress =
    headers.get('x-forwarded-for')?.split(',')[0] ||
    headers.get('x-real-ip') ||
    undefined;
  const userAgent = headers.get('user-agent') || undefined;

  return { ipAddress, userAgent };
}

export { AuditAction };
export default logAction;
