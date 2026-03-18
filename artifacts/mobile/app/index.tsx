import React, { useEffect } from "react";
import { ActivityIndicator, View } from "react-native";
import { router } from "expo-router";
import { useAuth } from "@/context/AuthContext";
import Colors from "@/constants/colors";

export default function Index() {
  const { technician, isLoading } = useAuth();

  useEffect(() => {
    if (!isLoading) {
      if (technician) {
        router.replace("/(tabs)");
      } else {
        router.replace("/login");
      }
    }
  }, [technician, isLoading]);

  return (
    <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: Colors.light.background }}>
      <ActivityIndicator size="large" color={Colors.brand.primary} />
    </View>
  );
}
