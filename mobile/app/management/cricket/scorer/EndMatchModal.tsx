import React, { useState } from 'react';
import { View, StyleSheet, Alert } from 'react-native';
import { Modal, Portal, Text, Button, Card, RadioButton } from 'react-native-paper';

interface EndMatchModalProps {
    visible: boolean;
    onDismiss: () => void;
    onEnd: (result: any) => void;
    teamA: any;
    teamB: any;
    players: any[];
}

export default function EndMatchModal({ visible, onDismiss, onEnd, teamA, teamB, players }: EndMatchModalProps) {
    const [step, setStep] = useState(1); // 1: Winner, 2: MoM
    const [winnerId, setWinnerId] = useState<string | null>(null);
    const [momId, setMomId] = useState<string | null>(null);

    const handleNext = () => {
        if (step === 1) {
            if (!winnerId) {
                Alert.alert('Selection Required', 'Please select a winning team.');
                return;
            }
            setStep(2);
        } else {
            if (!momId) {
                // MoM optional? Let's say yes for now or force it.
                // Alert.alert('Selection Required', 'Please select Man of the Match.');
                // return;
            }
            onEnd({ winning_team_id: winnerId, man_of_the_match_id: momId });
        }
    };

    return (
        <Portal>
            <Modal visible={visible} onDismiss={onDismiss} contentContainerStyle={styles.container}>
                <Card>
                    <Card.Title title={step === 1 ? "Match Result" : "Man of the Match"} />
                    <Card.Content>
                        {step === 1 && (
                            <RadioButton.Group onValueChange={value => setWinnerId(value)} value={winnerId || ''}>
                                <RadioButton.Item label={teamA?.name} value={teamA?.id?.toString()} />
                                <RadioButton.Item label={teamB?.name} value={teamB?.id?.toString()} />
                                <RadioButton.Item label="Draw / Tie" value="0" />
                            </RadioButton.Group>
                        )}

                        {step === 2 && (
                            <View>
                                <Text style={{marginBottom: 10}}>Who was the Player of the Match?</Text>
                                {/* Simple list for now, ideally search */}
                                <View style={{flexDirection: 'row', flexWrap: 'wrap'}}>
                                    {players.slice(0, 10).map((p:any) => (
                                        <Button 
                                            key={p.id} 
                                            mode={momId === p.id.toString() ? 'contained' : 'outlined'} 
                                            onPress={() => setMomId(p.id.toString())}
                                            compact
                                            style={{margin: 2}}
                                        >
                                            {p.name || p.user?.name}
                                        </Button>
                                    ))}
                                </View>
                            </View>
                        )}
                    </Card.Content>
                    <Card.Actions>
                        <Button onPress={onDismiss}>Cancel</Button>
                        <Button onPress={handleNext}>{step === 1 ? "Next" : "Finish Match"}</Button>
                    </Card.Actions>
                </Card>
            </Modal>
        </Portal>
    );
}

const styles = StyleSheet.create({
    container: { padding: 20, margin: 20 }
});
