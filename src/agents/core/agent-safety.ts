export const checkContentSafety = (text: string): { safe: boolean; reason?: string } => {
  const lower = (text || '').toLowerCase();
  
  // Basic heuristics for sql injection, prompt injection or offensive words in simulation
  const blockedPhrases = [
    "drop table", 
    "delete from", 
    "select * from", 
    "ignore all previous instructions", 
    "you are now a", 
    "sistema hacker"
  ];
  
  for (const phrase of blockedPhrases) {
    if (lower.includes(phrase)) {
      return { 
        safe: false, 
        reason: `Tentativa de injeção ou termo suspeito detectado: "${phrase}"` 
      };
    }
  }

  return { safe: true };
};
