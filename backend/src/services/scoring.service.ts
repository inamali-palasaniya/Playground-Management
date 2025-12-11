import prisma from '../utils/prisma.js';

interface BallEventData {
    matchId: number;
    bowlerId: number;
    strikerId: number;
    runsScored: number;
    isWicket: boolean;
    wicketType?: string;
    extras: number;
    extraType?: string;
    overNumber: number;
    ballNumber: number;
}

export const processBallEvent = async (data: BallEventData) => {
    try {
        const {
            matchId,
            bowlerId,
            strikerId,
            runsScored,
            isWicket,
            wicketType,
            extras,
            extraType,
            overNumber,
            ballNumber,
        } = data;

        // Record the ball event
        const ballEvent = await prisma.ballEvent.create({
            data: {
                match_id: matchId,
                bowler_id: bowlerId,
                striker_id: strikerId,
                runs_scored: runsScored,
                is_wicket: isWicket,
                wicket_type: wicketType,
                extras: extras,
                extra_type: extraType,
                over_number: overNumber,
                ball_number: ballNumber,
            },
        });

        // Emit update to match room
        const { getIO } = await import('../server.js');
        // Dynamic import to avoid circular dependency if possible, or just import top level if safe.
        // Actually top level import is circular if server imports service. 
        // Using getIO function pattern or separate socket instance file is better.
        // For now, assuming dynamic import works or moving io to separate file.
        // But server.ts imports scoring.service.ts.
        // So scoring.service.ts cannot import server.ts directly at top level.
        try {
            const io = getIO();
            io.to(`match_${matchId}`).emit('score_update', ballEvent);
        } catch (e) {
            console.log("Socket emit failed (likely server not init yet)", e);
        }

        return ballEvent;
    } catch (error) {
        console.error('Error processing ball event:', error);
        throw error;
    }
};
