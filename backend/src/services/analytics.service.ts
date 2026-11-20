export interface BattingStat {
    id: number;
    name: string;
    runs: number;
    balls: number;
    fours: number;
    sixes: number;
    strikeRate: number;
    isOut: boolean;
    dismissal: string;
}

export interface BowlingStat {
    id: number;
    name: string;
    runs: number;
    wickets: number;
    balls: number;
    overs: string;
    maidens: number;
    economy: number;
    wides: number;
    noBalls: number;
}

export const calculateBattingStats = (ballEvents: any[]): BattingStat[] => {
    const battingStats: { [key: number]: BattingStat } = {};
    
    ballEvents.forEach(ball => {
        const strikerId = ball.striker_id;
        const strikerName = ball.striker?.name || `Player ${strikerId}`;

        if (!battingStats[strikerId]) {
            battingStats[strikerId] = {
                id: strikerId,
                name: strikerName,
                runs: 0,
                balls: 0,
                fours: 0,
                sixes: 0,
                strikeRate: 0,
                isOut: false,
                dismissal: 'not out'
            };
        }
        
        battingStats[strikerId].runs += ball.runs_scored || 0;
        
        // A ball is counted towards batsman's balls faced unless it's a Wide
        const isWide = ball.extra_type === 'WD' || ball.extra_type === 'WIDE';
        if (!isWide) {
            battingStats[strikerId].balls += 1;
        }
        
        if (ball.runs_scored === 4) battingStats[strikerId].fours += 1;
        if (ball.runs_scored === 6) battingStats[strikerId].sixes += 1;

        // Dismissal info
        if (ball.is_wicket && ball.striker_id === strikerId) {
            battingStats[strikerId].isOut = true;
            const wType = (ball.wicket_type || 'OUT').toUpperCase().replace(/_/g, ' ');
            const bowlerName = ball.bowler?.name ? ` b ${ball.bowler.name}` : '';
            if (wType === 'BOWLED') {
                battingStats[strikerId].dismissal = `b ${ball.bowler?.name || 'Bowler'}`;
            } else if (wType === 'CAUGHT') {
                battingStats[strikerId].dismissal = `c Fielder${bowlerName}`;
            } else if (wType === 'LBW') {
                battingStats[strikerId].dismissal = `lbw${bowlerName}`;
            } else if (wType === 'RUN OUT') {
                battingStats[strikerId].dismissal = 'run out';
            } else if (wType === 'STUMPED') {
                battingStats[strikerId].dismissal = `st Keeper${bowlerName}`;
            } else if (wType === 'HIT WICKET') {
                battingStats[strikerId].dismissal = `hit wicket${bowlerName}`;
            } else {
                battingStats[strikerId].dismissal = `${wType.toLowerCase()}${bowlerName}`;
            }
        }
    });

    // Also check non-striker run outs
    ballEvents.forEach(ball => {
        if (ball.is_wicket && ball.non_striker_id) {
            const nsId = ball.non_striker_id;
            const wType = (ball.wicket_type || '').toUpperCase().replace(/_/g, ' ');
            if (wType === 'RUN OUT' && ball.striker_id !== nsId) {
                if (battingStats[nsId]) {
                    battingStats[nsId].isOut = true;
                    battingStats[nsId].dismissal = 'run out';
                }
            }
        }
    });

    // Calculate Strike Rate
    Object.values(battingStats).forEach(b => {
        b.strikeRate = b.balls > 0 ? parseFloat(((b.runs / b.balls) * 100).toFixed(2)) : 0.0;
    });

    return Object.values(battingStats).sort((a, b) => b.runs - a.runs);
};

