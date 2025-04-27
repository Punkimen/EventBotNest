import { Module } from '@nestjs/common';
import { BotService } from './bot.service';
import { RemindersModule } from 'src/reminders/reminders.module';

@Module({
  providers: [BotService],
  imports: [RemindersModule],
})
export class BotModule { }
