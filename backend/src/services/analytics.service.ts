export const calculateBattingStats = (ballEvents: any[]) => {
    const battingStats: any = {};
    
    ballEvents.forEach(ball => {
      const strikerId = ball.striker_id;
      if (!battingStats[strikerId]) {
        battingStats[strikerId] = {
            id: strikerId,
            name: ball.striker.name,
            runs: 0,
            balls: 0,
            fours: 0,
            sixes: 0
        };
      }
      
      battingStats[strikerId].runs += ball.runs_scored;
      
      if (ball.extra_type !== 'WIDE') {
          battingStats[strikerId].balls += 1;
      }
      
      if (ball.runs_scored === 4) battingStats[strikerId].fours += 1;
      if (ball.runs_scored === 6) battingStats[strikerId].sixes += 1;
    });

    return Object.values(battingStats).sort((a: any, b: any) => b.runs - a.runs);
};

export const calculateBowlingStats = (ballEvents: any[]) => {
    const bowlingStats: any = {};
    
    ballEvents.forEach(ball => {
      const bowlerId = ball.bowler_id;
      if (!bowlingStats[bowlerId]) {
        bowlingStats[bowlerId] = {
            id: bowlerId,
            name: ball.bowler.name,
            runs: 0,
            wickets: 0,
            overs: 0,
            balls: 0
        };
      }
      
      bowlingStats[bowlerId].runs += ball.runs_scored;
      
      if (ball.extra_type === 'WIDE' || ball.extra_type === 'NOBALL') {
          bowlingStats[bowlerId].runs += ball.extras;
      }
      
      if (ball.extra_type !== 'WIDE' && ball.extra_type !== 'NOBALL') {
           bowlingStats[bowlerId].balls += 1;
      }

      if (ball.is_wicket && ball.wicket_type !== 'RUNOUT') {
        bowlingStats[bowlerId].wickets += 1;
      }
    });

    // Format overs
    Object.values(bowlingStats).forEach((bst: any) => {
        const balls = bst.balls;
        bst.overs = Math.floor(balls / 6) + (balls % 6) / 10;
    });

    return Object.values(bowlingStats).sort((a: any, b: any) => b.wickets - a.wickets);
};
