// M0 test screen: proves code → cloud build → phone → Firestore works.
// Replaced by the real Home screen in M1.

import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { formatRupees } from '@/logic/format';
import { readHealthMessage } from '@/services/health';

export default function ConnectionCheck() {
  const [status, setStatus] = useState({ state: 'loading' });

  useEffect(() => {
    readHealthMessage()
      .then((message) => setStatus({ state: 'ok', message }))
      .catch((error) => setStatus({ state: 'error', message: error.message }));
  }, []);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Trip Manager</Text>
      {status.state === 'loading' && <ActivityIndicator color="#0F766E" />}
      {status.state === 'ok' && <Text style={styles.ok}>{status.message}</Text>}
      {status.state === 'error' && (
        <Text style={styles.error}>Couldn’t reach Firestore: {status.message}</Text>
      )}
      <Text style={styles.sample}>Format check: {formatRupees(100000)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    padding: 24,
    backgroundColor: '#F8FAFC',
  },
  title: { fontSize: 22, fontWeight: '500', color: '#0F172A' },
  ok: { fontSize: 16, color: '#0F766E' },
  error: { fontSize: 14, color: '#B91C1C', textAlign: 'center' },
  sample: { fontSize: 13, color: '#64748B' },
});
