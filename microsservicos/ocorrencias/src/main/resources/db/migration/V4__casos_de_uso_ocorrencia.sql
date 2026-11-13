-- Segue a documentação (diagrama de classes, wireframe e UC001-UC003).
-- Os dados de desenvolvimento podem ser descartados, como na V3: o animal agora é obrigatório.
DELETE FROM ocorrencia;

-- Espécie, porte e sexo viram tabelas (diagrama de classes)
CREATE TABLE especie (
    id SERIAL PRIMARY KEY,
    nome VARCHAR(255) NOT NULL
);
CREATE TABLE porte (
    id SERIAL PRIMARY KEY,
    nome VARCHAR(255) NOT NULL
);
CREATE TABLE sexo_animal (
    id SERIAL PRIMARY KEY,
    nome VARCHAR(255) NOT NULL
);

INSERT INTO especie (nome) VALUES ('Cachorro'), ('Gato'), ('Ave'), ('Outro');
INSERT INTO porte (nome) VALUES ('Pequeno'), ('Médio'), ('Grande');
INSERT INTO sexo_animal (nome) VALUES ('Macho'), ('Fêmea'), ('Não identificado');

-- O animal ganha tabela própria: Ocorrencia "1" --> "1" Animal
CREATE TABLE animal (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome VARCHAR(255),
    raca VARCHAR(255),
    especie_id INTEGER NOT NULL REFERENCES especie(id),
    sexo_id INTEGER REFERENCES sexo_animal(id),
    porte_id INTEGER REFERENCES porte(id)
);

ALTER TABLE ocorrencia
    DROP COLUMN especie,
    DROP COLUMN nome_animal,
    DROP COLUMN sexo,
    DROP COLUMN raca,
    DROP COLUMN porte;
ALTER TABLE ocorrencia ADD COLUMN animal_id UUID NOT NULL UNIQUE REFERENCES animal(id);

-- Campos do wireframe que faltavam
ALTER TABLE ocorrencia ADD COLUMN data_ocorrido DATE NOT NULL;
ALTER TABLE ocorrencia ADD COLUMN cep VARCHAR(8) NOT NULL;

-- A localização é obrigatória: é ela que põe a ocorrência no mapa (UC003)
ALTER TABLE ocorrencia ALTER COLUMN lat SET NOT NULL;
ALTER TABLE ocorrencia ALTER COLUMN lon SET NOT NULL;

-- Qualquer cidadão ou ONG pode assumir a ocorrência (RF2), não só ONG
ALTER TABLE ocorrencia RENAME COLUMN ong_id TO responsavel_id;
ALTER TABLE ocorrencia ADD COLUMN responsavel_perfil VARCHAR(10);
