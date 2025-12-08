import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

import userRoutes from './routes/user.routes';
import subscriptionRoutes from './routes/subscription.routes';
import subscriptionPlanRoutes from './routes/subscription-plan.routes';
import attendanceRoutes from './routes/attendance.routes';
import fineRoutes from './routes/fine.routes';
import paymentRoutes from './routes/payment.routes';
import analyticsRoutes from './routes/analytics.routes';
import tournamentRoutes from './routes/tournament.routes';
import expenseRoutes from './routes/expense.routes';
import matchRoutes from './routes/match.routes';
import { WebSocketServer } from 'ws';
import http from 'http';
import reportRoutes from './routes/report.routes';

app.use('/api/users', userRoutes);
app.use('/api/subscriptions', subscriptionRoutes);
app.use('/api/subscription-plans', subscriptionPlanRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/fines', fineRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/tournaments', tournamentRoutes);
app.use('/api/expenses', expenseRoutes);
app.use('/api/matches', matchRoutes);
app.use('/api/reports', reportRoutes);

app.get('/', (req, res) => {
    res.send('Sports Community Hub API');
});

const server = http.createServer(app);
export const wss = new WebSocketServer({ server });

// WebSocket Control Endpoints
app.post('/api/admin/websocket/stop', (req, res) => {
    wss.close();
    res.json({ message: 'WebSocket server stopped' });
});

app.post('/api/admin/websocket/start', (req, res) => {
    // Note: 'ws' library doesn't support 'start' after 'close' easily on the same instance attached to http server
    // We would need to re-instantiate or just close clients.
    // However, if we just want to stop NEW connections:
    // wss.shouldHandle = () => false; 

    // For simplicity given the library constraints, we'll implement a 'disconnect all' feature
    wss.clients.forEach(client => client.close());
    res.json({ message: 'All WebSocket clients disconnected' });
});

import { processBallEvent } from './services/scoring.service';

wss.on('connection', (ws) => {
    console.log('New client connected');

    ws.on('message', async (message) => {
        try {
            const data = JSON.parse(message.toString());
            if (data.type === 'BALL_EVENT') {
                const result = await processBallEvent(data.payload);
                // Broadcast to all clients
                wss.clients.forEach((client) => {
                    if (client.readyState === 1) { // WebSocket.OPEN
                        client.send(JSON.stringify({ type: 'SCORE_UPDATE', payload: result }));
                    }
                });
            }
        } catch (error) {
            console.error('Error handling message:', error);
        }
    });

    ws.on('close', () => {
        console.log('Client disconnected');
    });
});

server.listen(Number(port), '0.0.0.0', () => {
    console.log(`Server is running on port ${port}`);
});
