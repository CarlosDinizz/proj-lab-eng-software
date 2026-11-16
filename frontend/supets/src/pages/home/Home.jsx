import { Carrousel } from "@/components/layout/carrousel/Carrousel";
import { Layout } from "@/components/layout/Layout";
import  { UltimasOcorrencias }  from "@/components/ocorrencia/UltimasOcorrencias";
import { AtalhosOcorrencia } from "@/components/ocorrencia/AtalhosOcorrencia";
import { AtalhosCampanha } from "@/components/campanha/AtalhosCampanha";
import { useAuth } from "@/auth/useAuth";
import ajude from "../../assets/home/ajude-um-animal.jpeg";
import fortaleca from "../../assets/home/fortaleca-a-rede-animal.jpeg";

export function Home() {
    const { usuario } = useAuth();
    // Nos wireframes, a ONG vê Campanhas primeiro; o cidadão, Ocorrências
    const ongPrimeiro = usuario?.perfil === "ONG";

    return (
        <>
            <Carrousel images={getImages()} resolucao={35 / 9}/>
            <Layout>
                {ongPrimeiro && <AtalhosCampanha />}
                <AtalhosOcorrencia />
                {!ongPrimeiro && <AtalhosCampanha />}
                <UltimasOcorrencias />
            </Layout>
        </>
    );
}

function getImages() {
    return [ajude, fortaleca];
}