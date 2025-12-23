
export class NotificationService {
    static async sendPushNotification(tokens: string[], title: string, body: string) {
        const message = {
            to: tokens,
            sound: 'default',
            title: title,
            body: body,
            data: { someData: 'goes here' },
        };

        try {
            await fetch('https://exp.host/--/api/v2/push/send', {
                method: 'POST',
                headers: {
                    Accept: 'application/json',
                    'Accept-encoding': 'gzip, deflate',
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(message),
            });
        } catch (error) {
            console.error('Error sending push notification:', error);
        }
    }

    static async broadcastToAll(title: string, body: string) {
        try {
            const { default: prisma } = await import('../utils/prisma.js');
            const users = await prisma.user.findMany({
                where: { push_token: { not: null } },
                select: { push_token: true }
            });

            const tokens = users.map(u => u.push_token).filter(t => t);
            if (tokens.length > 0) {
                // Batching is recommended for Expo (100 per request)
                // For now, sending all unique (assuming small user base)
                const uniqueTokens = [...new Set(tokens)];
                await this.sendPushNotification(uniqueTokens as string[], title, body);
            }
        } catch (error) {
            console.error('Broadcast Error:', error);
        }
    }
}
