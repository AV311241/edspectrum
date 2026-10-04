import { inject } from 'inversify';
import { provide } from 'inversify-binding-decorators';
import { UserRepository } from '../repositories/user.repository';
import { CreateUserDTO, UserResponseDTO, LoginDTO } from '../dtos/user.dto';
import { AppError } from '../utils/appError.utils';
import { HttpStatusCode } from '../constants/httpStatus.constants';
import bcrypt from 'bcryptjs';
import { generateToken } from '../middlewares/auth.middleware';

@provide(UserService)
export class UserService {
  private readonly SALT_ROUNDS = 12;

  constructor(
    @inject(UserRepository) private userRepository: UserRepository
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

  public async createUser(data: CreateUserDTO): Promise<UserResponseDTO> {
    // Hash password before storing
    const passwordHash = await bcrypt.hash(data.password, this.SALT_ROUNDS);
    return await this.userRepository.create({ ...data, password: passwordHash });
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
    const token = generateToken({
      id: user.id,
      email: user.email,
      roleId: user.roleId,
      schoolId: user.schoolId,
      status: user.status,
    });
    // Never expose the bcrypt hash - strip it before returning to the controller.
    const { passwordHash: _passwordHash, ...safeUser } = user;
    return { user: safeUser, token };
  }
}
