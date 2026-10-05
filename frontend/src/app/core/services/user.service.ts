import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  UserResponseDTO,
  CreateUserDTO,
  UpdateUserDTO,
  DeleteResponseDTO,
  RoleRecord,
} from '../models/api.models';

/**
 * Admin-only user management API client.
 *
 * Every endpoint except `login` (which lives in `AuthService`) requires an
 * ADMIN bearer token - the backend rejects anything else with 403 before the
 * request reaches a controller. There is intentionally no register() method:
 * accounts are created by an administrator, never self-registered.
 */
@Injectable({
  providedIn: 'root',
})
export class UserService {
  private readonly apiUrl = `${environment.apiUrl}/users`;
  private readonly rolesUrl = `${environment.apiUrl}/roles`;

  constructor(private http: HttpClient) {}

  public getUsers(): Observable<UserResponseDTO[]> {
    return this.http.get<UserResponseDTO[]>(this.apiUrl);
  }

  public getUserById(id: number): Observable<UserResponseDTO> {
    return this.http.get<UserResponseDTO>(`${this.apiUrl}/${id}`);
  }

  public createUser(userData: CreateUserDTO): Observable<UserResponseDTO> {
    return this.http.post<UserResponseDTO>(this.apiUrl, userData);
  }

  public updateUser(id: number, userData: UpdateUserDTO): Observable<UserResponseDTO> {
    return this.http.put<UserResponseDTO>(`${this.apiUrl}/${id}`, userData);
  }

  public deleteUser(id: number): Observable<DeleteResponseDTO> {
    return this.http.delete<DeleteResponseDTO>(`${this.apiUrl}/${id}`);
  }

  /** Role pick-list (`GET /roles`, admin only) for the create/edit forms. */
  public getRoles(): Observable<RoleRecord[]> {
    return this.http.get<RoleRecord[]>(this.rolesUrl);
  }
}
