import { Processor, WorkerHost, OnWorkerEvent } from '@nestjs/bullmq';
import { Telegraf } from 'telegraf';
import { RemindersService } from 'src/reminders/reminders.service';
import { ConfigService } from '@nestjs/config';
import { Job } from 'bullmq';
import { TRepeat } from 'generated/prisma';

interface IJobData {
  userId: string;
  message: string;
  reminderId: string;
  repeatType: TRepeat;
}

@Processor('reminder')
export class TestProcessor extends WorkerHost {
  private bot: Telegraf;

  constructor(
    private readonly configService: ConfigService,
    private readonly remindersService: RemindersService,
  ) {
    super();
    this.bot = new Telegraf(configService.get('BOT_API') || '');
  }

  async process(job: Job<IJobData, any, string>): Promise<any> {
    const { userId, message } = job.data;
    console.log('job data', job.data);
    await this.remindersService.handleReminder(job.data);
    await this.bot.telegram.sendMessage(userId, message);
    return await new Promise((resolve) => resolve('resolve promise'));
  }

  @OnWorkerEvent('completed')
  onCompleted() {
    console.log('on complete');
  }
}
