import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { Bill } from './BillService';

class NotificationService {
  async initialize() {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    
    if (finalStatus !== 'granted') {
      console.log('Failed to get push token for push notification!');
      return;
    }

    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('bills', {
        name: 'Bill Reminders',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FF231F7C',
      });
    }
  }

  async scheduleBillReminder(bill: Bill) {
    const trigger = new Date(bill.dueDate);
    trigger.setDate(trigger.getDate() - 1); // Remind 1 day before

    await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Bill Due Tomorrow',
        body: `${bill.name} of $${bill.amount.toFixed(2)} is due tomorrow`,
        data: { billId: bill.id },
      },
      trigger,
    });

    // Schedule another reminder 3 days before
    const earlyTrigger = new Date(bill.dueDate);
    earlyTrigger.setDate(earlyTrigger.getDate() - 3);

    await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Upcoming Bill',
        body: `${bill.name} of $${bill.amount.toFixed(2)} is due in 3 days`,
        data: { billId: bill.id },
      },
      trigger: earlyTrigger,
    });
  }

  async cancelBillReminders(billId: string) {
    const scheduledNotifications = await Notifications.getAllScheduledNotificationsAsync();
    
    for (const notification of scheduledNotifications) {
      if (notification.content.data?.billId === billId) {
        await Notifications.cancelScheduledNotificationAsync(notification.identifier);
      }
    }
  }

  async scheduleRecurringBillReminders(bill: Bill) {
    if (!bill.isRecurring) return;

    const nextDueDate = this.calculateNextDueDate(bill);
    const nextBill: Bill = {
      ...bill,
      id: Date.now().toString(),
      dueDate: nextDueDate,
      isPaid: false,
    };

    await this.scheduleBillReminder(nextBill);
  }

  private calculateNextDueDate(bill: Bill): Date {
    const { dueDate, frequency } = bill;
    const nextDate = new Date(dueDate);

    switch (frequency) {
      case 'weekly':
        nextDate.setDate(nextDate.getDate() + 7);
        break;
      case 'monthly':
        nextDate.setMonth(nextDate.getMonth() + 1);
        break;
      case 'yearly':
        nextDate.setFullYear(nextDate.getFullYear() + 1);
        break;
    }

    return nextDate;
  }

  async schedulePaymentConfirmation(bill: Bill) {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Payment Confirmed',
        body: `Payment of $${bill.amount.toFixed(2)} for ${bill.name} has been confirmed`,
        data: { billId: bill.id },
      },
      trigger: null, // Show immediately
    });
  }

  async schedulePaymentReminder(bill: Bill) {
    const trigger = new Date(bill.dueDate);
    trigger.setDate(trigger.getDate() + 1); // Remind 1 day after due date

    await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Payment Overdue',
        body: `${bill.name} of $${bill.amount.toFixed(2)} is overdue`,
        data: { billId: bill.id },
      },
      trigger,
    });
  }
}

export const notificationService = new NotificationService(); 