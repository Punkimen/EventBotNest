import { Injectable, OnModuleInit } from '@nestjs/common';
import { Telegraf } from 'telegraf';
import { ConfigService } from '@nestjs/config';
import { RemindersService } from 'src/reminders/reminders.service';
import { TRepeat } from 'src/reminders/reminders.interface';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { dateHandler } from 'src/utils/date.utils';

type TStepCreate = 'wait_text' | 'wait_repeat' | 'wait_date';

interface IUserMap {
  step: TStepCreate;
  text: string;
  repeatType: TRepeat;
}

const userStepMap = new Map<number, IUserMap>();

@Injectable()
export class BotService implements OnModuleInit {
  private bot: Telegraf;

  constructor(
    private readonly configService: ConfigService,
    private readonly remindersService: RemindersService,
    @InjectQueue('reminder') private readonly reminderQueue: Queue,
  ) {
    this.bot = new Telegraf(configService.get('BOT_API') || '');
  }

  private setupReminderWorker() {}

  async onModuleInit() {
    await this.bot.telegram.setMyCommands([
      { command: 'start', description: 'Запуск бота' },
      { command: 'create_reminders', description: 'Создать напоминание' },
      { command: 'my_reminders', description: 'Мои напоминания' },
      { command: 'clean_jobs', description: 'Очистить очередь' },
      { command: 'delete_reminders', description: 'Удалить напоминание' },
      { command: 'get_jobs', description: 'Получить очередь' },
      { command: 'help', description: 'Помощь по командам' },
    ]);

    await this.bot.telegram.setChatMenuButton({
      menuButton: { type: 'commands' },
    });

    this.bot.command('start', (ctx) => ctx.reply('test btn work'));

    this.bot.command('help', (ctx) => {
      console.log(Object.values(TRepeat));
      return ctx.reply('test btn work');
    });

    this.bot.command('my_reminders', async (ctx) => {
      const userId = ctx.chat.id;
      const reminders = await this.remindersService.getAllReminders(userId);
      console.log('reminders', reminders);
      const text = reminders.length
        ? reminders.map((el) => `id: ${el.id}; text: ${el.text}`).join(';\n')
        : 'У вас нет напоминаний';
      return ctx.reply(text);
    });

    this.bot.command('create_reminders', async (ctx) => {
      const uid = ctx.chat.id;
      if (!uid) return;
      userStepMap.set(uid, {
        step: 'wait_text',
        text: '',
        repeatType: TRepeat.once,
      });
      await ctx.reply('Введите текст напоминания:');
    });

    this.bot.command('delete_reminders', async (ctx) => {
      const userId = ctx.chat.id;
      const reminders = await this.remindersService.getAllReminders(userId);
      await ctx.reply('Выберите напоминанте которое хотите удалить?', {
        reply_markup: {
          inline_keyboard: [
            reminders.map((r) => {
              return {
                text: r.text,
                callback_data: `id_${r.id}`,
              };
            }),
          ],
        },
      });
    });

    this.bot.command('get_jobs', async (ctx) => {
      const jobs = await this.remindersService.getJobs();
      console.log('jobs', jobs);
      const test = dateHandler.getDate();
      await ctx.reply(`Вывел работы в консоль ${test.toISOString()}`);
    });

    this.bot.command('clean_jobs', async (ctx) => {
      await this.remindersService.cleanJobs();
      await ctx.reply('Очистил очередь');
    });

    this.bot.on('text', async (ctx) => {
      const userId = ctx.chat.id;
      if (!userId) return;
      const currentStep = userStepMap.get(userId);
      if (!currentStep) return;
      if (currentStep.step === 'wait_text') {
        currentStep.text = ctx.message.text;
        currentStep.step = 'wait_repeat';
        userStepMap.set(userId, currentStep);
        await ctx.reply('Выберете тип повторения', {
          reply_markup: {
            inline_keyboard: [
              Object.values(TRepeat).map((el) => ({
                text: el,
                callback_data: `repeat_${el}`,
              })),
            ],
          },
        });
      } else if (currentStep.step === 'wait_date') {
        const [dates, time] = ctx.message.text.split(' ');
        const [day, month, year] = dates?.split('.') || [0, 0, 0];
        const [hour, min] = time?.split(':') || [0, 0];
        const date = new Date(+year, +month - 1, +day, +hour, +min);

        console.log('date', dateHandler.nowDate(), date);
        if (
          isNaN(date.getTime()) ||
          dateHandler.nowDate().getTime() - date.getTime() > 0
        ) {
          ctx.reply('Неверный формат даты или времени');
          return;
        }

        const reminder = await this.remindersService
          .addReminder({
            text: currentStep.text,
            repeatType: currentStep.repeatType,
            nextDateNotification: date,
            userId: userId,
          })
          .then((data) => {
            console.log('add reminder', data);
            return data;
          });
        if (!reminder) {
          console.log('reminder not founr', reminder);
          return;
        }
        try {
          await this.remindersService.scheduleReminder(
            userId.toString(),
            currentStep.text,
            date,
            reminder?.id.toString() || '',
          );
          await ctx.reply('Напоминание успешно создано!');
        } catch {
          await ctx.reply('Напоминание не создано!');
        }

        userStepMap.delete(ctx.chat.id);
      }
    });
    this.bot.action(/^repeat_(.+)$/, async (ctx) => {
      const userId = ctx.from?.id;
      if (!userId) return;

      const current = userStepMap.get(userId);
      if (!current || current?.step !== 'wait_repeat') return;
      const repeatType = ctx.match.input.split('_')[1] as TRepeat;

      current.repeatType = repeatType;
      current.step = 'wait_date';
      userStepMap.set(userId, current);
      await ctx.reply(
        'Введите дату следующего уведомления (в формате ДД.ММ.ГГГГ ЧЧ:ММ):',
      );
    });
    this.bot.action(/^id_(.+)$/, async (ctx) => {
      const userId = ctx.from?.id;
      if (!userId) return;

      const reminderId = +ctx.match.input.split('_')[1];
      if (!reminderId)
        return ctx.reply('Такого напоминания не найдено, попробуйте позже');
      await this.remindersService.removeReminder(reminderId);
      return ctx.reply('Напоминание успешно удалено!');
    });
    await this.bot.launch();
  }
}
