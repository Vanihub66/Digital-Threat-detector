"use client";

import { useState } from "react";

export interface FeedbackItem {
  id: string;
  category: string;
  module: string;
  message: string;
  created_at: string;
}

const KEY = "threatdetector.feedback.v1";

function read(): FeedbackItem[] {
  try {
    const raw = localStorage.getItem(KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? (parsed as FeedbackItem[]) : [];
  } catch {
    return [];
  }
}

/**
 * Feedback is kept in this browser only — there is no feedback endpoint yet.
 * Users can download it as JSON to share with the project team.
 * Only mount on the client (after the app store has hydrated).
 */
export function useLocalFeedback() {
  const [items, setItems] = useState<FeedbackItem[]>(read);

  const add = (f: Omit<FeedbackItem, "id" | "created_at">) => {
    const next = [{ ...f, id: crypto.randomUUID(), created_at: new Date().toISOString() }, ...items].slice(0, 100);
    setItems(next);
    try {
      localStorage.setItem(KEY, JSON.stringify(next));
    } catch {
      // ignore quota / private mode errors
    }
  };

  const download = () => {
    const blob = new Blob([JSON.stringify(items, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `threatdetector-feedback-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return { items, add, download };
}
