import { provide } from 'inversify-binding-decorators';
import { prisma } from '../config/db.config';
import { RoleResponseDTO } from '../dtos/user.dto';

/**
 * Read-only access to the `roles` table.
 *
 * Roles are reference data - they are only ever created by the startup seed
 * or a DBA, never through the API - so this repository deliberately exposes
 * no write methods.
 */
@provide(RoleRepository)
export class RoleRepository {
  public async findAll(): Promise<RoleResponseDTO[]> {
    return prisma.role.findMany({
      select: { id: true, code: true, name: true, description: true },
      orderBy: { id: 'asc' },
    });
  }

  public async findByCode(code: string): Promise<RoleResponseDTO | null> {
    return prisma.role.findUnique({
      where: { code },
      select: { id: true, code: true, name: true, description: true },
    });
  }
}