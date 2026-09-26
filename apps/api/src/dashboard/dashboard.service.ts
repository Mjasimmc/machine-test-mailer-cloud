import { Injectable } from '@nestjs/common';
import { UsersService } from '../users/users.service';
import { DashboardStats, Role, UserStatus } from '@saas/shared';

@Injectable()
export class DashboardService {
  constructor(private readonly usersService: UsersService) {}

  async getAdminStats(): Promise<DashboardStats> {
    // Only count regular users in SaaS total, or total users
    const [totalUsers, activeUsers, suspendedUsers] = await Promise.all([
      this.usersService.count({ role: Role.USER }),
      this.usersService.count({ role: Role.USER, status: UserStatus.ACTIVE }),
      this.usersService.count({ role: Role.USER, status: UserStatus.SUSPENDED }),
    ]);

    return {
      totalUsers,
      activeUsers,
      suspendedUsers,
    };
  }
}
