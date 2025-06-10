import { Module } from '@nestjs/common';
import { AppService } from './app.service';
import { BotModule } from './bot/bot.module';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { RemindersService } from './reminders/reminders.service';
import { RemindersModule } from './reminders/reminders.module';
import { PrismaService } from './prisma/prisma.service';
import { PrismaModule } from './prisma/prisma.module';
import { BullModule } from '@nestjs/bullmq';

@Module({
  imports: [
    BotModule,
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    BullModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (config: ConfigService) => ({
        connection: {
          host: config.get('REDIS_HOST'),
          port: config.get('REDIS_PORT'),
        },
      }),
      inject: [ConfigService],
    }),
    BullModule.registerQueue({
      name: 'reminder',
    }),

    RemindersModule,
    PrismaModule,
  ],
  providers: [AppService, RemindersService, PrismaService],
})
export class AppModule {}
