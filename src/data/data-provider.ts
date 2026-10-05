import { ref, get } from "firebase/database";
import { db } from "@/firebase/config";

export type Rain = 0 | 1;

export interface LiveReading {
  temperature: number;
  humidity: number;
  feelsLike: number;
  airQuality: string;
  rain: Rain;
  timestamp: string;
}

export interface HistoryReading {
  airQuality: string;
  date: string;
  temp: number;
  feelsLike: number;
  humidity: number;
  rain: Rain;
  time: string;
}

export interface AtmosDataProvider {
  getLiveReading(): Promise<LiveReading>;
  getHistory(): Promise<HistoryReading[]>;
}

export const firebaseDataProvider: AtmosDataProvider = {
  async getLiveReading() {
    const snapshot = await get(ref(db, "live"));

    if (!snapshot.exists()) {
      throw new Error("No live data found in Firebase.");
    }

    const data = snapshot.val();

    return {
      temperature: Number(data.temp),
      humidity: Number(data.hum),
      feelsLike: Number(data.feels),
      airQuality: String(data.airQuality),
      rain: Number(data.rain) as Rain,
      timestamp: new Date().toISOString(),
    };
  },

  async getHistory() {
    const snapshot = await get(ref(db, "history"));

    if (!snapshot.exists()) {
      return [];
    }

    const data = snapshot.val();

    return Object.values(data).map((item: any) => ({
      airQuality: String(item.airQuality),
      date: String(item.date),
      temp: Number(item.temp),
      feelsLike: Number(item.feelsLike),
      humidity: Number(item.humidity),
      rain: Number(item.rain) as Rain,
      time: String(item.time),
    }));
  },
};