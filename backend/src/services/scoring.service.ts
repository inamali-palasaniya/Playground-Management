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

        // 1. Fetch Match State for Validation
        const match = await prisma.match.findUnique({
            where: { id: matchId },
            include: { ball_events: { orderBy: { id: 'desc' }, take: 1 } }
        });

        if (!match) throw new Error("Match not found");

        if (match.is_completed) throw new Error("Match is already completed");

        // 2. Validate Over Limit (Prevent adding balls if max overs reached)
        // Note: overNumber is 0-indexed or 1-indexed? usually 0.whatever or just sequential. 
        // Assuming integer over numbers (1, 2, 3...)
        if (overNumber > match.overs) {
            throw new Error(`Cannot bowl over ${overNumber}. Max overs is ${match.overs}`);
        }

        // Check if previous over was completed and we are trying to add to a "new" over beyond limit
        // Current logic relies on client sending correct numbers.
        // Let's strictly check: If existing balls for this innings imply overs are done.

        // 3. Validate Bowler (Cannot be same as previous over)
        // Find last ball of *previous* over. 
        // If this is the *first ball* of a new over, check the bowler of the *last ball* of the *previous over*.
        if (ballNumber === 1 && overNumber > 1) {
            const previousOverLastBall = await prisma.ballEvent.findFirst({
                where: {
                    match_id: matchId,
                    innings: innings,
                    over_number: overNumber - 1
                },
                orderBy: { ball_number: 'desc' }
            });

            if (previousOverLastBall && previousOverLastBall.bowler_id === bowlerId) {
                throw new Error("The same bowler cannot bowl two consecutive overs.");
            }
        }

        // 4. Validate Batsman (Current Striker != Current Non-Striker)
        if (Number(strikerId) === Number(nonStrikerId)) {
            throw new Error("Striker and Non-Striker cannot be the same player.");
        }

        // 5. Validate Bowler Team (Bowler cannot be from Batting Team)
        if (battingTeamId) {
            // Check if bowler belongs to the batting team
            const bowlerInBattingTeam = await prisma.teamPlayer.findFirst({
                where: {
                    team_id: battingTeamId,
                    user_id: bowlerId
                }
            });

            if (bowlerInBattingTeam) {
                throw new Error("Invalid Bowler: The bowler cannot belong to the current batting team.");
            }
        }

        // 5. Validate Wicket (Striker shouldn't be someone who is already out?)
        // Ideally we track 'is_out' state in a separate table or derive it.
        // For now, complex validation might be heavy, but let's at least ensure they are in the team.

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
            // Connect to server socket instance dynamically to avoid circular dependency
            const serverModule = await import('../server.js');
            const io = serverModule.getIO();
            if (io) {
                io.to(`match_${matchId}`).emit('score_update', ballEvent);
            }
        } catch (e) {
            console.log("Socket emit failed", e);
        }

        return ballEvent;
    } catch (error) {
        console.error('Error processing ball event:', error);
        throw error;
    }
};


