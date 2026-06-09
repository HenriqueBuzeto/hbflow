export const queryKnowledgeBase = async (query: string): Promise<string[]> => {
  const q = (query || '').toLowerCase();
  
  if (q.includes('horário') || q.includes('funcionamento') || q.includes('horas')) {
    return [
      'Configuração: Horário de atendimento oficial da loja: Segunda a Sexta das 09h às 18h, Sábados das 09h às 13h. Atendimento fechado aos domingos e feriados.'
    ];
  }
  if (q.includes('pagamento') || q.includes('pix') || q.includes('boleto')) {
    return [
      'Configuração: Chave PIX oficial CNPJ: 12.345.678/0001-99. Link de checkout para cartões de crédito parcelados em até 10x sem juros.'
    ];
  }
  if (q.includes('garantia') || q.includes('defeito') || q.includes('quebrou') || q.includes('haste')) {
    return [
      'Configuração: Garantia legal de 90 dias mais garantia estendida de 9 meses (total 1 ano) para defeitos de fabricação em armações Ray-Ban e lentes graduadas.'
    ];
  }
  
  return [
    'Configuração: Política geral - Caso necessite de falar com um atendente humano, a triagem irá direcionar o chamado para a fila correspondente.'
  ];
};
