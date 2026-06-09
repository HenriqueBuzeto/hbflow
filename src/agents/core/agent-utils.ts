export const generateExecutionId = (): string => {
  return `exec-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
};

export const truncateText = (text: string, maxLength = 100): string => {
  if (!text) return "";
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength)}...`;
};

export const delay = (ms: number): Promise<void> => {
  return new Promise((resolve) => setTimeout(resolve, ms));
};
