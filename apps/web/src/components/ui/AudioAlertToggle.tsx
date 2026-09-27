"use client";

import * as React from "react";
import { Volume2, VolumeX } from "lucide-react";
import { Button } from "./Button";

/**
 * Synthesizes an emergency dual-tone alert chime using native Web Audio API.
 * Eliminates the need for external MP3/WAV assets.
 */
export function playEmergencyChime(): void {
  try {
    const AudioContextClass =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext })
        .webkitAudioContext;
    if (!AudioContextClass) return;

    const ctx = new AudioContextClass();

    // Tone 1: High alert tone (880Hz)
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = "sine";
    osc1.frequency.setValueAtTime(880, ctx.currentTime);

    gain1.gain.setValueAtTime(0.15, ctx.currentTime);
    gain1.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12);

    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(ctx.currentTime);
    osc1.stop(ctx.currentTime + 0.12);

    // Tone 2: Piercing emergency confirmation tone (1760Hz)
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = "sine";
    osc2.frequency.setValueAtTime(1760, ctx.currentTime + 0.1);

    gain2.gain.setValueAtTime(0.2, ctx.currentTime + 0.1);
    gain2.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);

    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(ctx.currentTime + 0.1);
    osc2.stop(ctx.currentTime + 0.35);

    // Clean up audio context
    setTimeout(() => {
      ctx.close().catch(() => {});
    }, 500);
  } catch {
    // AudioContext blocked by browser policy prior to interaction
  }
}

export function AudioAlertToggle() {
  const [isEnabled, setIsEnabled] = React.useState<boolean>(false);
  const [hasMounted, setHasMounted] = React.useState<boolean>(false);

  React.useEffect(() => {
    setHasMounted(true);
    const saved = localStorage.getItem("incident_pulse_audio_alerts");
    if (saved === "true") {
      setIsEnabled(true);
    }

    // Listen for incoming trigger events across the app
    const handleTriggerAlert = () => {
      const active =
        localStorage.getItem("incident_pulse_audio_alerts") === "true";
      if (active) {
        playEmergencyChime();
      }
    };

    window.addEventListener("incidentpulse:play-alert", handleTriggerAlert);
    return () => {
      window.removeEventListener(
        "incidentpulse:play-alert",
        handleTriggerAlert,
      );
    };
  }, []);

  const toggleAudio = () => {
    const nextState = !isEnabled;
    setIsEnabled(nextState);
    localStorage.setItem("incident_pulse_audio_alerts", String(nextState));
    if (nextState) {
      // Play brief test chirp on activation so user verifies sound output
      playEmergencyChime();
    }
  };

  if (!hasMounted) {
    return (
      <Button
        variant="ghost"
        size="icon"
        className="h-9 w-9 text-muted-foreground opacity-50"
      >
        <VolumeX className="h-4 w-4" />
      </Button>
    );
  }

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={toggleAudio}
      title={
        isEnabled
          ? "Emergency Audio Alerts: Active (Click to mute)"
          : "Emergency Audio Alerts: Muted (Click to enable)"
      }
      className={`relative h-9 w-9 transition-colors ${
        isEnabled
          ? "text-red-500 hover:text-red-400 hover:bg-red-500/10"
          : "text-muted-foreground hover:text-foreground"
      }`}
    >
      {isEnabled ? (
        <>
          <Volume2 className="h-4 w-4 animate-pulse" />
          <span className="absolute top-1.5 right-1.5 h-1.5 w-1.5 rounded-full bg-red-500 ring-2 ring-background" />
        </>
      ) : (
        <VolumeX className="h-4 w-4" />
      )}
    </Button>
  );
}
