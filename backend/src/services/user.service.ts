import { inject } from 'inversify';
import { provide } from 'inversify-binding-decorators';
import { UserRepository } from '../repositories/user.repository';
import { CreateUserDTO, UserResponseDTO } from '../dtos/user.dto';
import { AppError } from '../utils/appError.utils';
import { HttpStatusCode } from '../constants/httpStatus.constants';

@provide(UserService)
export class UserService {
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
    return await this.userRepository.create(data);
  }
}
