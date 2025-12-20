import React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Modal, Portal, Text, Button, RadioButton, Divider } from 'react-native-paper';
import SelectPlayerModal from './SelectPlayerModal';

interface MatchSetupProps {
    visible: boolean;
    onDismiss: () => void;
    teamA: any;
    teamB: any;
    onStart: (data: any) => void;
    initialData?: any;
}

export default function MatchSetupModal({ visible, onDismiss, teamA, teamB, onStart, initialData }: MatchSetupProps) {
    const [tossWinner, setTossWinner] = React.useState<number | null>(null);
    const [tossDecision, setTossDecision] = React.useState<string>('BAT');

    const [striker, setStriker] = React.useState<any>(null);
    const [nonStriker, setNonStriker] = React.useState<any>(null);
    const [bowler, setBowler] = React.useState<any>(null);

    React.useEffect(() => {
        if (visible && initialData) {
            setTossWinner(initialData.toss_winner_id);
            setTossDecision(initialData.toss_decision || 'BAT');

            // Find full player objects from teams
            const allPlayers = [...(teamA?.players || []), ...(teamB?.players || [])];
            setStriker(allPlayers.find(p => (p.user?.id || p.id) === initialData.current_striker_id));
            setNonStriker(allPlayers.find(p => (p.user?.id || p.id) === initialData.current_non_striker_id));
            setBowler(allPlayers.find(p => (p.user?.id || p.id) === initialData.current_bowler_id));
        }
    }, [visible, initialData]);

    // Modals
    const [strikerModal, setStrikerModal] = React.useState(false);
    const [nonStrikerModal, setNonStrikerModal] = React.useState(false);
    const [bowlerModal, setBowlerModal] = React.useState(false);

    const getBattingTeam = () => {
        if (!tossWinner) return null;
        if (tossDecision === 'BAT') return tossWinner === teamA.id ? teamA : teamB;
        return tossWinner === teamA.id ? teamB : teamA;
    };

    const getBowlingTeam = () => {
        if (!tossWinner) return null;
        if (tossDecision === 'BAT') return tossWinner === teamA.id ? teamB : teamA;
        return tossWinner === teamA.id ? teamA : teamB;
    };

    const handleStart = () => {
        if (!tossWinner || !striker || !nonStriker || !bowler) return;

        // Validation
        const sId = striker.user?.id || striker.user_id || striker.id;
        const nsId = nonStriker.user?.id || nonStriker.user_id || nonStriker.id;
        const bId = bowler.user?.id || bowler.user_id || bowler.id;

        if (sId === nsId) {
            alert('Striker and Non-Striker cannot be the same player.');
            return;
        }

        // Check if bowler is in batting team
        // battingTeam is derived from state
        if (battingTeam) {
            const bowlerInBatting = battingTeam.players?.find((p: any) => (p.user?.id || p.id) === bId);
            if (bowlerInBatting) {
                alert('Bowler cannot be from the batting team.');
                return;
            }
        }

        onStart({
            tossWinnerId: tossWinner,
            tossDecision,
            strikerId: sId,
            nonStrikerId: nsId,
            bowlerId: bId
        });
    };

    const battingTeam = getBattingTeam();
    const bowlingTeam = getBowlingTeam();

    return (
        <Portal>
            <Modal visible={visible} onDismiss={onDismiss} contentContainerStyle={styles.container}>
                <ScrollView>
                    <Text variant="headlineSmall" style={{ marginBottom: 15, textAlign: 'center' }}>Match Setup</Text>

                    <Text variant="titleMedium">Toss Won By</Text>
                    <View style={styles.row}>
                        <RadioButton.Group onValueChange={(v) => setTossWinner(parseInt(v))} value={tossWinner?.toString() || ''}>
                            <View style={styles.radioRow}>
                                <View style={styles.radioItem}>
                                    <RadioButton value={teamA?.id?.toString() || '1'} />
                                    <Text>{teamA?.name || 'Team A'}</Text>
                                </View>
                                <View style={styles.radioItem}>
                                    <RadioButton value={teamB?.id?.toString() || '2'} />
                                    <Text>{teamB?.name || 'Team B'}</Text>
                                </View>
                            </View>
                        </RadioButton.Group>
                    </View>

                    <Text variant="titleMedium" style={{ marginTop: 10 }}>Elected To</Text>
                    <RadioButton.Group onValueChange={setTossDecision} value={tossDecision}>
                        <View style={styles.radioRow}>
                            <View style={styles.radioItem}><RadioButton value="BAT" /><Text>Bat</Text></View>
                            <View style={styles.radioItem}><RadioButton value="BOWL" /><Text>Bowl</Text></View>
                        </View>
                    </RadioButton.Group>

                    <Divider style={{ marginVertical: 15 }} />

                    {tossWinner && (
                        <>
                            <Text variant="titleMedium">Opening Batsmen ({battingTeam?.name})</Text>
                            <Button
                                mode="outlined"
                                onPress={() => setStrikerModal(true)}
                                style={styles.input}
                                icon="plus-circle-outline"
                            >
                                {striker ? (striker.user?.name || striker.name) : 'Select Striker'}
                            </Button>

                            <Button
                                mode="outlined"
                                onPress={() => setNonStrikerModal(true)}
                                style={styles.input}
                                icon="plus-circle-outline"
                            >
                                {nonStriker ? (nonStriker.user?.name || nonStriker.name) : 'Select Non-Striker'}
                            </Button>

                            <Text variant="titleMedium" style={{ marginTop: 10 }}>Opening Bowler ({bowlingTeam?.name})</Text>
                            <Button
                                mode="outlined"
                                onPress={() => setBowlerModal(true)}
                                style={styles.input}
                                icon="plus-circle-outline"
                            >
                                {bowler ? (bowler.user?.name || bowler.name) : 'Select Bowler'}
                            </Button>

                            <SelectPlayerModal
                                visible={strikerModal}
                                onDismiss={() => setStrikerModal(false)}
                                title="Select Striker"
                                players={battingTeam?.players || []}
                                onSelect={(p) => { setStriker(p); setStrikerModal(false); }}
                            />
                            <SelectPlayerModal
                                visible={nonStrikerModal}
                                onDismiss={() => setNonStrikerModal(false)}
                                title="Select Non-Striker"
                                players={battingTeam?.players || []}
                                onSelect={(p) => { setNonStriker(p); setNonStrikerModal(false); }}
                            />
                            <SelectPlayerModal
                                visible={bowlerModal}
                                onDismiss={() => setBowlerModal(false)}
                                title="Select Bowler"
                                players={bowlingTeam?.players || []}
                                onSelect={(p) => { setBowler(p); setBowlerModal(false); }}
                            />
                        </>
                    )}

                    <Button
                        mode="contained"
                        onPress={handleStart}
                        style={{ marginTop: 20 }}
                        disabled={!tossWinner || !striker || !nonStriker || !bowler}
                    >
                        Start Match
                    </Button>
                </ScrollView>
            </Modal>
        </Portal>
    );
}

const styles = StyleSheet.create({
    container: { backgroundColor: 'white', padding: 20, margin: 20, borderRadius: 8, maxHeight: '90%' },
    row: { flexDirection: 'row', alignItems: 'center' },
    radioRow: { flexDirection: 'row', alignItems: 'center', gap: 20 },
    radioItem: { flexDirection: 'row', alignItems: 'center' },
    input: { marginBottom: 10, marginTop: 5 }
});
