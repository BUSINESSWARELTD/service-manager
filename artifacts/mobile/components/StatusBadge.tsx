import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { STATUS_COLORS } from "@/constants/colors";

type Props = {
  status: string;
  size?: "sm" | "md" | "lg";
};

export function StatusBadge({ status, size = "md" }: Props) {
  const color = STATUS_COLORS[status as keyof typeof STATUS_COLORS] || STATUS_COLORS.received;

  const sizeStyles = {
    sm: { px: 8, py: 3, fontSize: 11, radius: 8 },
    md: { px: 10, py: 5, fontSize: 13, radius: 10 },
    lg: { px: 14, py: 7, fontSize: 15, radius: 12 },
  }[size];

  return (
    <View
      style={[
        styles.badge,
        {
          backgroundColor: color.bg,
          paddingHorizontal: sizeStyles.px,
          paddingVertical: sizeStyles.py,
          borderRadius: sizeStyles.radius,
        },
      ]}
    >
      <Text
        style={[
          styles.text,
          {
            fontSize: sizeStyles.fontSize,
            color: color.text,
          },
        ]}
      >
        {color.label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignSelf: "flex-start",
  },
  text: {
    fontFamily: "Inter_600SemiBold",
  },
});
