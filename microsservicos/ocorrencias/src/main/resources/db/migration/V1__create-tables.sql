CREATE TABLE tipo_ocorrencia(
    id SERIAL PRIMARY KEY,
    tipo VARCHAR(255) NOT NULL
);

CREATE TABLE ocorrencia (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tipo_ocorrencia_id INTEGER NOT NULL REFERENCES tipo_ocorrencia(id),
    cidadao_id INTEGER,
    descricao TEXT,
    lat DOUBLE PRECISION,
    lon DOUBLE PRECISION
);
