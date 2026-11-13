import { useEffect } from "react";
import { Link, Text } from "@chakra-ui/react";
import { Link as RouterLink } from "react-router-dom";
import { CircleMarker, MapContainer, Popup, TileLayer, useMap, useMapEvents } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { STATUS } from "./ocorrencias";

// Cores das bolinhas no mapa, uma por status
const CORES = { ABERTA: "#dd6b20", EM_ANDAMENTO: "#3182ce", RESOLVIDA: "#38a169" };

/** Mapa base do OpenStreetMap (gratuito; a atribuição é obrigatória). */
function MapaBase({ centro, zoom = 13, altura = "400px", children }) {
    return (
        <MapContainer center={[centro.lat, centro.lon]} zoom={zoom} style={{ height: altura, width: "100%", borderRadius: "8px" }}>
            <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <Recentralizar centro={centro} />
            {children}
        </MapContainer>
    );
}

/** O MapContainer só lê o centro na primeira vez; isto move o mapa quando o centro muda. */
function Recentralizar({ centro }) {
    const mapa = useMap();
    useEffect(() => {
        mapa.setView([centro.lat, centro.lon]);
    }, [mapa, centro.lat, centro.lon]);
    return null;
}

/** UC003: mostra as ocorrências como bolinhas coloridas; clicar abre um resumo com link para os detalhes. */
export function MapaOcorrencias({ ocorrencias, centro, voceEstaAqui }) {
    return (
        <MapaBase centro={centro} zoom={12}>
            {voceEstaAqui && (
                <CircleMarker center={[voceEstaAqui.lat, voceEstaAqui.lon]} radius={7}
                    pathOptions={{ color: "#6b46c1", fillColor: "#6b46c1", fillOpacity: 1 }}>
                    <Popup>Você está aqui</Popup>
                </CircleMarker>
            )}
            {ocorrencias.map((ocorrencia) => (
                <CircleMarker key={ocorrencia.id} center={[ocorrencia.lat, ocorrencia.lon]} radius={10}
                    pathOptions={{ color: CORES[ocorrencia.status], fillColor: CORES[ocorrencia.status], fillOpacity: 0.6 }}>
                    <Popup>
                        <Text fontWeight="bold">{ocorrencia.titulo}</Text>
                        <Text>{STATUS[ocorrencia.status]?.texto} · {ocorrencia.tipoOcorrencia}</Text>
                        <Link asChild colorPalette="purple"><RouterLink to={`/ocorrencias/${ocorrencia.id}`}>Ver detalhes</RouterLink></Link>
                    </Popup>
                </CircleMarker>
            ))}
        </MapaBase>
    );
}

/** Marca um único ponto (tela de detalhes). */
export function MapaPonto({ ponto, status }) {
    return (
        <MapaBase centro={ponto} zoom={15} altura="250px">
            <CircleMarker center={[ponto.lat, ponto.lon]} radius={10}
                pathOptions={{ color: CORES[status], fillColor: CORES[status], fillOpacity: 0.6 }} />
        </MapaBase>
    );
}

/** UC001: a pessoa clica no mapa para marcar onde o animal está. */
export function SeletorDeLocal({ ponto, centro, onChange }) {
    return (
        <MapaBase centro={centro} zoom={14} altura="300px">
            <CapturarClique onChange={onChange} />
            {ponto && (
                <CircleMarker center={[ponto.lat, ponto.lon]} radius={10}
                    pathOptions={{ color: "#6b46c1", fillColor: "#6b46c1", fillOpacity: 0.6 }} />
            )}
        </MapaBase>
    );
}

function CapturarClique({ onChange }) {
    useMapEvents({
        click: (evento) => onChange({ lat: evento.latlng.lat, lon: evento.latlng.lng }),
    });
    return null;
}
