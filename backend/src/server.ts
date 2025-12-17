import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

import userRoutes from './routes/user.routes.js';
import subscriptionRoutes from './routes/subscription.routes.js';
import subscriptionPlanRoutes from './routes/subscription-plan.routes.js';
import attendanceRoutes from './routes/attendance.routes.js';
import fineRoutes from './routes/fine.routes.js';
import paymentRoutes from './routes/payment.routes.js';
import analyticsRoutes from './routes/analytics.routes.js';
import tournamentRoutes from './routes/tournament.routes.js';
import expenseRoutes from './routes/expense.routes.js';
import matchRoutes from './routes/match.routes.js';
import http from 'http';



import reportRoutes from './routes/report.routes.js';
import authRoutes from './routes/auth.routes.js';

app.use('/api/auth', authRoutes);
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
import groupRoutes from './routes/group.routes.js';
app.use('/api/groups', groupRoutes);

import masterRoutes from './routes/master.routes.js';
app.use('/api/masters', masterRoutes);

import financeRoutes from './routes/finance.routes.js';
app.use('/api/finance', financeRoutes);

import logRoutes from './routes/log.routes.js';
app.use('/api/logs', logRoutes);


app.get('/', (req, res) => {
    res.send('Sports Community Hub API');
});

const server = http.createServer(app);
import { Server } from 'socket.io';
import { processBallEvent } from './services/scoring.service.js';

const io = new Server(server, {
    cors: {
        origin: '*',
    },
});

export const getIO = () => io;

io.on('connection', (socket) => {
    console.log('User connected:', socket.id);

    socket.on('join_match', (matchId) => {
        socket.join(`match_${matchId}`);
        console.log(`User ${socket.id} joined match_${matchId}`);
    });

    socket.on('leave_match', (matchId) => {
        socket.leave(`match_${matchId}`);
        console.log(`User ${socket.id} left match_${matchId}`);
    });

    socket.on('disconnect', () => {
        console.log('User disconnected:', socket.id);
    });
});

app.post('/api/admin/websocket/stop', (req, res) => {
    io.close();
    res.json({ message: 'WebSocket server stopped' });
});

// Start isn't really supported on same instance without re-init, 
// usually you just disconnect clients.
app.post('/api/admin/websocket/start', (req, res) => {
    // Logic to allow connections again would require logic in connection handler
    // For now, simpler implementation.
    res.json({ message: 'WebSocket accepting connections' });
});


server.listen(Number(port), '0.0.0.0', () => {
    console.log(`Server is running on port ${port}`);
});
