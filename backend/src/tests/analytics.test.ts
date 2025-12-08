import { calculateBattingStats, calculateBowlingStats } from '../services/analytics.service';

const mockBallEvents = [
    {
        runs_scored: 4,
        striker_id: 1, bowler_id: 2,
        striker: { id: 1, name: 'Batter 1' }, bowler: { id: 2, name: 'Bowler 1' },
        extra_type: null, extras: 0, is_wicket: false
    },
    {
        runs_scored: 1,
        striker_id: 1, bowler_id: 2,
        striker: { id: 1, name: 'Batter 1' }, bowler: { id: 2, name: 'Bowler 1' },
        extra_type: null, extras: 0, is_wicket: false
    },
    {
        runs_scored: 0,
        striker_id: 2, bowler_id: 2,
        striker: { id: 2, name: 'Batter 2' }, bowler: { id: 2, name: 'Bowler 1' },
        extra_type: null, extras: 0, is_wicket: true, wicket_type: 'BOWLED'
    },
];

describe('Analytics Service', () => {
    test('calculateBattingStats should aggregate runs correctly', () => {
        const stats = calculateBattingStats(mockBallEvents) as any[];
        expect(stats).toHaveLength(2);

        // Batter 1: 5 runs (4+1), 2 balls
        const batter1 = stats.find((s: any) => s.id === 1);
        expect(batter1.runs).toBe(5);
        expect(batter1.balls).toBe(2);
        expect(batter1.fours).toBe(1);

        // Batter 2: 0 runs, 1 ball (wicket)
        const batter2 = stats.find((s: any) => s.id === 2);
        expect(batter2.runs).toBe(0);
        expect(batter2.balls).toBe(1);
    });

    test('calculateBowlingStats should aggregate wickets correctly', () => {
        const stats = calculateBowlingStats(mockBallEvents) as any[];
        expect(stats).toHaveLength(1);

        const bowler1 = stats[0];
        expect(bowler1.runs).toBe(5);
        expect(bowler1.wickets).toBe(1);
        expect(bowler1.balls).toBe(3);
        // 3 balls = 0.3 overs
        expect(bowler1.overs).toBe(0.3);
    });
});
