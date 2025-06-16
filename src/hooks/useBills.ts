import { useCallback, useEffect, useState } from 'react';
import { Bill, billService } from '../services/BillService';
import { notificationService } from '../services/NotificationService';

export const useBills = () => {
  const [bills, setBills] = useState<Bill[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadBills = useCallback(async () => {
    try {
      setLoading(true);
      const loadedBills = await billService.getBills();
      setBills(loadedBills);
      setError(null);
    } catch (err) {
      setError('Failed to load bills');
      console.error('Error loading bills:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadBills();
  }, [loadBills]);

  const addBill = async (billData: Omit<Bill, 'id'>) => {
    try {
      const newBill = await billService.addBill(billData);
      setBills((prevBills) => [...prevBills, newBill]);
      await notificationService.scheduleBillReminder(newBill);
      return newBill;
    } catch (err) {
      setError('Failed to add bill');
      console.error('Error adding bill:', err);
      throw err;
    }
  };

  const updateBill = async (bill: Bill) => {
    try {
      await billService.updateBill(bill);
      setBills((prevBills) =>
        prevBills.map((b) => (b.id === bill.id ? bill : b))
      );
      await notificationService.cancelBillReminders(bill.id);
      await notificationService.scheduleBillReminder(bill);
    } catch (err) {
      setError('Failed to update bill');
      console.error('Error updating bill:', err);
      throw err;
    }
  };

  const deleteBill = async (id: string) => {
    try {
      await billService.deleteBill(id);
      setBills((prevBills) => prevBills.filter((b) => b.id !== id));
      await notificationService.cancelBillReminders(id);
    } catch (err) {
      setError('Failed to delete bill');
      console.error('Error deleting bill:', err);
      throw err;
    }
  };

  const markBillAsPaid = async (id: string) => {
    try {
      const bill = bills.find((b) => b.id === id);
      if (!bill) throw new Error('Bill not found');

      await billService.markBillAsPaid(id);
      await notificationService.schedulePaymentConfirmation(bill);
      
      if (bill.isRecurring) {
        await notificationService.scheduleRecurringBillReminders(bill);
      }

      setBills((prevBills) =>
        prevBills.map((b) =>
          b.id === id ? { ...b, isPaid: true, lastPaidDate: new Date() } : b
        )
      );
    } catch (err) {
      setError('Failed to mark bill as paid');
      console.error('Error marking bill as paid:', err);
      throw err;
    }
  };

  const getUpcomingBills = async (days: number = 7) => {
    try {
      return await billService.getUpcomingBills(days);
    } catch (err) {
      setError('Failed to get upcoming bills');
      console.error('Error getting upcoming bills:', err);
      throw err;
    }
  };

  const getBillsByCategory = async (category: string) => {
    try {
      return await billService.getBillsByCategory(category);
    } catch (err) {
      setError('Failed to get bills by category');
      console.error('Error getting bills by category:', err);
      throw err;
    }
  };

  const getBillsByStatus = async (isPaid: boolean) => {
    try {
      return await billService.getBillsByStatus(isPaid);
    } catch (err) {
      setError('Failed to get bills by status');
      console.error('Error getting bills by status:', err);
      throw err;
    }
  };

  return {
    bills,
    loading,
    error,
    addBill,
    updateBill,
    deleteBill,
    markBillAsPaid,
    getUpcomingBills,
    getBillsByCategory,
    getBillsByStatus,
    refreshBills: loadBills,
  };
}; 