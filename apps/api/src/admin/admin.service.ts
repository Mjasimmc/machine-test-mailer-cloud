import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { UsersService } from '../users/users.service';
import { EventsGateway } from '../websocket/events.gateway';
import { Role, UserDto, UserStatus } from '@saas/shared';

@Injectable()
export class AdminService {
  constructor(
    private readonly usersService: UsersService,
    private readonly eventsGateway: EventsGateway,
  ) {}

  async listUsers(search?: string): Promise<UserDto[]> {
    const users = await this.usersService.findAll(search);
    return users.map((u) => this.formatUserDto(u));
  }

  async getUserById(id: string): Promise<UserDto> {
    const user = await this.usersService.findById(id);
    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }
    return this.formatUserDto(user);
  }

  async suspendUser(id: string, currentAdminId: string): Promise<UserDto> {
    const user = await this.usersService.findById(id);
    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    if (user.role === Role.ADMIN) {
      throw new BadRequestException('Cannot suspend an administrator account');
    }

    if (user._id.toString() === currentAdminId) {
      throw new BadRequestException('Cannot suspend your own account');
    }

    const updatedUser = await this.usersService.updateStatus(id, UserStatus.SUSPENDED);

    // Emit real-time WebSocket event specifically to target user
    this.eventsGateway.emitUserSuspended(id);

    return this.formatUserDto(updatedUser);
  }

  async unsuspendUser(id: string): Promise<UserDto> {
    const user = await this.usersService.findById(id);
    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    const updatedUser = await this.usersService.updateStatus(id, UserStatus.ACTIVE);
    return this.formatUserDto(updatedUser);
  }

  private formatUserDto(user: any): UserDto {
    return {
      id: user._id ? user._id.toString() : user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      status: user.status,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }
}
