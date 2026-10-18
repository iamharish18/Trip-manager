// Donut chart: one arc per segment, with something in the centre.
// `segments` are [{ key, value, color }]; arcs start at the top, clockwise.

import { StyleSheet, View } from 'react-native';
import Svg, { Circle, G } from 'react-native-svg';

import { useAppTheme } from '@/theme';

// Where each arc starts along the circle and how long it is.
function arcsFor(segments, circumference) {
  const total = segments.reduce((sum, s) => sum + s.value, 0);
  // A thin gap between arcs, only when there is more than one.
  const gap = segments.length > 1 ? 2 : 0;
  const arcs = [];
  let offset = 0;
  for (const segment of segments) {
    const length = total > 0 ? (segment.value / total) * circumference : 0;
    arcs.push({
      key: segment.key,
      color: segment.color,
      dash: Math.max(length - gap, 0),
      offset,
    });
    offset += length;
  }
  return arcs;
}

export default function DonutChart({ segments, size = 180, thickness = 26, children }) {
  const theme = useAppTheme();
  const radius = (size - thickness) / 2;
  const circumference = 2 * Math.PI * radius;
  const arcs = arcsFor(segments, circumference);

  return (
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size}>
        <G rotation={-90} origin={`${size / 2}, ${size / 2}`}>
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={theme.app.border}
            strokeWidth={thickness}
            fill="none"
          />
          {arcs.map((arc) => (
            <Circle
              key={arc.key}
              cx={size / 2}
              cy={size / 2}
              r={radius}
              stroke={arc.color}
              strokeWidth={thickness}
              strokeDasharray={`${arc.dash} ${circumference - arc.dash}`}
              strokeDashoffset={-arc.offset}
              fill="none"
            />
          ))}
        </G>
      </Svg>
      <View style={styles.center} pointerEvents="none">
        {children}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center' },
});
