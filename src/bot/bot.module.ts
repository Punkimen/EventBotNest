import {Module} from '@nestjs/common';
import {BotService} from './bot.service';
import {RemindersModule} from 'src/reminders/reminders.module';
import {BullModule} from "@nestjs/bullmq";

@Module({
	providers: [BotService],
	imports: [RemindersModule,  BullModule.registerQueue({
		name: 'reminder',
	}),],
})
export class BotModule {
}
