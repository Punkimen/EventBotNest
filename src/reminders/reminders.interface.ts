export enum TRepeat {
  once = 'once',
  daily = 'daily',
  weekly = 'weekly',
  monthly = 'monthly',
  yearly = 'yearly',
}
export interface IReminder {
  id: number;
  text: string;
  repeatType: TRepeat;
  nextDateNotification: Date;
}

export type TReminderKeys = keyof IReminder;
