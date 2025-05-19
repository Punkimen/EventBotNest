import { Module } from '@nestjs/common';
import { RemindersService } from './reminders.service';
import { PrismaService } from '../prisma/prisma.service';
import { BullModule } from '@nestjs/bullmq';

@Module({
  providers: [RemindersService, PrismaService],
  exports: [RemindersService],
  imports: [
    BullModule.registerQueue({
      name: 'reminder',
    }),
  ],
})
export class RemindersModule {}
