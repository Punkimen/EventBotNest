import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Reminder } from '@prisma/client';
import { InjectQueue } from '@nestjs/bullmq';
import { Job, Queue, Worker } from 'bullmq';
import { ConfigService } from '@nestjs/config';
import { dateHandler } from 'src/utils/date.utils';
import { IJobData } from 'src/bot/bot.proccessor';

@Injectable()
export class RemindersService {
  private worker: Worker;
  private config: ConfigService;
  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    @InjectQueue('reminder') private readonly reminderQueue: Queue,
  ) {
    this.config = configService;
    this.initWorker();
  }
  private initWorker() {
    this.worker = new Worker(
      'reminder',
      async (job: Job) => {
        return (await job.data) as Record<string, unknown>;
      },
      {
        connection: {
          host: this.config?.get('REDIS_HOST'),
          port: this.config?.get('REDIS_PORT'),
        },
      },
    );

    this.worker.on('failed', (job, err) => {
      console.error(`Reminder failed for job ${job?.id}:`, err);
    });
  }
  async getAllReminders(userId: number): Promise<Reminder[]> {
    if (!userId) return [];
    const data = await this.prisma.reminder.findMany({
      where: {
        userId: userId,
      },
    });
    console.log('getAllReminders', data);
    return data;
  }

  async addReminder(reminder: Omit<Reminder, 'id'>): Promise<Reminder> {
    const newReminder = await this.prisma.reminder.create({
      data: {
        ...reminder,
      },
    });

    return newReminder;
  }

  async removeReminder(id: number) {
    await this.prisma.reminder.delete({
      where: { id },
    });
  }

  async scheduleReminder(
    userId: string,
    message: string,
    date: Date,
    reminderId: string,
  ) {
    const delay = date.getTime() - Date.now();
    if (delay <= 0) {
      throw new Error('Invalid reminder date');
    }
    console.log('scheduleReminder', reminderId);

    await this.reminderQueue.add(
      'reminder',
      { userId, message, reminderId },
      { delay, removeOnComplete: true },
    );
  }

  async getJobs() {
    const jobs = await this.reminderQueue.getJobs();
    return jobs as Job[];
  }

  async cleanJobs() {
    const jobs = await this.reminderQueue.getJobs();
    for (const jober of jobs) {
      await this.reminderQueue.remove(jober.id);
    }
    console.log('done');
  }

  async handleReminder(job: IJobData) {
    const { reminderId } = job;
    console.log('handleReminder', job);
    if (!reminderId) {
      throw new Error(`reminder id not found ${reminderId}`);
    }
    const reminder = await this.prisma.reminder.findFirst({
      where: {
        id: +reminderId,
      },
    });

    if (!reminder) {
      throw new Error(`reminder is not found ${reminderId}`);
    }

    if (reminder.repeatType === 'once') {
      console.log('once');
      await this.prisma.reminder.delete({
        where: { id: +reminderId },
      });
      return;
    }

    const nowDate = new Date();
    const nextDate = dateHandler.getNextDate(nowDate, reminder.repeatType);

    await this.prisma.reminder.update({
      where: { id: +reminderId },
      data: { nextDateNotification: nextDate },
    });

    await this.reminderQueue.add('reminder', job, {
      delay: nowDate.getTime() - nextDate.getTime(),
      removeOnComplete: true,
    });
  }
}
