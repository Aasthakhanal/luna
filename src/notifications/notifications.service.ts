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
  Phase,
  PhaseType,
  IrregularityType,
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
    } catch (error) {
      console.error('Notification Error:', error);
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

  // Helper method to send irregularity notifications
  private async sendIrregularityNotification(
    user: User,
    irregularityType: IrregularityType,
  ): Promise<{ success: boolean; message: string }> {
    const notification = {
      title: '⚠️ Cycle Irregularity Detected',
      body: this.getIrregularityMessage(irregularityType, user.name),
      device_id: user.fcm_token as string,
      user_id: user.id.toString(),
    };

    return await this.sendPush(notification);
  }

  private async checkPeriodDelayAndNotify(
    user: User,
    latestCycle: Cycle,
    today: Date,
  ): Promise<{
    type: 'delay';
    title: string;
    body: string;
    sent: boolean;
  } | null> {
    const predictedStart = new Date(latestCycle.predicted_start_date);
    const daysDifference = Math.floor(
      (today.getTime() - predictedStart.getTime()) / (1000 * 60 * 60 * 24),
    );

    // If period is 3+ days late and cycle hasn't ended
    if (daysDifference >= 3 && !latestCycle.end_date) {
      const notification = {
        title: '🩸 Period Delay Alert',
        body: `Hi ${user.name}, your period is ${daysDifference} days late. Consider tracking symptoms or consulting a healthcare provider.`,
        device_id: user.fcm_token as string,
        user_id: user.id.toString(),
      };

      const result = await this.sendPush(notification);
      return {
        type: 'delay',
        title: notification.title,
        body: notification.body,
        sent: result.success,
      };
    }

    return null;
  }

  // New method: Check for late period notifications
  private async checkLatePeriodAndNotify(
    user: User,
    latestCycle: Cycle,
    today: Date,
  ): Promise<{
    type: 'late_period';
    title: string;
    body: string;
    sent: boolean;
  } | null> {
    // For next cycle prediction
    const currentCycleStart = new Date(latestCycle.start_date);
    const avgCycleLength = user.avg_cycle_length || 28;

    // Calculate when next period should have started
    const expectedNextPeriodDate = new Date(currentCycleStart);
    expectedNextPeriodDate.setDate(
      currentCycleStart.getDate() + avgCycleLength,
    );

    // Calculate days late
    const daysLate = Math.floor(
      (today.getTime() - expectedNextPeriodDate.getTime()) /
        (1000 * 60 * 60 * 24),
    );

    // If period is 2+ days late
    if (daysLate >= 2 && !latestCycle.end_date) {
      const notification = {
        title: '⏰ Period is Late',
        body: `Hi ${user.name}, your period is ${daysLate} days late. Consider tracking symptoms and consulting your healthcare provider if this continues.`,
        device_id: user.fcm_token as string,
        user_id: user.id.toString(),
      };

      const result = await this.sendPush(notification);
      return {
        type: 'late_period',
        title: notification.title,
        body: notification.body,
        sent: result.success,
      };
    }

    return null;
  }

  // Helper method to check if period is approaching (less than 10 days)
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
    // Calculate next cycle's predicted start date
    const currentCycleStart = new Date(latestCycle.start_date);
    const avgCycleLength = user.avg_cycle_length || 28;

    // Next period predicted start date
    const nextPeriodDate = new Date(currentCycleStart);
    nextPeriodDate.setDate(currentCycleStart.getDate() + avgCycleLength);

    // Calculate days until next period
    const daysUntilPeriod = Math.floor(
      (nextPeriodDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24),
    );

    // If period is approaching (less than 10 days) and more than 0 days
    if (daysUntilPeriod > 0 && daysUntilPeriod < 10) {
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

  // New method for individual user daily check (called on login)
  async checkUserDailyStatus(userId: number): Promise<{
    success: boolean;
    message: string;
    notifications: Array<{
      type: 'phase' | 'period_approaching' | 'irregularity' | 'late_period';
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
            include: {
              phases: {
                where: {
                  start_date: { lte: today },
                  end_date: { gte: today },
                },
              },
            },
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
        type: 'phase' | 'period_approaching' | 'irregularity' | 'late_period';
        title: string;
        body: string;
        sent: boolean;
      }> = [];

      // 1. CONDITION 1: Check current phase and display notification
      if (user.cycle.length > 0) {
        const latestCycle = user.cycle[0];

        if (latestCycle.phases.length > 0) {
          const currentPhase = latestCycle.phases[0];
          const phaseNotification = await this.sendCurrentPhaseNotification(
            user,
            currentPhase,
          );
          notifications.push({
            type: 'phase',
            title: '🌸 Current Cycle Phase',
            body: this.getPhaseMessage(currentPhase.type, user.name),
            sent: phaseNotification.success,
          });
        }

        // 2. CONDITION 2: Check if next period is less than 10 days away
        const periodApproachingNotification =
          await this.checkPeriodApproachingAndNotify(user, latestCycle, today);
        if (periodApproachingNotification) {
          notifications.push(periodApproachingNotification);
        }

        // 3. NEW CONDITION: Check if period is late
        const latePeriodNotification = await this.checkLatePeriodAndNotify(
          user,
          latestCycle,
          today,
        );
        if (latePeriodNotification) {
          notifications.push(latePeriodNotification);
        }
      }

      // 4. CONDITION 3: Check for any recent irregularities
      if (user.irregularity.length > 0) {
        for (const irregularity of user.irregularity) {
          const irregularityNotification =
            await this.sendIrregularityNotification(
              user,
              irregularity.irregularity_type,
            );
          notifications.push({
            type: 'irregularity',
            title: '⚠️ Cycle Irregularity Detected',
            body: this.getIrregularityMessage(
              irregularity.irregularity_type,
              user.name,
            ),
            sent: irregularityNotification.success,
          });
        }
      }

      const message = `Daily check completed for user ${user.name}. ${notifications.length} notifications processed.`;
      console.log('✅ User daily check completed:', message);

      return {
        success: true,
        message,
        notifications,
      };
    } catch (error) {
      const errorMessage = 'Failed to perform user daily check';
      console.error('❌ Error in user daily check:', error);
      return {
        success: false,
        message: errorMessage,
        notifications: [],
      };
    }
  }

  // Helper method to send current phase notification
  private async sendCurrentPhaseNotification(
    user: User,
    currentPhase: Phase,
  ): Promise<{ success: boolean; message: string }> {
    const notification = {
      title: '🌸 Daily Cycle Update',
      body: this.getPhaseMessage(currentPhase.type, user.name),
      device_id: user.fcm_token as string,
      user_id: user.id.toString(),
    };

    return await this.sendPush(notification);
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
      type: 'phase' | 'period_approaching' | 'irregularity' | 'late_period';
      title: string;
      body: string;
      sent: boolean;
    }>;
  }> {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      console.log(`🔍 Checking notification conditions for user ${userId}...`);

      // Get user with their latest cycle and recent irregularities
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        include: {
          cycle: {
            orderBy: { start_date: 'desc' },
            take: 1,
            include: {
              phases: true, // Get all phases, we'll filter in code
            },
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
        console.log(`❌ User ${userId} not found`);
        return {
          success: false,
          message: 'User not found',
          notifications: [],
        };
      }

      if (!user.fcm_token) {
        console.log(`❌ User ${userId} has no FCM token`);
        return {
          success: false,
          message: 'User has no FCM token',
          notifications: [],
        };
      }

      console.log(
        `✅ User found: ${user.name}, FCM token: ${user.fcm_token ? 'Yes' : 'No'}`,
      );
      console.log(
        `📊 User has ${user.cycle.length} cycles, ${user.irregularity.length} recent irregularities`,
      );

      const notifications: Array<{
        type: 'phase' | 'period_approaching' | 'irregularity' | 'late_period';
        title: string;
        body: string;
        sent: boolean;
      }> = [];

      // Check all conditions if user has cycles
      if (user.cycle.length > 0) {
        const latestCycle = user.cycle[0];
        console.log(
          `🔄 Latest cycle: ${latestCycle.start_date.toISOString()}, phases: ${latestCycle.phases.length}`,
        );

        // 1. Check current phase (find phase that contains today)
        const currentPhase = latestCycle.phases.find((phase) => {
          const phaseStart = new Date(phase.start_date);
          const phaseEnd = new Date(phase.end_date);
          phaseStart.setHours(0, 0, 0, 0);
          phaseEnd.setHours(23, 59, 59, 999);
          return today >= phaseStart && today <= phaseEnd;
        });

        if (currentPhase) {
          console.log(`🌸 Current phase found: ${currentPhase.type}`);
          const phaseNotification = await this.sendCurrentPhaseNotification(
            user,
            currentPhase,
          );
          notifications.push({
            type: 'phase',
            title: '🌸 Current Cycle Phase',
            body: this.getPhaseMessage(currentPhase.type, user.name),
            sent: phaseNotification.success,
          });
        } else {
          console.log(
            `❌ No current phase found for today (${today.toISOString().split('T')[0]})`,
          );
          // Log all phases for debugging
          latestCycle.phases.forEach((phase) => {
            console.log(
              `  Phase ${phase.type}: ${phase.start_date.toISOString()} to ${phase.end_date.toISOString()}`,
            );
          });
        }

        // 2. Check if next period is approaching (less than 10 days)
        const periodApproachingNotification =
          await this.checkPeriodApproachingAndNotify(user, latestCycle, today);
        if (periodApproachingNotification) {
          console.log(`📅 Period approaching notification sent`);
          notifications.push(periodApproachingNotification);
        }

        // 3. Check if period is late
        const latePeriodNotification = await this.checkLatePeriodAndNotify(
          user,
          latestCycle,
          today,
        );
        if (latePeriodNotification) {
          console.log(`⏰ Late period notification sent`);
          notifications.push(latePeriodNotification);
        }
      }

      // 4. Check for recent irregularities
      if (user.irregularity.length > 0) {
        console.log(`⚠️ Processing ${user.irregularity.length} irregularities`);
        for (const irregularity of user.irregularity) {
          const irregularityNotification =
            await this.sendIrregularityNotification(
              user,
              irregularity.irregularity_type,
            );
          notifications.push({
            type: 'irregularity',
            title: '⚠️ Cycle Irregularity Detected',
            body: this.getIrregularityMessage(
              irregularity.irregularity_type,
              user.name,
            ),
            sent: irregularityNotification.success,
          });
        }
      }

      const message = `Notification check completed for user ${user.name}. ${notifications.length} notifications processed.`;
      console.log('✅ Notification check completed:', message);

      return {
        success: true,
        message,
        notifications,
      };
    } catch (error) {
      const errorMessage = 'Failed to check notification conditions';
      console.error('❌ Error in notification check:', error);
      return {
        success: false,
        message: errorMessage,
        notifications: [],
      };
    }
  }
}
