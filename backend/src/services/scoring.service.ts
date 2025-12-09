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

        // Update match status or score summary if needed (simplified)
        // In a real app, we would update aggregate tables or cache

        return ballEvent;
    } catch (error) {
        console.error('Error processing ball event:', error);
        throw error;
    }
};
