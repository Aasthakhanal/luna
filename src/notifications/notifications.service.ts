import { Injectable } from '@nestjs/common';
import { CreateNotificationDto } from './dto/create-notification.dto';
import { UpdateNotificationDto } from './dto/update-notification.dto';
import * as firebase from 'firebase-admin';
import { sendNotificationDTO } from './dto/send-notification.dto';
import { PrismaService } from 'src/prisma/prisma.service';
import { FindAllNotificationsDto } from './dto/find-all-notification.dto';
import {
  Prisma,
  User,
  Cycle,
  IrregularityType,
  PhaseType,
} from '@prisma/client';

@Injectable()
export class NotificationsService {
  constructor(private readonly prisma: PrismaService) {}
  async sendPush(notification: sendNotificationDTO) {
    try {
      await firebase.messaging().send({
        notification: {
          title: notification.title,
          body: notification.body,
        },
        token: notification.device_id,
        android: {
          priority: 'high',
          notification: {
            sound: 'default',
            channelId: 'default',
          },
        },
        apns: {
          headers: {
            'apns-priority': '10',
          },
          payload: {
            aps: {
              contentAvailable: true,
              sound: 'default',
            },
          },
        },
      });
      await this.create(notification);

      return { success: true, message: 'Notification sent and saved.' };
    } catch {
      return { success: false, message: 'Failed to send notification' };
    }
  }

  async create(createNotificationDto: CreateNotificationDto) {
    const notification = await this.prisma.notification.create({
      data: {
        title: createNotificationDto.title,
        body: createNotificationDto.body,
        device_id: createNotificationDto.device_id,
        user_id: Number(createNotificationDto.user_id),
      },
    });
    return notification;
  }

