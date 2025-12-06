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
import expenseRoutes from './routes/expense.routes';
import matchRoutes from './routes/match.routes';
import { WebSocketServer } from 'ws';
import http from 'http';

app.use('/api/users', userRoutes);
app.use('/api/subscriptions', subscriptionRoutes);
app.use('/api/subscription-plans', subscriptionPlanRoutes);
app.use('/api/expenses', expenseRoutes);
app.use('/api/matches', matchRoutes);

app.get('/', (req, res) => {
    res.send('Sports Community Hub API');
});

const server = http.createServer(app);
const wss = new WebSocketServer({ server });

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
