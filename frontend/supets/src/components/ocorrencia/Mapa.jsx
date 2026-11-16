import { useEffect, useId, useRef, useState } from "react";
import { Box, Button, Field, Flex, Input, Link, Stack, Text } from "@chakra-ui/react";
import { Link as RouterLink } from "react-router-dom";
import { Icon } from "leaflet";
import { MapContainer, Marker, Popup, TileLayer, useMap, useMapEvents } from "react-leaflet";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";
import "leaflet/dist/leaflet.css";
import { pontoValido, STATUS } from "./ocorrencias";

const icone = new Icon({
    iconUrl: markerIcon, iconRetinaUrl: markerIcon2x, shadowUrl: markerShadow,
    iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34], shadowSize: [41, 41],
});

/** Falha de tiles não impede o uso dos campos nem dos links de detalhes. */
function MapaBase({ centro, zoom = 13, altura = "400px", children, nome = "Mapa de ocorrências" }) {
    const [falha, setFalha] = useState(false);
    const [tentativa, setTentativa] = useState(0);
    const falhou = useRef(false);
    const geracao = useRef(0);
    const instrucoes = useId();
    return (
        <Stack gap="2">
            <Text id={instrucoes} fontSize="sm">Use Tab para acessar os marcadores e Enter para abrir o resumo. A lista de detalhes permanece disponível sem o mapa.</Text>
            {falha && <Flex role="alert" gap="2" wrap="wrap"><Text>Não foi possível carregar o mapa de fundo. Use os campos de coordenadas ou os cartões.</Text>
                <Button type="button" size="sm" variant="outline" onClick={() => { falhou.current = false; setTentativa(++geracao.current); }}>Tentar novamente: mapa</Button></Flex>}
            <Box role="region" aria-label={nome} aria-describedby={instrucoes}>
                <MapContainer center={[centro.lat, centro.lon]} zoom={zoom} style={{ height: altura, width: "100%", borderRadius: "8px" }}>
                    <TileLayer key={tentativa}
                        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                        eventHandlers={{
                            tileerror: () => { if (geracao.current === tentativa) { falhou.current = true; setFalha(true); } },
                            load: () => { if (geracao.current === tentativa && !falhou.current) setFalha(false); },
                        }}
                    />
                    <Recentralizar centro={centro} />
                    {children}
                </MapContainer>
            </Box>
        </Stack>
    );
}

function Recentralizar({ centro }) {
    const mapa = useMap();
    useEffect(() => { mapa.setView([centro.lat, centro.lon]); }, [mapa, centro.lat, centro.lon]);
    return null;
}

export function MapaOcorrencias({ ocorrencias, centro, voceEstaAqui }) {
    return (
        <MapaBase centro={centro} zoom={12}>
            {voceEstaAqui && <Marker position={[voceEstaAqui.lat, voceEstaAqui.lon]} icon={icone} keyboard title="Seu ponto de referência" alt="Seu ponto de referência"><Popup>Seu ponto de referência</Popup></Marker>}
            {ocorrencias.filter(pontoValido).map((o) => (
                <Marker key={`${o.id}:${o.titulo}:${o.status}`} position={[o.lat, o.lon]} icon={icone} keyboard title={`${o.titulo} — ${STATUS[o.status]?.texto}`} alt={`${o.titulo} — ${STATUS[o.status]?.texto}`}>
                    <Popup>
                        <Text fontWeight="bold">{o.titulo}</Text>
                        <Text>{STATUS[o.status]?.texto} · {o.tipoOcorrencia}</Text>
                        <Link asChild colorPalette="purple"><RouterLink to={`/ocorrencias/${o.id}`}>Ver detalhes de {o.titulo}</RouterLink></Link>
                    </Popup>
                </Marker>
            ))}
        </MapaBase>
    );
}

export function MapaPonto({ ponto, status }) {
    return <MapaBase centro={ponto} zoom={15} altura="250px" nome="Local da ocorrência">
        <Marker key={status} position={[ponto.lat, ponto.lon]} icon={icone} keyboard title={`Local da ocorrência — ${STATUS[status]?.texto}`} alt="Local da ocorrência">
            <Popup>Local da ocorrência · {STATUS[status]?.texto}</Popup>
        </Marker>
    </MapaBase>;
}

export function SeletorDeLocal({ ponto, centro, onChange, disabled = false }) {
    const [lat, setLat] = useState(ponto?.lat == null ? "" : String(ponto.lat));
    const [lon, setLon] = useState(ponto?.lon == null ? "" : String(ponto.lon));
    const [erro, setErro] = useState("");
    useEffect(() => {
        setLat(ponto?.lat == null ? "" : String(ponto.lat));
        setLon(ponto?.lon == null ? "" : String(ponto.lon));
        setErro("");
    }, [ponto?.lat, ponto?.lon]);
    function aplicar() {
        if (disabled) return;
        const novo = { lat: Number(lat), lon: Number(lon) };
        if (!lat.trim() || !lon.trim() || !pontoValido(novo)) {
            setErro("Informe latitude entre -90 e 90 e longitude entre -180 e 180.");
            return;
        }
        setErro("");
        onChange(novo);
    }
    return <Stack width="full">
        <Text fontSize="sm">Clique para selecionar ou preencha as coordenadas e aplique. O centro inicial não é uma localização selecionada.</Text>
        <Flex gap="2" wrap="wrap" align="end">
            <Field.Root flex="1" minW="120px" invalid={Boolean(erro)}><Field.Label>Latitude</Field.Label>
                <Input type="number" step="any" min="-90" max="90" value={lat} onChange={(e) => setLat(e.target.value)} disabled={disabled} />
            </Field.Root>
            <Field.Root flex="1" minW="120px" invalid={Boolean(erro)}><Field.Label>Longitude</Field.Label>
                <Input type="number" step="any" min="-180" max="180" value={lon} onChange={(e) => setLon(e.target.value)} disabled={disabled} />
            </Field.Root>
            <Button type="button" variant="outline" onClick={aplicar} disabled={disabled}>Aplicar coordenadas</Button>
        </Flex>
        {erro && <Text role="alert" color="red.600">{erro}</Text>}
        <MapaBase centro={ponto ?? centro} zoom={14} altura="300px" nome="Selecionar local da ocorrência">
            <CapturarClique onChange={onChange} disabled={disabled} onInvalid={() => setErro("A latitude selecionada está fora do intervalo -90 a 90. Escolha um ponto válido.")} />
            {ponto && <Marker position={[ponto.lat, ponto.lon]} icon={icone} keyboard title="Ponto selecionado" alt="Ponto selecionado"><Popup>Ponto selecionado</Popup></Marker>}
        </MapaBase>
    </Stack>;
}

function CapturarClique({ onChange, disabled, onInvalid }) {
    useMapEvents({
        click: (evento) => {
            if (disabled) return;
            const local = evento.latlng.wrap();
            const ponto = { lat: local.lat, lon: local.lng };
            if (pontoValido(ponto)) onChange(ponto);
            else onInvalid();
        },
    });
    return null;
}
