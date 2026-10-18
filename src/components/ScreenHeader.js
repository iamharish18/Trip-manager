import { useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { IconButton, Text } from 'react-native-paper';

// Top bar with an optional back arrow and something on the right.
export default function ScreenHeader({ title, back = false, right = null }) {
  const router = useRouter();
  return (
    <View style={styles.row}>
      {back && (
        <IconButton
          icon="arrow-left"
          accessibilityLabel="Back"
          onPress={() => router.back()}
          style={styles.back}
        />
      )}
      <Text variant="titleLarge" style={styles.title}>
        {title}
      </Text>
      {right}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', minHeight: 48, marginBottom: 12 },
  back: { marginLeft: -8, marginRight: 4 },
  title: { flex: 1 },
});