  async findAll(query: FindAllNotificationsDto) {
    const { page = 1, limit = 10, search, user_id } = query;
    const skip = (page - 1) * limit;

    const where: Prisma.NotificationWhereInput = {
      ...(search && {
        OR: [
          { title: { contains: search, mode: Prisma.QueryMode.insensitive } },
          { body: { contains: search, mode: Prisma.QueryMode.insensitive } },
        ],
      }),
      ...(user_id && { user_id }),
    };

    const [notifications, total] = await Promise.all([
      this.prisma.notification.findMany({
        where,
        skip,
        take: +limit,
        orderBy: { id: 'desc' },
      }),
      this.prisma.notification.count({ where }),
    ]);

    return {
      data: notifications,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  findOne(id: number) {
    return this.prisma.notification.findUnique({
      where: { id },
      include: { user: true },
    });
  }

  async update(id: number, updateNotificationDto: UpdateNotificationDto) {
    const { user_id, ...updateData } = updateNotificationDto;

    return this.prisma.notification.update({
      where: { id },
      data: {
        ...updateData,
        ...(user_id && { user_id: Number(user_id) }),
      },
    });
  }

  async remove(id: number) {
    return this.prisma.notification.delete({
      where: { id },
    });
  }

  async markAllAsRead(userId: number) {
    const result = await this.prisma.notification.updateMany({
      where: {
        user_id: userId,
        read: false,
      },
      data: {
        read: true,
      },
    });

    return {
      success: true,
      message: `Marked ${result.count} notifications as read`,
      count: result.count,
    };
  }

  // Helper method to check if a similar notification was already sent recently
  private async hasRecentNotification(
    userId: number,
    notificationType: 'period_approaching' | 'irregularity' | 'phase',
    minutesThreshold: number = 1,
  ): Promise<boolean> {
    const thresholdDate = new Date();
    thresholdDate.setMinutes(thresholdDate.getMinutes() - minutesThreshold);

    let titlePattern: string;
    if (notificationType === 'period_approaching') {
      titlePattern = '📅 Period Approaching';
    } else if (notificationType === 'irregularity') {
      titlePattern = '⚠️ Cycle Irregularity Detected';
    } else {
      titlePattern = '🌸 Current Cycle Phase';
    }

    const existingNotification = await this.prisma.notification.findFirst({
      where: {
        user_id: userId,
        title: titlePattern,
        created_at: {
          gte: thresholdDate,
        },
      },
      orderBy: {
        created_at: 'desc',
      },
    });

    return !!existingNotification;
  }

  private async hasRecentIrregularityNotification(
    userId: number,
    irregularityType: IrregularityType,
    minutesThreshold: number = 1,
  ): Promise<boolean> {
    const thresholdDate = new Date();
    thresholdDate.setMinutes(thresholdDate.getMinutes() - minutesThreshold);

    const bodyPattern = this.getIrregularityMessage(irregularityType, '%');
    const patternWithoutName = bodyPattern.replace('Hi %, ', '').split('.')[0];

    const existingNotification = await this.prisma.notification.findFirst({
      where: {
        user_id: userId,
        title: '⚠️ Cycle Irregularity Detected',
        body: {
          contains: patternWithoutName,
        },
        created_at: {
          gte: thresholdDate,
        },
      },
      orderBy: {
        created_at: 'desc',
      },
    });

    return !!existingNotification;
  }

  private async sendIrregularityNotification(
    user: User,
    irregularityType: IrregularityType,
  ): Promise<{ success: boolean; message: string }> {
    const hasRecent = await this.hasRecentIrregularityNotification(
      user.id,
      irregularityType,
      1,
    );

    if (hasRecent) {
      return {
        success: false,
        message: 'Similar notification already sent within 1 minute',
      };
    }

    const notification = {
      title: '⚠️ Cycle Irregularity Detected',
      body: this.getIrregularityMessage(irregularityType, user.name),
      device_id: user.fcm_token as string,
      user_id: user.id.toString(),
    };

    return await this.sendPush(notification);
  }

  private async checkPeriodApproachingAndNotify(
    user: User,
    latestCycle: Cycle,
    today: Date,
  ): Promise<{
    type: 'period_approaching';
    title: string;
    body: string;
    sent: boolean;
  } | null> {
    const currentCycleStart = new Date(latestCycle.start_date);
    const avgCycleLength = user.avg_cycle_length || 28;

    const nextPeriodDate = new Date(currentCycleStart);
    nextPeriodDate.setDate(currentCycleStart.getDate() + avgCycleLength);

    const daysUntilPeriod = Math.floor(
      (nextPeriodDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24),
    );

    if (daysUntilPeriod > 0 && daysUntilPeriod < 10) {
      const hasRecent = await this.hasRecentNotification(
        user.id,
        'period_approaching',
        1,
      );

      if (hasRecent) {
        return {
          type: 'period_approaching',
          title: '📅 Period Approaching',
          body: `Hi ${user.name}, your next period is expected in ${daysUntilPeriod} days. Get prepared and track your symptoms!`,
          sent: false,
        };
      }

      const notification = {
        title: '📅 Period Approaching',
        body: `Hi ${user.name}, your next period is expected in ${daysUntilPeriod} days. Get prepared and track your symptoms!`,
        device_id: user.fcm_token as string,
        user_id: user.id.toString(),
      };

      const result = await this.sendPush(notification);
      return {
        type: 'period_approaching',
        title: notification.title,
        body: notification.body,
        sent: result.success,
      };
    }

    return null;
  }

  private async checkCurrentPhaseAndNotify(
    user: User,
    latestCycle: Cycle,
    today: Date,
  ): Promise<{
    type: 'phase';
    title: string;
    body: string;
    sent: boolean;
  } | null> {
    const currentPhase = await this.prisma.phase.findFirst({
      where: {
        cycle_id: latestCycle.id,
        start_date: { lte: today },
        end_date: { gte: today },
      },
    });

    if (!currentPhase) {
      return null;
    }

    const hasRecent = await this.hasRecentNotification(user.id, 'phase', 1);

    if (hasRecent) {
      return {
        type: 'phase',
        title: '🌸 Current Cycle Phase',
        body: this.getPhaseMessage(currentPhase.type, user.name),
        sent: false,
      };
    }

    const notification = {
      title: '🌸 Current Cycle Phase',
      body: this.getPhaseMessage(currentPhase.type, user.name),
      device_id: user.fcm_token as string,
      user_id: user.id.toString(),
    };

    const result = await this.sendPush(notification);
    return {
      type: 'phase',
      title: notification.title,
      body: notification.body,
      sent: result.success,
    };
  }

  async checkUserDailyStatus(userId: number): Promise<{
    success: boolean;
    message: string;
    notifications: Array<{
      type: 'period_approaching' | 'irregularity' | 'phase';
      title: string;
      body: string;
      sent: boolean;
    }>;
  }> {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // Get user with their latest cycle and irregularities
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        include: {
          cycle: {
            orderBy: { start_date: 'desc' },
            take: 1,
          },
          irregularity: {
            where: {
              created_at: {
                gte: new Date(today.getTime() - 24 * 60 * 60 * 1000),
              },
            },
          },
        },
      });

      if (!user || !user.fcm_token) {
        return {
          success: false,
          message: 'User not found or no FCM token',
          notifications: [],
        };
      }

      const notifications: Array<{
        type: 'period_approaching' | 'irregularity' | 'phase';
        title: string;
        body: string;
        sent: boolean;
      }> = [];

      // 1. Check current cycle phase
      if (user.cycle.length > 0) {
        const latestCycle = user.cycle[0];
        const phaseNotification = await this.checkCurrentPhaseAndNotify(
          user,
          latestCycle,
          today,
        );
        if (phaseNotification && phaseNotification.sent) {
          notifications.push(phaseNotification);
        }
      }

      // 2. Check if next period is less than 60 days away
      if (user.cycle.length > 0) {
        const latestCycle = user.cycle[0];
        const periodApproachingNotification =
          await this.checkPeriodApproachingAndNotify(user, latestCycle, today);
        if (
          periodApproachingNotification &&
          periodApproachingNotification.sent
        ) {
          notifications.push(periodApproachingNotification);
        }
      }

      // 3. Check for any recent irregularities
      if (user.irregularity.length > 0) {
        for (const irregularity of user.irregularity) {
          const irregularityNotification =
            await this.sendIrregularityNotification(
              user,
              irregularity.irregularity_type,
            );
          if (irregularityNotification.success) {
            notifications.push({
              type: 'irregularity',
              title: '⚠️ Cycle Irregularity Detected',
              body: this.getIrregularityMessage(
                irregularity.irregularity_type,
                user.name,
              ),
              sent: true,
            });
          }
        }
      }

      const message = `Daily check completed for user ${user.name}. ${notifications.length} notifications processed.`;

      return {
        success: true,
        message,
        notifications,
      };
    } catch {
      return {
        success: false,
        message: 'Error occurred during user daily check',
        notifications: [],
      };
    }
  }

  // Helper method to get irregularity message
  private getIrregularityMessage(
    irregularityType: IrregularityType,
    userName: string,
  ): string {
    const messages = {
      short_cycle: `Hi ${userName}, you have a short cycle detected. Your cycle is shorter than usual.`,
      long_cycle: `Hi ${userName}, you have a long cycle detected. Your cycle is longer than usual.`,
      missed_period: `Hi ${userName}, you have a missed period detected. Consider consulting a healthcare provider.`,
      heavy_flow: `Hi ${userName}, heavy flow detected. Monitor your symptoms and stay hydrated.`,
      light_flow: `Hi ${userName}, light flow detected. This variation is noted in your cycle tracking.`,
      other: `Hi ${userName}, an irregularity has been detected in your cycle. Please review your cycle data.`,
    };

    return messages[irregularityType] || messages.other;
  }

  // Helper method to get phase message
  private getPhaseMessage(phaseType: PhaseType, userName: string): string {
    const messages = {
      menstruation: `Hi ${userName}, you are currently in your menstruation phase. Take care of yourself and rest well. 🩸`,
      follicular: `Hi ${userName}, you are in your follicular phase. Your body is preparing for ovulation. 🌱`,
      ovulation: `Hi ${userName}, you are in your ovulation phase. This is your most fertile time! 🌸`,
      luteal: `Hi ${userName}, you are in your luteal phase. Your body is preparing for the next cycle. 🌙`,
    };

    return (
      messages[phaseType] ||
      `Hi ${userName}, tracking your current cycle phase.`
    );
  }

  // Public method to check all notification conditions for a user (called after cycle creation/update)
  async checkAllNotificationConditions(userId: number): Promise<{
    success: boolean;
    message: string;
    notifications: Array<{
      type: 'period_approaching' | 'irregularity' | 'phase';
      title: string;
      body: string;
      sent: boolean;
    }>;
  }> {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // Get user with their latest cycle and recent irregularities
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        include: {
          cycle: {
            orderBy: { start_date: 'desc' },
            take: 1,
          },
          irregularity: {
            where: {
              created_at: {
                gte: new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000), // Last 7 days
              },
            },
          },
        },
      });

      if (!user) {
        return {
          success: false,
          message: 'User not found',
          notifications: [],
        };
      }

      if (!user.fcm_token) {
        return {
          success: false,
          message: 'User has no FCM token',
          notifications: [],
        };
      }

      const notifications: Array<{
        type: 'period_approaching' | 'irregularity' | 'phase';
        title: string;
        body: string;
        sent: boolean;
      }> = [];

      // 1. Check current cycle phase
      if (user.cycle.length > 0) {
        const latestCycle = user.cycle[0];

        const phaseNotification = await this.checkCurrentPhaseAndNotify(
          user,
          latestCycle,
          today,
        );
        if (phaseNotification && phaseNotification.sent) {
          notifications.push(phaseNotification);
        }

        // 2. Check if next period is approaching (less than 60 days)
        const periodApproachingNotification =
          await this.checkPeriodApproachingAndNotify(user, latestCycle, today);
        if (
          periodApproachingNotification &&
          periodApproachingNotification.sent
        ) {
          notifications.push(periodApproachingNotification);
        }
      }

      // 3. Check for recent irregularities
      if (user.irregularity.length > 0) {
        for (const irregularity of user.irregularity) {
          const irregularityNotification =
            await this.sendIrregularityNotification(
              user,
              irregularity.irregularity_type,
            );
          if (irregularityNotification.success) {
            notifications.push({
              type: 'irregularity',
              title: '⚠️ Cycle Irregularity Detected',
              body: this.getIrregularityMessage(
                irregularity.irregularity_type,
                user.name,
              ),
              sent: true,
            });
          }
        }
      }

      const message = `Notification check completed for user ${user.name}. ${notifications.length} notifications processed.`;

      return {
        success: true,
        message,
        notifications,
      };
    } catch {
      const errorMessage = 'Failed to check notification conditions';
      return {
        success: false,
        message: errorMessage,
        notifications: [],
      };
    }
  }
}
