import prisma from '../utils/prisma.js';

interface BallEventData {
    matchId: number;
    innings: number;
    overNumber: number;
    ballNumber: number;
    bowlerId: number;
    strikerId: number;
    nonStrikerId?: number;
    battingTeamId?: number;
    runsScored: number;
    isWicket: boolean;
    wicketType?: string;
    extras: number;
    extraType?: string;
    isValidBall?: boolean;
}

export const processBallEvent = async (data: BallEventData) => {
    try {
        const {
            matchId,
            innings,
            overNumber,
            ballNumber,
            bowlerId,
            strikerId,
            nonStrikerId,
            battingTeamId,
            runsScored,
            isWicket,
            wicketType,
            extras,
            extraType,
            isValidBall
        } = data;

        // Record the ball event
        const ballEvent = await prisma.ballEvent.create({
            data: {
                match_id: matchId,
                innings: innings,
                over_number: overNumber,
                ball_number: ballNumber,
                bowler_id: bowlerId,
                striker_id: strikerId,
                non_striker_id: nonStrikerId,
                batting_team_id: battingTeamId,
                runs_scored: runsScored,
                is_wicket: isWicket,
                wicket_type: wicketType,
                extras: extras,
                extra_type: extraType,
                is_valid_ball: isValidBall !== undefined ? isValidBall : true
            },
        });

        // Emit update to match room (Dynamic Import for Socket)
        try {
            // Check if server is accessible or use a centralized socket service
            // For now, silencing the direct import to prevent crashes if server not ready
            // const { getIO } = await import('../server.js');
            // const io = getIO();
            // io.to(`match_${matchId}`).emit('score_update', ballEvent);
        } catch (e) {
            // console.log("Socket emit failed", e);
        }

        return ballEvent;
    } catch (error) {
        console.error('Error processing ball event:', error);
        throw error;
    }
};


