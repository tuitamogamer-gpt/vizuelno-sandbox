"use client";
import { useSyncExternalStore } from "react";
function subscribeOnline(callback: () => void) { window.addEventListener("online", callback); window.addEventListener("offline", callback); return () => { window.removeEventListener("online", callback); window.removeEventListener("offline", callback); }; }
function subscribeMobile(callback: () => void) { const media = window.matchMedia("(max-width: 760px)"); media.addEventListener("change", callback); return () => media.removeEventListener("change", callback); }
export function useOnline() { return useSyncExternalStore(subscribeOnline, () => navigator.onLine, () => true); }
export function useMobile() { return useSyncExternalStore(subscribeMobile, () => window.matchMedia("(max-width: 760px)").matches, () => false); }
