import { provide } from 'inversify-binding-decorators';
import { prisma } from '../config/db.config';
import { CreateUserDTO, UpdateUserDTO, UserResponseDTO } from '../dtos/user.dto';

type UserRow = {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  roleId: number;
  status: UserResponseDTO['status'];
  createdAt: Date;
  schoolId: number | null;
  role: { code: string };
};

const toDTO = (user: UserRow): UserResponseDTO => ({
  id: user.id,
  email: user.email,
  firstName: user.firstName,
  lastName: user.lastName,
  roleId: user.roleId,
  roleCode: user.role.code,
  status: user.status,
  schoolId: user.schoolId,
  createdAt: user.createdAt,
});

@provide(UserRepository)
export class UserRepository {
  /**
   * Select fields for user response - NEVER includes passwordHash.
   * The `role` relation is always joined so every response can carry the
   * stable `roleCode` (used for admin checks without hardcoding role ids).
   */
  private static readonly USER_SELECT = {
    id: true,
    email: true,
    firstName: true,
    lastName: true,
    roleId: true,
    status: true,
    createdAt: true,
    schoolId: true,
    role: { select: { code: true } },
  } as const;

  public async findById(id: number): Promise<UserResponseDTO | null> {
    const user = await prisma.user.findUnique({
      where: { id },
      select: UserRepository.USER_SELECT,
    });
    return user ? toDTO(user) : null;
  }

  public async findByEmail(email: string): Promise<UserResponseDTO | null> {
    const user = await prisma.user.findUnique({
      where: { email },
      select: UserRepository.USER_SELECT,
    });
    return user ? toDTO(user) : null;
  }

  public async findByEmailWithPassword(
    email: string
  ): Promise<{ passwordHash: string } & UserResponseDTO | null> {
    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        ...UserRepository.USER_SELECT,
        passwordHash: true,
      },
    });
    if (!user) return null;
    const { passwordHash, ...rest } = user;
    return { passwordHash, ...toDTO(rest) };
  }

  public async findAll(): Promise<UserResponseDTO[]> {
    const users = await prisma.user.findMany({
      select: UserRepository.USER_SELECT,
      orderBy: { createdAt: 'desc' },
    });
    return users.map(toDTO);
  }

  public async create(data: CreateUserDTO): Promise<UserResponseDTO> {
    const user = await prisma.user.create({
      data: {
        email: data.email,
        firstName: data.firstName,
        lastName: data.lastName,
        passwordHash: data.password, // This will be pre-hashed by service
        roleId: data.roleId,
        schoolId: data.schoolId ?? null,
        status: data.status ?? undefined,
      },
      select: UserRepository.USER_SELECT,
    });
    return toDTO(user);
  }

  /**
   * Apply a partial update. `undefined` keys are left untouched by Prisma, so
   * the caller only passes the fields the admin actually edited.
   */
  public async update(id: number, data: UpdateUserDTO): Promise<UserResponseDTO> {
    const user = await prisma.user.update({
      where: { id },
      data: {
        email: data.email,
        firstName: data.firstName,
        lastName: data.lastName,
        ...(data.password !== undefined ? { passwordHash: data.password } : {}),
        roleId: data.roleId,
        schoolId: data.schoolId,
        status: data.status,
      },
      select: UserRepository.USER_SELECT,
    });
    return toDTO(user);
  }

  public async remove(id: number): Promise<void> {
    await prisma.user.delete({ where: { id } });
  }

  /** Record a successful login for the "last seen" audit field. */
  public async updateLastLogin(id: number): Promise<void> {
    await prisma.user.update({
      where: { id },
      data: { lastLoginAt: new Date() },
    });
  }

  /** How many ACTIVE users hold the given role (used for last-admin guards). */
  public async countActiveByRoleId(roleId: number): Promise<number> {
    return prisma.user.count({ where: { roleId, status: 'ACTIVE' } });
  }
}
