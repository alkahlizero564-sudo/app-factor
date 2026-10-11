import React, { useCallback, useState } from "react";
import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { WebView } from "react-native-webview";
import { loadGeneration } from "../services/store";
import { GenerationResult } from "../services/generate";

export default function PreviewScreen() {
  const [result, setResult] = useState<GenerationResult | null>(null);
  const [activeFile, setActiveFile] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      loadGeneration().then((r) => {
        setResult(r);
        if (r) {
          const html = r.files.find((f) => f.path.endsWith(".html"));
          setActiveFile(html ? html.path : r.files[0]?.path ?? null);
        }
      });
    }, [])
  );

  if (!result) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyText}>لسه مفيش حاجة اتعملت. روح لتبويب "الإنشاء" الأول.</Text>
      </View>
    );
  }

  const file = result.files.find((f) => f.path === activeFile);
  const isHtml = file?.path.endsWith(".html");

  return (
    <View style={{ flex: 1 }}>
      <ScrollView horizontal style={styles.tabBar} contentContainerStyle={{ paddingHorizontal: 8 }}>
        {result.files.map((f) => (
          <TouchableOpacity
            key={f.path}
            style={[styles.fileTab, activeFile === f.path && styles.fileTabActive]}
            onPress={() => setActiveFile(f.path)}
          >
            <Text style={activeFile === f.path ? styles.fileTabTextActive : styles.fileTabText}>{f.path}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {isHtml && file ? (
        <WebView originWhitelist={["*"]} source={{ html: file.content }} style={{ flex: 1 }} />
      ) : (
        <ScrollView style={styles.codeBox}>
          <Text style={styles.codeText}>{file?.content}</Text>
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  empty: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24 },
  emptyText: { textAlign: "center", color: "#666", lineHeight: 22 },
  tabBar: { maxHeight: 44, borderBottomWidth: 1, borderColor: "#eee" },
  fileTab: { paddingVertical: 10, paddingHorizontal: 14, marginRight: 4 },
  fileTabActive: { borderBottomWidth: 2, borderColor: "#111" },
  fileTabText: { color: "#888" },
  fileTabTextActive: { color: "#111", fontWeight: "700" },
  codeBox: { flex: 1, backgroundColor: "#0d0d0d", padding: 12 },
  codeText: { color: "#d4d4d4", fontFamily: "monospace", fontSize: 12 },
});
