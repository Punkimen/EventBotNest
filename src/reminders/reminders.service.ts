import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Reminder } from '@prisma/client';
import { InjectQueue } from '@nestjs/bullmq';
import { Job, Queue, Worker } from 'bullmq';
import { ConfigService } from '@nestjs/config';
import { TRepeat } from 'generated/prisma';

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

  getWorker() {
    return this.worker;
  }

  async scheduleReminder(
    userId: string,
    message: string,
    date: Date,
    reminderId: string,
    repeatType: TRepeat,
  ) {
    const delay = date.getTime() - Date.now();
    if (delay <= 0) throw new Error('Invalid reminder date');
    console.log('scheduleReminder', reminderId);

    await this.reminderQueue.add(
      'sendReminder',
      { userId, message, reminderId, repeatType },
      { delay, removeOnComplete: true },
    );
  }

  async getJobs() {
    const jobs = await this.reminderQueue.getJobs();
    return jobs as Job[];
  }

  async cleanJobs() {
    await this.reminderQueue.clean(60, 100);
    console.log('done');
  }

  async handleReminder(job: {
    userId: string;
    message: string;
    reminderId?: string;
    repeatType: TRepeat;
  }) {
    const { userId, message, reminderId, repeatType } = job;

    if (!reminderId) {
      console.log(`reminder id not found ${reminderId}`);
      return;
    }

    if (repeatType !== 'once') {
      await this.reminderQueue.add('sendReminder', job, {
        delay: 5000,
        removeOnComplete: true,
      });
      console.log('add new quque', job);
      return;
    }

    await this.prisma.reminder.delete({
      where: { id: +reminderId },
    });
    console.log(`Sending reminder to user ${userId}: ${message}`);
  }
}
