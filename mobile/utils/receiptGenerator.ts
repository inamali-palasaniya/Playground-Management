import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { format } from 'date-fns';

interface ReceiptItem {
    description: string;
    amount: number;
    date: string;
    ref?: string;
}

interface ReceiptData {
    title: string;
    userName: string;
    userPhone?: string;
    date: string;
    totalAmount: number;
    items: ReceiptItem[];
    transactionType: 'PAYMENT' | 'CHARGE' | 'EXPENSE';
    id: number;
}

export const generateReceipt = async (data: ReceiptData) => {
    const html = `
        <html>
        <head>
            <style>
                body { font-family: 'Helvetica', sans-serif; padding: 20px; color: #333; }
                .header { text-align: center; margin-bottom: 30px; }
                .company { font-size: 24px; font-weight: bold; color: #1565c0; }
                .receipt-title { font-size: 18px; margin-top: 5px; text-transform: uppercase; letter-spacing: 2px; }
                .meta { display: flex; justify-content: space-between; margin-bottom: 20px; border-bottom: 2px solid #eee; padding-bottom: 10px; }
                .meta div { font-size: 14px; }
                .table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
                .table th { text-align: left; border-bottom: 2px solid #333; padding: 8px; }
                .table td { border-bottom: 1px solid #eee; padding: 8px; }
                .amount { text-align: right; }
                .total { font-size: 18px; font-weight: bold; text-align: right; margin-top: 10px; }
                .footer { margin-top: 40px; text-align: center; font-size: 12px; color: #777; }
                .status { 
                    padding: 5px 10px; 
                    border-radius: 4px; 
                    background-color: ${data.transactionType === 'PAYMENT' ? '#e8f5e9' : '#ffebee'}; 
                    color: ${data.transactionType === 'PAYMENT' ? 'green' : 'red'}; 
                    font-weight: bold;
                }
            </style>
        </head>
        <body>
            <div class="header">
                <div class="company">Sports Community Hub</div>
                <div class="receipt-title">Transaction Receipt</div>
            </div>

            <div class="meta">
                <div>
                    <strong>To:</strong> ${data.userName}<br/>
                    ${data.userPhone ? data.userPhone : ''}
                </div>
                <div style="text-align: right;">
                    <strong>Receipt #:</strong> ${data.id}<br/>
                    <strong>Date:</strong> ${format(new Date(data.date), 'dd MMM yyyy')}<br/>
                    <span class="status">${data.transactionType}</span>
                </div>
            </div>

            <table class="table">
                <thead>
                    <tr>
                        <th>Description</th>
                        <th>Ref</th>
                        <th class="amount">Amount</th>
                    </tr>
                </thead>
                <tbody>
                    ${data.items.map(item => `
                        <tr>
                            <td>${item.description}</td>
                            <td>${item.ref || '-'}</td>
                            <td class="amount">₹${item.amount.toLocaleString('en-IN')}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>

            <div class="total">
                Total: ₹${data.totalAmount.toLocaleString('en-IN')}
            </div>

            <div class="footer">
                Thank you for being part of our community!<br/>
                Generated on ${new Date().toLocaleString()}
            </div>
        </body>
        </html>
    `;

    try {
        const { uri } = await Print.printToFileAsync({ html });
        await Sharing.shareAsync(uri, { UTI: '.pdf', mimeType: 'application/pdf' });
    } catch (error) {
        console.error('Failed to generate receipt:', error);
        throw new Error('Failed to generate receipt');
    }
};
