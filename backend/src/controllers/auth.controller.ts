import { Controller, Route, Post, Body, Tags, SuccessResponse, Response } from 'tsoa';
import { inject } from 'inversify';
import { provide } from 'inversify-binding-decorators';
import { UserService } from '../services/user.service';
import { LoginDTO, UserResponseDTO, loginSchema } from '../dtos/user.dto';

@Tags('Auth')
@Route('auth')
@provide(AuthController)
export class AuthController extends Controller {
  constructor(
    @inject(UserService) private userService: UserService
  ) {
    super();
  }

  /**
   * User login - returns JWT token
   */
  @SuccessResponse('200', 'Login successful')
  @Response(401, 'Invalid credentials')
  @Post('login')
  public async login(@Body() requestBody: LoginDTO): Promise<{ user: UserResponseDTO; token: string }> {
    const validated = loginSchema.parse(requestBody);
    return await this.userService.login(validated as LoginDTO);
  }
}