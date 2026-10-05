import {
  Controller,
  Route,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Path,
  Request,
  Tags,
  SuccessResponse,
  Response,
} from 'tsoa';
import { Request as ExpressRequest } from 'express';
import { inject } from 'inversify';
import { provide } from 'inversify-binding-decorators';
import { UserService } from '../services/user.service';
import {
  CreateUserDTO,
  UpdateUserDTO,
  UserResponseDTO,
  DeleteResponseDTO,
  createUserSchema,
  updateUserSchema,
} from '../dtos/user.dto';
import { AuthenticatedRequest } from '../middlewares/auth.middleware';
import { AppError } from '../utils/appError.utils';
import { HttpStatusCode } from '../constants/httpStatus.constants';

/**
 * Admin-only user management.
 *
 * Every route in here is additionally gated by the `requireAdmin` middleware
 * mounted in `src/index.ts`, so a non-admin token never reaches these
 * handlers (403 is produced before the controller runs). The controller still
 * reads the caller identity from the request for the self-management guards.
 */
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
   * Retrieve all registered users (admin only)
   */
  @Response(403, 'Administrator access required')
  @Get('')
  public async getUsers(): Promise<UserResponseDTO[]> {
    return this.userService.getAllUsers();
  }

  /**
   * Retrieve user details by numeric ID (admin only)
   */
  @Get('{id}')
  @Response(403, 'Administrator access required')
  @Response(404, 'User not found')
  public async getUserById(@Path() id: number): Promise<UserResponseDTO> {
    return this.userService.getUserById(id);
  }

  /**
   * Create a new user account. This is the ONLY way accounts are created -
   * there is deliberately no self-registration endpoint.
   */
  @SuccessResponse('201', 'Created')
  @Response(400, 'Validation failed')
  @Response(403, 'Administrator access required')
  @Response(409, 'Email already in use')
  @Post('')
  public async createUser(@Body() requestBody: CreateUserDTO): Promise<UserResponseDTO> {
    this.setStatus(201);
    const validated = createUserSchema.parse(requestBody);
    return this.userService.createUser(validated);
  }

  /**
   * Update a user's details and/or account status (admin only)
   */
  @Response(400, 'Validation failed')
  @Response(403, 'Administrator access required / self-management blocked')
  @Response(404, 'User not found')
  @Put('{id}')
  public async updateUser(
    @Path() id: number,
    @Body() requestBody: UpdateUserDTO,
    @Request() request: ExpressRequest
  ): Promise<UserResponseDTO> {
    const currentUserId = this.currentUserId(request);
    const validated = updateUserSchema.parse(requestBody);
    return this.userService.updateUser(id, validated, currentUserId);
  }

  /**
   * Permanently delete a user account (admin only)
   */
  @Response(403, 'Administrator access required / self-delete blocked')
  @Response(404, 'User not found')
  @Response(409, 'Last administrator or referenced record')
  @Delete('{id}')
  public async deleteUser(
    @Path() id: number,
    @Request() request: ExpressRequest
  ): Promise<DeleteResponseDTO> {
    const currentUserId = this.currentUserId(request);
    await this.userService.deleteUser(id, currentUserId);
    return { success: true, message: `User ${id} deleted` };
  }

  /** The authenticated caller, asserted present by the auth gate. */
  private currentUserId(request: ExpressRequest): number {
    const user = (request as AuthenticatedRequest).user;
    if (!user) {
      // Unreachable behind the global auth gate, but keeps the contract total.
      throw new AppError('Authentication required', HttpStatusCode.UNAUTHORIZED);
    }
    return user.id;
  }
}
