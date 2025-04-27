import { Injectable } from '@nestjs/common';
import { IReminder, TRepeat } from './reminders.interface';
import {PrismaService} from "../prisma/prisma.service";
import {Reminder} from "../../generated/prisma";

@Injectable()
export class RemindersService {
  constructor(private readonly prisma: PrismaService) {
  }
  async getAllReminders(): Promise<Reminder[]> {
    const data = await this.prisma.reminder.findMany();
    return data
  }

  async addReminder(reminder: Omit<Reminder, 'id'>): Promise<Reminder> {
    const newReminder = await this.prisma.reminder.create({
      data: {
        ...reminder
      }
    }) ;

    return newReminder;
  }


 async removeReminder(id: number) {
    await this.prisma.reminder.delete({
      where: {id}
    });
  }
}
