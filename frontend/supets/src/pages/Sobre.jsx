import { Button, Heading, Stack, Text } from "@chakra-ui/react";
import { Link } from "react-router-dom";
import { Layout } from "@/components/layout/Layout";

export function Sobre() {
    return <Layout><Stack gap="5" maxW="3xl">
        <Heading as="h1">Sobre o SuPets</Heading>
        <Text>O SuPets conecta cidadãos e ONGs na proteção animal para registrar e acompanhar ocorrências e organizar campanhas.</Text>
        <Heading as="h2" size="md">Cidadãos</Heading>
        <Text>Podem registrar ocorrências com endereço, localização e informações do animal, editar suas ocorrências abertas e participar de campanhas.</Text>
        <Heading as="h2" size="md">ONGs</Heading>
        <Text>Podem criar e atualizar suas campanhas. Ambos os perfis podem consultar ocorrências, assumir o atendimento e acompanhar a resolução conforme sua responsabilidade.</Text>
        <Text>O site não é um serviço de emergência e o cadastro não comprova identidade nem vínculo com órgãos públicos. Em demonstrações, use dados fictícios; a validação de CPF/CNPJ verifica somente o formato e os dígitos verificadores.</Text>
        <Button asChild colorPalette="orange" alignSelf="start"><Link to="/cadastro">Cadastrar-se</Link></Button>
    </Stack></Layout>;
}
