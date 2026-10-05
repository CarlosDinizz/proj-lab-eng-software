CREATE TABLE estado (
    id SERIAL PRIMARY KEY,
    nome VARCHAR(255) NOT NULL,
    uf CHAR(2) NOT NULL
);

CREATE TABLE cidade (
    id SERIAL PRIMARY KEY,
    nome VARCHAR(255) NOT NULL,
    estado_id INTEGER NOT NULL REFERENCES estado(id)
);

CREATE TABLE local_ (
    id SERIAL PRIMARY KEY,
    endereco VARCHAR(255) NOT NULL,
    numero INTEGER NOT NULL,
    complemento VARCHAR(255),
    cidade_id INTEGER NOT NULL REFERENCES cidade(id)
);

CREATE TABLE tipo_contato (
    id SERIAL PRIMARY KEY,
    tipo VARCHAR(255) NOT NULL
);


CREATE TABLE ong (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome VARCHAR(255) NOT NULL,
    descricao TEXT,
    cnpj VARCHAR(14) NOT NULL UNIQUE,
    local_id INTEGER REFERENCES local_(id)
);

CREATE TABLE cidadao (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome VARCHAR(255) NOT NULL,
    descricao TEXT,
    cpf VARCHAR(11) NOT NULL UNIQUE,
    local_id INTEGER REFERENCES local_(id)
);


CREATE TABLE contato (
    id SERIAL PRIMARY KEY,
    valor VARCHAR(255) NOT NULL,
    tipo_contato_id INTEGER NOT NULL REFERENCES tipo_contato(id),
    ong_id UUID REFERENCES ong(id) ON DELETE CASCADE,
    cidadao_id UUID REFERENCES cidadao(id) ON DELETE CASCADE,

    CONSTRAINT chk_dono_contato CHECK (
        (ong_id IS NOT NULL AND cidadao_id IS NULL) OR
        (ong_id IS NULL AND cidadao_id IS NOT NULL)
    )
);


CREATE INDEX idx_contato_ong ON contato(ong_id) WHERE ong_id IS NOT NULL;
CREATE INDEX idx_contato_cidadao ON contato(cidadao_id) WHERE cidadao_id IS NOT NULL;
