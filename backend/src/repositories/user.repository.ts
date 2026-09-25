import { provide } from 'inversify-binding-decorators';
import { prisma } from '../config/db.config';
import { CreateUserDTO, UserResponseDTO } from '../dtos/user.dto';

@provide(UserRepository)
export class UserRepository {
  public async findById(id: number): Promise<UserResponseDTO | null> {
    const user = await prisma.user.findUnique({
      where: { id },
    });
    if (!user) return null;
    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      roleId: user.roleId,
      status: user.status,
      createdAt: user.createdAt,
    };
  }

  public async findAll(): Promise<UserResponseDTO[]> {
    const users = await prisma.user.findMany();
    return users.map((user) => ({
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      roleId: user.roleId,
      status: user.status,
      createdAt: user.createdAt,
    }));
  }

  public async create(data: CreateUserDTO): Promise<UserResponseDTO> {
    const user = await prisma.user.create({
      data: {
        email: data.email,
        firstName: data.firstName,
        lastName: data.lastName,
        passwordHash: data.passwordHash,
        roleId: data.roleId,
      },
    });
    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      roleId: user.roleId,
      status: user.status,
      createdAt: user.createdAt,
    };
  }
}
