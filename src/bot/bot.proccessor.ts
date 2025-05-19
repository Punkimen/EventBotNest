import { Processor, WorkerHost, OnWorkerEvent } from '@nestjs/bullmq';
import {Telegraf} from 'telegraf';
import {RemindersService} from 'src/reminders/reminders.service';
import {ConfigService} from '@nestjs/config';
import { Job } from 'bullmq';

@Processor('reminder')
export class TestProcessor extends WorkerHost {
  private bot: Telegraf;

  constructor(
    private readonly configService: ConfigService,
    private readonly remindersService: RemindersService,
  ) {
    super();
    this.bot = new Telegraf(configService.get('BOT_API') || '')
  }


  async process(job: Job<any, any, string>): Promise<any> {
    console.log('jpb', job);
    const { userId, message } = job.data;
    this.bot.telegram.sendMessage(userId, message)
    return await new Promise((resolve) => resolve('resolve promise'));
  }

  @OnWorkerEvent('completed')
  onCompleted() {
    console.log('on complete');
  }
}
