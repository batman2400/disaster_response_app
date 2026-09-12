/**
 * Dynamic emergency distress audio generator for testing and demos.
 * Generates a valid, playable WAV Data URL without requiring external media assets.
 */
export function generateDemoAudioDataUrl(durationSeconds = 2.5): string {
  const sampleRate = 8000;
  const numSamples = Math.floor(sampleRate * durationSeconds);
  const wavBuffer = new ArrayBuffer(44 + numSamples);
  const view = new DataView(wavBuffer);
  const writeString = (offset: number, str: string) => {
    for (let i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i));
  };
  writeString(0, "RIFF");
  view.setUint32(4, 36 + numSamples, true);
  writeString(8, "WAVE");
  writeString(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true); // PCM
  view.setUint16(22, 1, true); // Mono
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate, true); // Byte rate (8-bit mono)
  view.setUint16(32, 1, true); // Block align
  view.setUint16(34, 8, true); // 8 bits per sample
  writeString(36, "data");
  view.setUint32(40, numSamples, true);

  const u8 = new Uint8Array(wavBuffer, 44, numSamples);
  for (let i = 0; i < numSamples; i++) {
    const t = i / sampleRate;
    const voice = Math.sin(2 * Math.PI * 340 * t) * 0.35 + Math.sin(2 * Math.PI * 680 * t) * 0.15;
    const envelope = Math.sin((Math.PI * t) / durationSeconds);
    u8[i] = Math.floor((voice * envelope + 1) * 127.5);
  }

  if (typeof Buffer !== "undefined") {
    return `data:audio/wav;base64,${Buffer.from(wavBuffer).toString("base64")}`;
  }
  let binary = "";
  const bytes = new Uint8Array(wavBuffer);
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return `data:audio/wav;base64,${btoa(binary)}`;
}

export const DEMO_SAMPLE_AUDIO_URL = generateDemoAudioDataUrl(2.5);
