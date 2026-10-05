import { inject } from 'inversify';
import { provide } from 'inversify-binding-decorators';
import { UserRepository } from '../repositories/user.repository';
import { RoleRepository } from '../repositories/role.repository';
import { CreateUserDTO, UpdateUserDTO, UserResponseDTO, RoleResponseDTO, LoginDTO } from '../dtos/user.dto';
import { AppError } from '../utils/appError.utils';
import { HttpStatusCode } from '../constants/httpStatus.constants';
import { Prisma } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { generateToken, getAdminRoleId } from '../middlewares/auth.middleware';

@provide(UserService)
export class UserService {
  private readonly SALT_ROUNDS = 12;

  constructor(
    @inject(UserRepository) private userRepository: UserRepository,
    @inject(RoleRepository) private roleRepository: RoleRepository
  ) {}

  public async getUserById(id: number): Promise<UserResponseDTO> {
    const user = await this.userRepository.findById(id);
    if (!user) {
      throw new AppError(`User with ID '${id}' not found`, HttpStatusCode.NOT_FOUND);
    }
    return user;
  }

  public async getAllUsers(): Promise<UserResponseDTO[]> {
    return this.userRepository.findAll();
  }

  /** Pick-list for the admin create/edit user forms. */
  public async getAllRoles(): Promise<RoleResponseDTO[]> {
    return this.roleRepository.findAll();
  }

  /**
   * Admin-only account creation. There is deliberately no self-registration
   * path anywhere in the API - this is the single place users are born.
   */
  public async createUser(data: CreateUserDTO): Promise<UserResponseDTO> {
    await this.assertRoleExists(data.roleId);
    // Hash password before storing
    const passwordHash = await bcrypt.hash(data.password, this.SALT_ROUNDS);
    try {
      return await this.userRepository.create({ ...data, password: passwordHash });
    } catch (error) {
      this.rethrowKnownPrismaError(error, 'create');
    }
  }

  /**
   * Admin-only partial update of a user's details and/or status.
   *
   * Guard rails:
   *  - an admin can never change their OWN role or status (a self-demote or
   *    self-deactivate is a one-way lockout with no other admin to undo it);
   *  - a role change must reference a role that actually exists.
   */
  public async updateUser(id: number, data: UpdateUserDTO, currentUserId: number): Promise<UserResponseDTO> {
    const existing = await this.userRepository.findById(id);
    if (!existing) {
      throw new AppError(`User with ID '${id}' not found`, HttpStatusCode.NOT_FOUND);
    }

    if (id === currentUserId && (data.roleId !== undefined || data.status !== undefined)) {
      throw new AppError(
        'You cannot change your own role or account status',
        HttpStatusCode.FORBIDDEN
      );
    }

    if (data.roleId !== undefined) {
      await this.assertRoleExists(data.roleId);
    }

    const payload: UpdateUserDTO = { ...data };
    if (data.password !== undefined) {
      payload.password = await bcrypt.hash(data.password, this.SALT_ROUNDS);
    }

    try {
      return await this.userRepository.update(id, payload);
    } catch (error) {
      this.rethrowKnownPrismaError(error, 'update');
    }
  }

  /**
   * Admin-only hard delete of a user account.
   *
   * Guard rails:
   *  - admins cannot delete themselves (immediate loss of access);
   *  - the last ACTIVE administrator can never be deleted;
   *  - accounts still referenced by other tables surface as a 409 instead of
   *    an opaque 500.
   */
  public async deleteUser(id: number, currentUserId: number): Promise<void> {
    if (id === currentUserId) {
      throw new AppError('You cannot delete your own account', HttpStatusCode.FORBIDDEN);
    }

    const existing = await this.userRepository.findById(id);
    if (!existing) {
      throw new AppError(`User with ID '${id}' not found`, HttpStatusCode.NOT_FOUND);
    }

    const adminRoleId = await getAdminRoleId();
    if (
      adminRoleId !== null &&
      existing.roleId === adminRoleId &&
      existing.status === 'ACTIVE'
    ) {
      const activeAdmins = await this.userRepository.countActiveByRoleId(adminRoleId);
      if (activeAdmins <= 1) {
        throw new AppError(
          'Cannot delete the last active administrator',
          HttpStatusCode.CONFLICT
        );
      }
    }

    try {
      await this.userRepository.remove(id);
    } catch (error) {
      this.rethrowKnownPrismaError(error, 'delete');
    }
  }

  public async validatePassword(email: string, plainPassword: string): Promise<({ passwordHash: string } & UserResponseDTO) | null> {
    const user = await this.userRepository.findByEmailWithPassword(email);
    if (!user) return null;
    const valid = await bcrypt.compare(plainPassword, user.passwordHash);
    return valid ? user : null;
  }

  public async login(credentials: LoginDTO): Promise<{ user: UserResponseDTO; token: string }> {
    const user = await this.validatePassword(credentials.email, credentials.password);
    if (!user) {
      throw new AppError('Invalid email or password', HttpStatusCode.UNAUTHORIZED);
    }
    // Deactivated accounts must not receive a token even with correct credentials.
    if (user.status !== 'ACTIVE') {
      throw new AppError('Account is deactivated. Contact an administrator.', HttpStatusCode.FORBIDDEN);
    }
    const token = generateToken({
      id: user.id,
      email: user.email,
      roleId: user.roleId,
      schoolId: user.schoolId,
      status: user.status,
    });
    // Audit field only - a failure here must never block the sign-in itself.
    await this.userRepository.updateLastLogin(user.id).catch(() => undefined);
    // Never expose the bcrypt hash - strip it before returning to the controller.
    const { passwordHash: _passwordHash, ...safeUser } = user;
    return { user: safeUser, token };
  }

  private async assertRoleExists(roleId: number): Promise<void> {
    const roles = await this.roleRepository.findAll();
    if (!roles.some((role) => role.id === roleId)) {
      throw new AppError(`Role with ID '${roleId}' does not exist`, HttpStatusCode.BAD_REQUEST);
    }
  }

  /** Map Prisma referential/unique errors onto meaningful HTTP statuses. */
  private rethrowKnownPrismaError(error: unknown, action: 'create' | 'update' | 'delete'): never {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2003') {
        throw new AppError(
          `Cannot ${action} user: the account is still referenced by other records`,
          HttpStatusCode.CONFLICT
        );
      }
      if (error.code === 'P2002') {
        throw new AppError('A user with this email already exists', HttpStatusCode.CONFLICT);
      }
      if (error.code === 'P2025') {
        throw new AppError('User not found', HttpStatusCode.NOT_FOUND);
      }
    }
    throw error;
  }
}
