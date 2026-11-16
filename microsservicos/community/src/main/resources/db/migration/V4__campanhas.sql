CREATE TABLE tipo_campanha (
    id SERIAL PRIMARY KEY,
    nome VARCHAR(255) NOT NULL UNIQUE
);

INSERT INTO tipo_campanha (nome) VALUES
    ('Vacinação'),
    ('Castração'),
    ('Adoção'),
    ('Arrecadação'),
    ('Conscientização');

CREATE TABLE campanha (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    titulo VARCHAR(255) NOT NULL,
    descricao TEXT NOT NULL,
    data_inicio DATE NOT NULL,
    data_fim DATE NOT NULL,
    tipo_campanha_id INTEGER NOT NULL REFERENCES tipo_campanha(id),
    ong_id UUID NOT NULL REFERENCES ong(id) ON DELETE CASCADE,
    cep VARCHAR(8) NOT NULL,
    endereco VARCHAR(255) NOT NULL,
    cidade VARCHAR(255) NOT NULL,
    estado VARCHAR(2) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT chk_campanha_datas CHECK (data_fim >= data_inicio)
);

CREATE INDEX idx_campanha_ong ON campanha(ong_id);

CREATE TABLE participacao_campanha (
    id BIGSERIAL PRIMARY KEY,
    campanha_id UUID NOT NULL REFERENCES campanha(id) ON DELETE CASCADE,
    cidadao_id UUID NOT NULL REFERENCES cidadao(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT uk_participacao_campanha UNIQUE (campanha_id, cidadao_id)
);

CREATE INDEX idx_participacao_cidadao ON participacao_campanha(cidadao_id);