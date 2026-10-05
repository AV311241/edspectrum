import { Controller, Route, Get, Tags, Response } from 'tsoa';
import { inject } from 'inversify';
import { provide } from 'inversify-binding-decorators';
import { UserService } from '../services/user.service';
import { RoleResponseDTO } from '../dtos/user.dto';

/**
 * Read-only role pick-list for the admin user management forms.
 *
 * Mounted behind `requireAdmin` alongside `/users` in `src/index.ts`.
 */
@Tags('Roles')
@Route('roles')
@provide(RoleController)
export class RoleController extends Controller {
  constructor(
    @inject(UserService) private userService: UserService
  ) {
    super();
  }

  /**
   * Retrieve all assignable roles (admin only)
   */
  @Response(403, 'Administrator access required')
  @Get('')
  public async getRoles(): Promise<RoleResponseDTO[]> {
    return this.userService.getAllRoles();
  }
}