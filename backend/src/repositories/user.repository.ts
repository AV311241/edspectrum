import { provide } from 'inversify-binding-decorators';
import { prisma } from '../config/db.config';
import { CreateUserDTO, UserResponseDTO } from '../dtos/user.dto';

@provide(UserRepository)
export class UserRepository {
  /**
   * Select fields for user response - NEVER includes passwordHash
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
  } as const;

  public async findById(id: number): Promise<UserResponseDTO | null> {
    const user = await prisma.user.findUnique({
      where: { id },
      select: UserRepository.USER_SELECT,
    });
    if (!user) return null;
    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      roleId: user.roleId,
      status: user.status,
      schoolId: user.schoolId,
      createdAt: user.createdAt,
    };
  }

  public async findByEmail(email: string): Promise<UserResponseDTO | null> {
    const user = await prisma.user.findUnique({
      where: { email },
      select: UserRepository.USER_SELECT,
    });
    if (!user) return null;
    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      roleId: user.roleId,
      status: user.status,
      schoolId: user.schoolId,
      createdAt: user.createdAt,
    };
  }

  public async findByEmailWithPassword(email: string): Promise<{ passwordHash: string } & UserResponseDTO | null> {
    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        ...UserRepository.USER_SELECT,
        passwordHash: true,
      },
    });
    return user;
  }

  public async findAll(): Promise<UserResponseDTO[]> {
    const users = await prisma.user.findMany({
      select: UserRepository.USER_SELECT,
    });
    return users.map((user) => ({
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      roleId: user.roleId,
      status: user.status,
      schoolId: user.schoolId,
      createdAt: user.createdAt,
    }));
  }

  public async create(data: CreateUserDTO): Promise<UserResponseDTO> {
    const user = await prisma.user.create({
      data: {
        email: data.email,
        firstName: data.firstName,
        lastName: data.lastName,
        passwordHash: data.password, // This will be pre-hashed by service
        roleId: data.roleId,
      },
      select: UserRepository.USER_SELECT,
    });
    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      roleId: user.roleId,
      status: user.status,
      schoolId: user.schoolId,
      createdAt: user.createdAt,
    };
  }
}
