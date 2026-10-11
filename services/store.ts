import AsyncStorage from "@react-native-async-storage/async-storage";
import { GenerationResult } from "./generate";

const KEY = "LAST_GENERATION";

export async function saveGeneration(result: GenerationResult) {
  await AsyncStorage.setItem(KEY, JSON.stringify(result));
}

export async function loadGeneration(): Promise<GenerationResult | null> {
  const raw = await AsyncStorage.getItem(KEY);
  return raw ? JSON.parse(raw) : null;
}