export const calculateBowlingStats = (ballEvents: any[]): BowlingStat[] => {
    const bowlingStats: { [key: number]: BowlingStat } = {};
    const overRuns: { [bowlerId: number]: { [over: number]: number } } = {};
    const overBalls: { [bowlerId: number]: { [over: number]: number } } = {};

    ballEvents.forEach(ball => {
        const bowlerId = ball.bowler_id;
        const bowlerName = ball.bowler?.name || `Bowler ${bowlerId}`;
        const overNum = ball.over_number || 0;

        if (!bowlingStats[bowlerId]) {
            bowlingStats[bowlerId] = {
                id: bowlerId,
                name: bowlerName,
                runs: 0,
                wickets: 0,
                balls: 0,
                overs: '0.0',
                maidens: 0,
                economy: 0,
                wides: 0,
                noBalls: 0
            };
            overRuns[bowlerId] = {};
            overBalls[bowlerId] = {};
        }

        if (!overRuns[bowlerId][overNum]) {
            overRuns[bowlerId][overNum] = 0;
            overBalls[bowlerId][overNum] = 0;
        }

        const isWide = ball.extra_type === 'WD' || ball.extra_type === 'WIDE';
        const isNoBall = ball.extra_type === 'NB' || ball.extra_type === 'NOBALL';
        const isBye = ball.extra_type === 'BYE';
        const isLegBye = ball.extra_type === 'LB' || ball.extra_type === 'LEGBYE';

        if (isWide) bowlingStats[bowlerId].wides += (ball.extras || 1);
        if (isNoBall) bowlingStats[bowlerId].noBalls += (ball.extras || 1);

        // Runs conceded by bowler includes runs scored from the bat plus wide/noball extras.
        // Byes and Leg Byes are fielding errors and not charged against bowler!
        const runsFromBat = ball.runs_scored || 0;
        const bowlerExtras = (isWide || isNoBall) ? (ball.extras || 1) : 0;
        const ballCost = runsFromBat + bowlerExtras;

        bowlingStats[bowlerId].runs += ballCost;
        overRuns[bowlerId][overNum] += ballCost;

        // Legal delivery count
        const isLegal = ball.is_valid_ball !== false && !isWide && !isNoBall;
        if (isLegal) {
            bowlingStats[bowlerId].balls += 1;
            overBalls[bowlerId][overNum] += 1;
        }

        // Wickets credited to bowler (excluding run outs and retired hurt)
        const wType = (ball.wicket_type || '').toUpperCase().replace(/_/g, ' ');
        if (ball.is_wicket && wType !== 'RUN OUT' && wType !== 'RETIRED HURT') {
            bowlingStats[bowlerId].wickets += 1;
        }
    });

    // Format overs, compute maidens and economy
    Object.values(bowlingStats).forEach(b => {
        const totalLegalBalls = b.balls;
        b.overs = `${Math.floor(totalLegalBalls / 6)}.${totalLegalBalls % 6}`;
        b.economy = totalLegalBalls > 0 ? parseFloat(((b.runs / totalLegalBalls) * 6).toFixed(2)) : 0.0;

        // Count maidens (an over with 6+ legal balls and 0 runs conceded)
        let maidens = 0;
        if (overRuns[b.id]) {
            Object.keys(overRuns[b.id]).forEach(ov => {
                const ovNum = parseInt(ov);
                const ballsInOver = overBalls[b.id][ovNum] || 0;
                const runsInOver = overRuns[b.id][ovNum] || 0;
                if (ballsInOver >= 6 && runsInOver === 0) {
                    maidens += 1;
                }
            });
        }
        b.maidens = maidens;
    });

    return Object.values(bowlingStats).sort((a, b) => b.wickets - a.wickets || a.economy - b.economy);
};

export const calculateInningsBreakdown = (ballEvents: any[], battingTeamName: string, bowlingTeamName: string) => {
    let totalRuns = 0;
    let totalWickets = 0;
    let legalBalls = 0;
    let wides = 0;
    let noBalls = 0;
    let byes = 0;
    let legByes = 0;
    const fallOfWickets: { wicket: number; score: number; over: string; batsman: string }[] = [];

    ballEvents.forEach(ball => {
        const runs = ball.runs_scored || 0;
        const extras = ball.extras || 0;
        totalRuns += runs + extras;

        const isWide = ball.extra_type === 'WD' || ball.extra_type === 'WIDE';
        const isNoBall = ball.extra_type === 'NB' || ball.extra_type === 'NOBALL';
        const isBye = ball.extra_type === 'BYE';
        const isLegBye = ball.extra_type === 'LB' || ball.extra_type === 'LEGBYE';

        if (isWide) wides += (extras || 1);
        if (isNoBall) noBalls += (extras || 1);
        if (isBye) byes += (extras || runs);
        if (isLegBye) legByes += (extras || runs);

        const isLegal = ball.is_valid_ball !== false && !isWide && !isNoBall;
        if (isLegal) legalBalls += 1;

        if (ball.is_wicket) {
            totalWickets += 1;
            const ov = `${Math.floor(legalBalls / 6)}.${legalBalls % 6}`;
            fallOfWickets.push({
                wicket: totalWickets,
                score: totalRuns,
                over: ov,
                batsman: ball.striker?.name || `Player ${ball.striker_id}`
            });
        }
    });

    const totalExtras = wides + noBalls + byes + legByes;
    const oversDisplay = `${Math.floor(legalBalls / 6)}.${legalBalls % 6}`;
    const runRate = legalBalls > 0 ? ((totalRuns / legalBalls) * 6).toFixed(2) : '0.00';

    const batting = calculateBattingStats(ballEvents);
    const bowling = calculateBowlingStats(ballEvents);

    return {
        battingTeam: battingTeamName,
        bowlingTeam: bowlingTeamName,
        totalRuns,
        totalWickets,
        overs: oversDisplay,
        balls: legalBalls,
        runRate,
        extras: {
            total: totalExtras,
            wides,
            noBalls,
            byes,
            legByes
        },
        batting,
        bowling,
        fallOfWickets
    };
};
