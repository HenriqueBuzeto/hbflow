import { AgentPriority, HBAgent } from './agent.types';

export const sortAgentsByPriority = (agents: HBAgent[]): HBAgent[] => {
  const priorityOrder = {
    [AgentPriority.CRITICAL]: 0,
    [AgentPriority.HIGH]: 1,
    [AgentPriority.MEDIUM]: 2,
    [AgentPriority.LOW]: 3,
  };
  return [...agents].sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);
};
