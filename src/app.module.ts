import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { BotModule } from './bot/bot.module';
import {ConfigModule, ConfigService} from '@nestjs/config';
import { RemindersService } from './reminders/reminders.service';
import { RemindersModule } from './reminders/reminders.module';
import { PrismaService } from './prisma/prisma.service';
import { PrismaModule } from './prisma/prisma.module';
import {BullModule} from "@nestjs/bullmq";

@Module({
  imports: [
    BotModule,
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    BullModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (config: ConfigService) => ({
        connection: {
          host: config.get('REDIS_HOST', 'localhost'),
          port: config.get('REDIS_PORT', 6379),
        },
      }),
      inject: [ConfigService],
    }),
    BullModule.registerQueue({
      name: 'reminder', // Название очереди
    }),

    RemindersModule,
    PrismaModule,
  ],
  controllers: [AppController],
  providers: [AppService, RemindersService, PrismaService],
})
export class AppModule { }
