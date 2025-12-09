import { Request, Response } from 'express';
import prisma from '../utils/prisma.js';
import ExcelJS from 'exceljs';
import { format } from 'date-fns';

export const getFinancialReport = async (req: Request, res: Response) => {
  try {
    const { startDate, endDate } = req.query;
    
    // Parse dates or default to 'all time' if not provided
    const start = startDate ? new Date(startDate as string) : new Date(0);
    const end = endDate ? new Date(endDate as string) : new Date();

    const ledger = await prisma.feeLedger.findMany({
      where: {
        date: {
          gte: start,
          lte: end,
        },
      },
      include: {
        user: {
          select: { name: true, phone: true },
        },
      },
      orderBy: { date: 'desc' },
    });

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Financial Report');

    worksheet.columns = [
      { header: 'Date', key: 'date', width: 15 },
      { header: 'User', key: 'user', width: 20 },
      { header: 'Phone', key: 'phone', width: 15 },
      { header: 'Type', key: 'type', width: 15 },
      { header: 'Amount', key: 'amount', width: 15 },
      { header: 'Status', key: 'status', width: 10 },
      { header: 'Notes', key: 'notes', width: 30 },
    ];

    ledger.forEach((entry: any) => {
      worksheet.addRow({
        date: format(new Date(entry.date), 'yyyy-MM-dd'),
        user: entry.user.name,
        phone: entry.user.phone,
        type: entry.type,
        amount: entry.amount,
        status: entry.is_paid ? 'PAID' : 'PENDING',
        notes: entry.notes || '',
      });
    });

    // Style the header row
    worksheet.getRow(1).font = { bold: true };

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=financial-report.xlsx');

    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    console.error('Error generating financial report:', error);
    res.status(500).json({ error: 'Failed to generate report' });
  }
};

export const getUserReport = async (req: Request, res: Response) => {
  try {
    const users = await prisma.user.findMany({
      include: {
        group: true,
      },
      orderBy: { name: 'asc' },
    });

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Users Report');

    worksheet.columns = [
      { header: 'ID', key: 'id', width: 10 },
      { header: 'Name', key: 'name', width: 20 },
      { header: 'Phone', key: 'phone', width: 15 },
      { header: 'Role', key: 'role', width: 15 },
      { header: 'Group', key: 'group', width: 15 },
      { header: 'Deposit', key: 'deposit', width: 15 },
    ];

    users.forEach((user: any) => {
      worksheet.addRow({
        id: user.id,
        name: user.name,
        phone: user.phone,
        role: user.role,
        group: user.group?.name || 'N/A',
        deposit: user.deposit_amount,
      });
    });

    worksheet.getRow(1).font = { bold: true };

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=users-report.xlsx');

    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    console.error('Error generating user report:', error);
    res.status(500).json({ error: 'Failed to generate report' });
  }
};
