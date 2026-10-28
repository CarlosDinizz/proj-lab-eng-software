-- Development data can be discarded; the original citizen IDs were integers.
DELETE FROM ocorrencia;
ALTER TABLE ocorrencia DROP COLUMN cidadao_id;
ALTER TABLE ocorrencia ADD COLUMN cidadao_id UUID NOT NULL;
ALTER TABLE ocorrencia ADD COLUMN titulo VARCHAR(255) NOT NULL;
ALTER TABLE ocorrencia ALTER COLUMN descricao SET NOT NULL;
ALTER TABLE ocorrencia ADD COLUMN status VARCHAR(20) NOT NULL;
ALTER TABLE ocorrencia ADD COLUMN ong_id UUID;
ALTER TABLE ocorrencia ADD COLUMN created_at TIMESTAMP WITH TIME ZONE NOT NULL;
ALTER TABLE ocorrencia ADD COLUMN endereco VARCHAR(255) NOT NULL;
ALTER TABLE ocorrencia ADD COLUMN cidade VARCHAR(255) NOT NULL;
ALTER TABLE ocorrencia ADD COLUMN estado VARCHAR(2) NOT NULL;
ALTER TABLE ocorrencia ADD COLUMN especie VARCHAR(255) NOT NULL;
ALTER TABLE ocorrencia ADD COLUMN nome_animal VARCHAR(255);
ALTER TABLE ocorrencia ADD COLUMN sexo VARCHAR(255);
ALTER TABLE ocorrencia ADD COLUMN raca VARCHAR(255);
ALTER TABLE ocorrencia ADD COLUMN porte VARCHAR(255);
