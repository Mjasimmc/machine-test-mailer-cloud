import { Injectable } from '@nestjs/common';
import { UsersService } from '../users/users.service';
import { DashboardStats, Role, UserStatus } from '@saas/shared';

@Injectable()
export class DashboardService {
  constructor(private readonly usersService: UsersService) {}

  async getAdminStats(tenantId?: string): Promise<DashboardStats> {
    const baseFilter = tenantId ? { role: Role.USER, tenantId } : { role: Role.USER };

    // Count user metrics concurrently
    const [totalUsers, activeUsers, suspendedUsers] = await Promise.all([
      this.usersService.count(baseFilter),
      this.usersService.count({ ...baseFilter, status: UserStatus.ACTIVE }),
      this.usersService.count({ ...baseFilter, status: UserStatus.SUSPENDED }),
    ]);

    return {
      totalUsers,
      activeUsers,
      suspendedUsers,
    };
  }
}
