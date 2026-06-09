export interface TokenCost {
  inputTokens: number;
  outputTokens: number;
  estimatedCost: number; // USD
}

export const estimateTokens = (text: string): number => {
  // Rough estimate: ~4 characters per token
  return Math.ceil((text || '').length / 4);
};

export const calculateCost = (inputTokens: number, outputTokens: number, model: 'gpt-4o' | 'gpt-3.5' = 'gpt-4o'): TokenCost => {
  // Rates per 1M tokens:
  // gpt-4o: Input $5.00, Output $15.00
  // gpt-3.5: Input $0.50, Output $1.50
  const inputRate = model === 'gpt-4o' ? 5.00 / 1000000 : 0.50 / 1000000;
  const outputRate = model === 'gpt-4o' ? 15.00 / 1000000 : 1.50 / 1000000;

  const estimatedCost = (inputTokens * inputRate) + (outputTokens * outputRate);

  return {
    inputTokens,
    outputTokens,
    estimatedCost,
  };
};
