import { TRepeat } from 'generated/prisma';

class DateHandler {
  private date: Date;

  constructor(date?: Date) {
    this.date = date || new Date();
  }

  setDate(date: Date) {
    this.date = date;
  }

  nowDate() {
    return new Date();
  }

  getDate() {
    return this.date;
  }

  getNextDate(date: Date, repeatType: TRepeat): Date {
    const next = new Date(date);

    switch (repeatType) {
      case TRepeat.daily:
        next.setDate(next.getDate() + 1);
        break;
      case TRepeat.weekly:
        next.setDate(next.getDate() + 7);
        break;
      case TRepeat.monthly:
        next.setMonth(next.getMonth() + 1);
        break;
      case TRepeat.yearly:
        next.setFullYear(next.getFullYear() + 1);
        break;
    }

    return next;
  }
}

export const dateHandler = new DateHandler();
