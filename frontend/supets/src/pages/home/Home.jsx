import { Layout } from "@/components/layout/Layout";
import  { UltimasOcorrencias }  from "@/components/ocorrencia/UltimasOcorrencias";
import { Box, Button, Card, Flex, Stack, Text } from "@chakra-ui/react";

export function Home() {

    return (
        <Layout>
            <UltimasOcorrencias />
        </Layout>
    );
}
