import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Reminder } from '@prisma/client';
import { InjectQueue } from '@nestjs/bullmq';
import { Job, Queue, Worker } from 'bullmq';
import { ConfigService } from '@nestjs/config';

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

  async scheduleReminder(userId: string, message: string, date: Date) {
    const delay = date.getTime() - Date.now();
    console.log('delay', delay, date, Date.now().toString());
    if (delay <= 0) throw new Error('Invalid reminder date');

    await this.reminderQueue.add(
      'sendReminder',
      { userId, message },
      { delay }, // Задержка в миллисекундах
    );
  }
  private async handleReminder(job: Job<{ userId: string; message: string }>) {
    const { userId, message } = job.data;
    // Здесь логика отправки в Telegram (замените на ваш метод)
    console.log(`Sending reminder to user ${userId}: ${message}`);
    // Пометить напоминание как отправленное в БД (если нужно)
    // await this.prisma.reminder.update(...);
  }
}
