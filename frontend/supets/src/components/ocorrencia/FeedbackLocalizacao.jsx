import { Text } from "@chakra-ui/react";

const MENSAGENS = {
    negada: "Permissão de localização negada. Tente novamente após ajustar a permissão, ou use o mapa/latitude e longitude.",
    indisponivel: "Localização indisponível. Tente novamente ou informe latitude e longitude manualmente.",
    tempoEsgotado: "O tempo para obter a localização esgotou. Tente novamente ou informe latitude e longitude manualmente.",
};

export function FeedbackLocalizacao({ situacao }) {
    return MENSAGENS[situacao] ? <Text role="status" fontSize="sm">{MENSAGENS[situacao]}</Text> : null;
}
