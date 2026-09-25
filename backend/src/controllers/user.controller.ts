import { Controller, Route, Get, Post, Body, Path, Tags, SuccessResponse, Response } from 'tsoa';
import { inject } from 'inversify';
import { provide } from 'inversify-binding-decorators';
import { UserService } from '../services/user.service';
import { CreateUserDTO, UserResponseDTO } from '../dtos/user.dto';

@Tags('Users')
@Route('users')
@provide(UserController)
export class UserController extends Controller {
  constructor(
    @inject(UserService) private userService: UserService
  ) {
    super();
  }

  /**
   * Retrieve all registered users
   */
  @Get('')
  public async getUsers(): Promise<UserResponseDTO[]> {
    return this.userService.getAllUsers();
  }

  /**
   * Retrieve user details by numeric ID
   */
  @Get('{id}')
  @Response(404, 'User not found')
  public async getUserById(@Path() id: number): Promise<UserResponseDTO> {
    return this.userService.getUserById(id);
  }

  /**
   * Create a new user profile
   */
  @SuccessResponse('201', 'Created')
  @Post('')
  public async createUser(@Body() requestBody: CreateUserDTO): Promise<UserResponseDTO> {
    this.setStatus(201);
    return this.userService.createUser(requestBody);
  }
}
