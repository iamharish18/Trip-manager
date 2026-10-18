import { StyleSheet, View } from 'react-native';
import { Icon } from 'react-native-paper';

// A category's icon on a light tint of its colour.
export default function CategoryIcon({ category, size = 36 }) {
  return (
    <View
      style={[
        styles.box,
        {
          width: size,
          height: size,
          borderRadius: size * 0.28,
          // 8-digit hex: the category colour at about 13% opacity.
          backgroundColor: `${category.color}22`,
        },
      ]}
    >
      <Icon source={category.icon} size={size * 0.55} color={category.color} />
    </View>
  );
}

const styles = StyleSheet.create({
  box: { alignItems: 'center', justifyContent: 'center' },
});
