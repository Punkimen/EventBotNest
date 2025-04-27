-- CreateEnum
CREATE TYPE "TRepeat" AS ENUM ('once', 'daily', 'weekly', 'monthly', 'yearly');

-- CreateTable
CREATE TABLE "Reminder" (
    "id" SERIAL NOT NULL,
    "text" TEXT NOT NULL,
    "repeatType" "TRepeat" NOT NULL,
    "nextDateNotification" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Reminder_pkey" PRIMARY KEY ("id")
);
