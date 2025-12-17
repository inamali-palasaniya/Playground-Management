import React, { useState } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Modal, Portal, Text, Button, RadioButton, Menu, Divider } from 'react-native-paper';

interface MatchSetupProps {
    visible: boolean;
    onDismiss: () => void;
    teamA: any;
    teamB: any;
    onStart: (data: any) => void;
}

export default function MatchSetupModal({ visible, onDismiss, teamA, teamB, onStart }: MatchSetupProps) {
    const [tossWinner, setTossWinner] = useState<number | null>(null);
    const [tossDecision, setTossDecision] = useState<string>('BAT');
    
    // Players (We need full lists passed down or fetched. Assuming passed for now to keep it simple, or we fetch here)
    // Actually, fetching here is safest. But for UI mock, let's assume teamA and teamB have players.
    const [striker, setStriker] = useState<any>(null);
    const [nonStriker, setNonStriker] = useState<any>(null);
    const [bowler, setBowler] = useState<any>(null);

    // Menus
    const [strikerMenu, setStrikerMenu] = useState(false);
    const [nonStrikerMenu, setNonStrikerMenu] = useState(false);
    const [bowlerMenu, setBowlerMenu] = useState(false);

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
        onStart({
            tossWinnerId: tossWinner,
            tossDecision,
            strikerId: striker.id,
            nonStrikerId: nonStriker.id,
            bowlerId: bowler.id
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
                                    <RadioButton value={teamA?.id.toString()} />
                                    <Text>{teamA?.name}</Text>
                                </View>
                                <View style={styles.radioItem}>
                                    <RadioButton value={teamB?.id.toString()} />
                                    <Text>{teamB?.name}</Text>
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
                            <Menu
                                visible={strikerMenu}
                                onDismiss={() => setStrikerMenu(false)}
                                anchor={<Button mode="outlined" onPress={() => setStrikerMenu(true)} style={styles.input}>{striker ? striker.user.name : 'Select Striker'}</Button>}
                            >
                                {battingTeam?.players.map((p: any) => (
                                    <Menu.Item key={p.id} onPress={() => { setStriker(p); setStrikerMenu(false); }} title={p.user.name} />
                                ))}
                            </Menu>

                            <Menu
                                visible={nonStrikerMenu}
                                onDismiss={() => setNonStrikerMenu(false)}
                                anchor={<Button mode="outlined" onPress={() => setNonStrikerMenu(true)} style={styles.input}>{nonStriker ? nonStriker.user.name : 'Select Non-Striker'}</Button>}
                            >
                                {battingTeam?.players.map((p: any) => (
                                    <Menu.Item key={p.id} onPress={() => { setNonStriker(p); setNonStrikerMenu(false); }} title={p.user.name} />
                                ))}
                            </Menu>

                            <Text variant="titleMedium" style={{ marginTop: 10 }}>Opening Bowler ({bowlingTeam?.name})</Text>
                            <Menu
                                visible={bowlerMenu}
                                onDismiss={() => setBowlerMenu(false)}
                                anchor={<Button mode="outlined" onPress={() => setBowlerMenu(true)} style={styles.input}>{bowler ? bowler.user.name : 'Select Bowler'}</Button>}
                            >
                                {bowlingTeam?.players.map((p: any) => (
                                    <Menu.Item key={p.id} onPress={() => { setBowler(p); setBowlerMenu(false); }} title={p.user.name} />
                                ))}
                            </Menu>
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
