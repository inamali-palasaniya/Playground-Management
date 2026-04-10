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

        // 1. Fetch All Validation Data in Parallel/Combined to reduce DB round trips
        const match = await prisma.match.findUnique({
            where: { id: matchId },
            include: {
                // Fetch last ball of previous over for consecutive-bowler check
                ball_events: {
                    where: {
                        innings: innings,
                        OR: [
                            { over_number: overNumber }, // current over for count check
                            { over_number: overNumber - 1 } // prev over for consecutive check
                        ]
                    },
                    orderBy: [{ over_number: 'desc' }, { ball_number: 'desc' }]
                },
                // Fetch bowler's team info to validate they aren't bowling to their own team
                team_a: { include: { players: { where: { user_id: bowlerId }, select: { user_id: true } } } },
                team_b: { include: { players: { where: { user_id: bowlerId }, select: { user_id: true } } } }
            }
        });

        if (!match) throw new Error("Match not found");
        if (match.is_completed) throw new Error("Match is already completed");

        // 2. Validate Over Limit
        const currentOverValidBalls = match.ball_events.filter(b => b.over_number === overNumber && b.is_valid_ball).length;
        if (currentOverValidBalls >= 6 && (isValidBall !== false)) {
            throw new Error(`Over ${overNumber} is complete. Please update over number or change bowler.`);
        }

        if (overNumber > match.overs) {
            throw new Error(`Maximum overs (${match.overs}) reached for this match.`);
        }

        // 3. Validate Bowler (Cannot bowl consecutive overs)
        if (ballNumber === 1 && overNumber > 1) {
            const lastOverBalls = match.ball_events.filter(b => b.over_number === overNumber - 1);
            const previousOverLastBall = lastOverBalls[0]; // Already ordered desc

            if (previousOverLastBall && previousOverLastBall.bowler_id === bowlerId) {
                throw new Error("Consecutive Over Violation: The same bowler cannot bowl two overs in a row.");
            }
        }

        // 4. Validate Batsman (Current Striker != Current Non-Striker)
        if (Number(strikerId) === Number(nonStrikerId)) {
            throw new Error("Invalid Alignment: Striker and Non-Striker cannot be the same player.");
        }

        // 5. Validate Bowler Team (Bowler cannot be from Batting Team)
        if (battingTeamId) {
            const isTeamA = Number(battingTeamId) === match.team_a_id;
            const targetTeam = isTeamA ? match.team_a : match.team_b;
            const bowlerInBattingTeam = targetTeam.players.length > 0;

            if (bowlerInBattingTeam) {
                throw new Error("Illegal Bowler: A player cannot bowl against their own team.");
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


