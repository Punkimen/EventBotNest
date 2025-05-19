import { Module } from '@nestjs/common';
import { BotService } from './bot.service';
import { RemindersModule } from 'src/reminders/reminders.module';
import { BullModule } from '@nestjs/bullmq';
import { TestProcessor } from './bot.proccessor';

@Module({
  providers: [BotService, TestProcessor],
  imports: [
    RemindersModule,
    BullModule.registerQueue({
      name: 'reminder',
    }),
  ],
})
export class BotModule {}
