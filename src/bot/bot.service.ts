import {Injectable, OnModuleInit} from '@nestjs/common';
import {Telegraf} from 'telegraf';
import {ConfigService} from '@nestjs/config';
import {RemindersService} from 'src/reminders/reminders.service';
import {IReminder, TRepeat} from 'src/reminders/reminders.interface';

type TStepCreate = 'wait_text' | 'wait_repeat' | 'wait_date';

interface IUserMap {
	step: TStepCreate,
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
	) {
		this.bot = new Telegraf(configService.get('BOT_API') || '');
	}

	async onModuleInit() {
		await this.bot.telegram.setMyCommands([
			{command: 'start', description: 'Запуск бота'},
			{command: 'create_reminders', description: 'Создать напоминание'},
			{command: 'my_reminders', description: 'Мои напоминания'},
			{command: 'delete_reminders', description: 'Удалить напоминание'},
			{command: 'help', description: 'Помощь по командам'},
		]);

		await this.bot.telegram.setChatMenuButton({
			menuButton: {type: 'commands'},
		});

		this.bot.command('start', (ctx) => ctx.reply('test btn work'));
		this.bot.command('help', (ctx) => {
			console.log(Object.values(TRepeat))
			return ctx.reply('test btn work')
		});
		this.bot.command('my_reminders', async (ctx) => {
			const reminders = await this.remindersService.getAllReminders();
			console.log('reminders', reminders)
			const text = reminders.length ? reminders.map((el) => `id: ${el.id}; text: ${el.text}`)
				.join(';\n') : 'У вас нет напоминаний';
			return ctx.reply(text);
		});
		this.bot.command('create_reminders', async (ctx) => {
			const uid = ctx.chat.id;
			if (!uid) return;
			userStepMap.set(uid, {step: 'wait_text', text: '', repeatType: TRepeat.once});
			await ctx.reply('Введите текст напоминания:');
		});
		this.bot.command('delete_reminders', async (ctx) => {
			const reminders = await this.remindersService.getAllReminders()
			ctx.reply('Выберите напоминанте которое хотите удалить?', {
				reply_markup: {
					inline_keyboard: [reminders.map(r => {
						return {
							text: r.text,
							callback_data: `id_${r.id}`
						}
					})]
				}
			})
		})

		this.bot.on('text', async (ctx) => {
			const userId = ctx.chat.id
			if (!userId) return;
			const currentStep = userStepMap.get(userId);
			if (!currentStep) return;
			if (currentStep.step === 'wait_text') {
				currentStep.text = ctx.message.text;
				currentStep.step = 'wait_repeat'
				userStepMap.set(userId, currentStep)
				await ctx.reply('Выберете тип повторения', {
					reply_markup: {
						inline_keyboard: [
							Object.values(TRepeat).map((el) => ({
								text: el, callback_data: `repeat_${el}`
							}))
						]
					}
				})
			} else if (currentStep.step === 'wait_date') {
				const [day, month, year] = ctx.message.text.split('.');
				const date = new Date(+year, +month - 1, +day);
				await this.remindersService.addReminder({
					text: currentStep.text,
					repeatType: currentStep.repeatType,
					nextDateNotification: date
				}).then(data=> {
					console.log('add reminder', data)
				})
				await ctx.reply('Напоминание успешно создано!');
				userStepMap.delete(ctx.chat.id);
			}

		});
		this.bot.action(/^repeat_(.+)$/, async (ctx) => {
			const userId = ctx.from?.id;
			if (!userId) return;

			const current = userStepMap.get(userId);
			if (!current || current?.step !== 'wait_repeat') return;
			const repeatType = ctx.match.input.split('_')[1] as TRepeat;

			current.repeatType = repeatType
			current.step = 'wait_date'
			userStepMap.set(userId, current)
			await ctx.reply(
				'Введите дату следующего уведомления (в формате ДД.ММ.ГГГГ):',
			);
		});
		this.bot.action(/^id_(.+)$/, async (ctx) => {
			const userId = ctx.from?.id;
			if (!userId) return;

			const reminderId = +ctx.match.input.split('_')[1] as IReminder['id'];
			if (!reminderId) return ctx.reply('Такого напоминания не найдено, попробуйте позже');
			await this.remindersService.removeReminder(reminderId)
			return ctx.reply('Напоминание успешно удалено!')
		});
		await this.bot.launch();
	}
}
