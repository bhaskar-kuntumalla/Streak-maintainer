import { Fragment } from 'react';
import { View, Text } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { useTheme } from '@/theme/ThemeProvider';

export type RingSpec = { value: number; color: string; label: string; detail: string };

/** Concentric activity rings. Outer ring first. Values are 0 to 1. */
export function ActivityRings({ rings, size = 150, stroke = 12 }: { rings: RingSpec[]; size?: number; stroke?: number }) {
  const { palette } = useTheme();
  const center = size / 2;
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 18 }}>
      <Svg width={size} height={size}>
        {rings.map((r, i) => {
          const radius = center - stroke / 2 - i * (stroke + 6);
          const circumference = 2 * Math.PI * radius;
          const v = Math.min(1, Math.max(0, r.value));
          return (
            <Fragment key={r.label}>
              <Circle cx={center} cy={center} r={radius} stroke={palette.border} strokeWidth={stroke} fill="none" />
              <Circle
                cx={center}
                cy={center}
                r={radius}
                stroke={r.color}
                strokeWidth={stroke}
                fill="none"
                strokeLinecap="round"
                strokeDasharray={`${circumference * v} ${circumference}`}
                transform={`rotate(-90 ${center} ${center})`}
              />
            </Fragment>
          );
        })}
      </Svg>
      <View style={{ gap: 10, flex: 1 }}>
        {rings.map((r) => (
          <View key={r.label}>
            <Text style={{ color: r.color, fontSize: 12, fontWeight: '600' }}>{r.label}</Text>
            <Text style={{ color: palette.text, fontSize: 18, fontWeight: '700' }}>{r.detail}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}
