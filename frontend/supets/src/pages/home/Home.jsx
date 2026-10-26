import { Carrousel } from "@/components/layout/carrousel/Carrousel";
import { Layout } from "@/components/layout/Layout";
import  { UltimasOcorrencias }  from "@/components/ocorrencia/UltimasOcorrencias";
import ajude from "../../assets/home/ajude-um-animal.jpeg";
import fortaleca from "../../assets/home/fortaleca-a-rede-animal.jpeg";

export function Home() {

    return (
        <>
            <Carrousel images={getImages()} resolucao={35 / 9}/>
            <Layout>
                <UltimasOcorrencias />
            </Layout>
        </>
    );
}

function getImages() {
    return [ajude, fortaleca];
}
