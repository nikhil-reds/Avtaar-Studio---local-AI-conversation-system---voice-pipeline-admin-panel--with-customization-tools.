const sentenceEnd = /[.!?。！？](?:["'”’)]*)?(?:\s|$)/;

/** Buffers streamed model tokens until there is a speakable sentence. */
export class SentenceBuffer {
  private value = "";

  push(token: string): string[] {
    this.value += token;
    const sentences: string[] = [];
    let match: RegExpMatchArray | null;
    while ((match = this.value.match(sentenceEnd))) {
      const end = match.index! + match[0].length;
      const sentence = this.value.slice(0, end).trim();
      this.value = this.value.slice(end);
      if (sentence) sentences.push(sentence);
    }
    // Do not wait for a final period on long answers. Soft punctuation and a
    // short maximum chunk let TTS begin while the model is still streaming.
    if (this.value.length >= 80) {
      const soft = Math.max(this.value.lastIndexOf(", ", 100), this.value.lastIndexOf("; ", 100), this.value.lastIndexOf(": ", 100));
      const split = soft > 30 ? soft + 1 : this.value.lastIndexOf(" ", 80);
      if (split > 40) {
        sentences.push(this.value.slice(0, split).trim());
        this.value = this.value.slice(split + 1);
      }
    }
    return sentences;
  }

  flush(): string { const result = this.value.trim(); this.value = ""; return result; }
  clear(): void { this.value = ""; }
}
