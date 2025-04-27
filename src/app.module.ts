import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { BotModule } from './bot/bot.module';
import { ConfigModule } from '@nestjs/config';
import { RemindersService } from './reminders/reminders.service';
import { RemindersModule } from './reminders/reminders.module';
import { PrismaService } from './prisma/prisma.service';
import { PrismaModule } from './prisma/prisma.module';

@Module({
  imports: [
    BotModule,
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    RemindersModule,
    PrismaModule,
  ],
  controllers: [AppController],
  providers: [AppService, RemindersService, PrismaService],
})
export class AppModule { }
