export type NarrationResult = { audioUrl: string; cached: boolean } | { audioUrl: null; cached: false; fallback: true };

export async function narratePublicSummary(summary: string, cacheKey: string): Promise<NarrationResult> {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  const voiceId = process.env.ELEVENLABS_VOICE_ID;
  if (!apiKey || !voiceId || !summary.trim()) return { audioUrl: null, cached: false, fallback: true };
  try {
    const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, { method: "POST", headers: { "xi-api-key": apiKey, "Content-Type": "application/json", Accept: "audio/mpeg" }, body: JSON.stringify({ text: summary, model_id: "eleven_multilingual_v2" }) });
    if (!response.ok) return { audioUrl: null, cached: false, fallback: true };
    // Audio bytes should be uploaded through the existing storage helper using cacheKey.
    // This adapter intentionally returns a fallback until a project storage URL is available.
    void cacheKey;
    return { audioUrl: null, cached: false, fallback: true };
  } catch { return { audioUrl: null, cached: false, fallback: true }; }
}
