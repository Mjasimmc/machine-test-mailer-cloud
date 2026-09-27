import { Injectable, Logger } from '@nestjs/common';
import { UsersService } from '../users/users.service';
import { DashboardStats, Role, UserStatus } from '@saas/shared';

@Injectable()
export class DashboardService {
  private readonly logger = new Logger(DashboardService.name);

  constructor(private readonly usersService: UsersService) {}

  /**
   * Retrieves aggregated user metrics for the administration dashboard.
   */
  async getAdminStats(): Promise<DashboardStats> {
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

