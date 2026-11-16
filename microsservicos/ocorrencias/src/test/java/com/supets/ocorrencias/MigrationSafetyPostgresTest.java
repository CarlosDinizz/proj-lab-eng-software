package com.supets.ocorrencias;

import com.supets.ocorrencias.config.MigrationSafetyConfig;
import org.flywaydb.core.Flyway;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.jdbc.core.JdbcTemplate;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import static org.junit.jupiter.api.Assertions.*;

class MigrationSafetyPostgresTest {
    private IsolatedPostgres isolated;
    private String schema;
    private JdbcTemplate jdbc;
    private final MigrationSafetyConfig safety = new MigrationSafetyConfig();

    @BeforeEach void create() {
        isolated = new IsolatedPostgres();
        schema = isolated.createSchema();
        jdbc = new JdbcTemplate(isolated.dataSource(schema));
    }

    @AfterEach void cleanup() { if (schema != null) isolated.dropSchema(schema); }

    private Flyway flyway() {
        return Flyway.configure().dataSource(isolated.dataSource(schema)).defaultSchema(schema)
            .locations("classpath:db/migration").load();
    }

    private void legacy(int version) {
        Flyway.configure().dataSource(isolated.dataSource(schema)).defaultSchema(schema)
            .locations("classpath:db/migration").target(Integer.toString(version)).load().migrate();
    }

    private List<String> snapshot() {
        List<String> result = new ArrayList<>();
        for (String table : jdbc.queryForList("select tablename from pg_tables where schemaname=? order by tablename", String.class, schema)) {
            result.add(table);
            result.addAll(jdbc.queryForList("select row_to_json(t)::text from " + schema + ".\"" + table + "\" t order by 1", String.class));
        }
        result.addAll(jdbc.queryForList("select table_name||'.'||column_name||':'||data_type||':'||is_nullable from information_schema.columns where table_schema=? order by table_name,ordinal_position", String.class, schema));
        return result;
    }

    private void rejectedUnchanged() {
        var before = snapshot();
        var error = assertThrows(IllegalStateException.class, () -> safety.migrateSafely(flyway()));
        assertEquals(MigrationSafetyConfig.UNSAFE, error.getMessage());
        assertEquals(before, snapshot(), "Safety rejection must not change any row, history entry or column");
    }

    @Test void emptySchemaExecutesOriginalLineageThenV5AndRestarts() {
        safety.migrateSafely(flyway());
        assertEquals(List.of("1", "2", "3", "4", "5"), jdbc.queryForList("select version from flyway_schema_history order by installed_rank", String.class));
        assertEquals("Animal em Necessidade de Assistência Médica", jdbc.queryForObject("select tipo from tipo_ocorrencia where id=3", String.class));
        assertEquals(1, jdbc.queryForObject("select count(*) from tipo_ocorrencia where tipo='Desaparecimento'", Integer.class));
        var before = snapshot();
        safety.migrateSafely(flyway());
        assertEquals(before, snapshot());
        int highest = jdbc.queryForObject("select max(id) from tipo_ocorrencia", Integer.class);
        int next = jdbc.queryForObject("insert into tipo_ocorrencia(tipo) values ('Próxima opção') returning id", Integer.class);
        assertTrue(next > highest);
    }

    @Test void populatedV4PreservesOccurrenceAnimalOwnershipAndContent() {
        legacy(4);
        UUID animal = UUID.randomUUID();
        UUID occurrence = UUID.randomUUID();
        UUID author = UUID.randomUUID();
        UUID responsible = UUID.randomUUID();
        jdbc.update("insert into animal(id,nome,raca,especie_id,sexo_id,porte_id) values (?,'Animal legado','Raça',1,2,3)", animal);
        jdbc.update("""
            insert into ocorrencia(id,tipo_ocorrencia_id,cidadao_id,titulo,descricao,status,responsavel_id,responsavel_perfil,
                created_at,endereco,cidade,estado,animal_id,data_ocorrido,cep,lat,lon)
            values (?,3,?,'Preservar','Texto original','EM_ANDAMENTO',?,'ONG',now(),'Rua, 1','São Paulo','SP',?,current_date,'01000000',-23.5,-46.6)
            """, occurrence, author, responsible, animal);
        var originalOccurrences = jdbc.queryForList("select row_to_json(t)::text from ocorrencia t", String.class);
        var originalAnimals = jdbc.queryForList("select row_to_json(t)::text from animal t", String.class);
        safety.migrateSafely(flyway());
        assertEquals(originalOccurrences, jdbc.queryForList("select row_to_json(t)::text from ocorrencia t", String.class));
        assertEquals(originalAnimals, jdbc.queryForList("select row_to_json(t)::text from animal t", String.class));
        assertEquals(3, jdbc.queryForObject("select tipo_ocorrencia_id from ocorrencia where id=?", Integer.class, occurrence));
        assertEquals(5, jdbc.queryForObject("select count(*) from flyway_schema_history", Integer.class));
    }

    @ParameterizedTest @ValueSource(ints = {1, 2, 3})
    void partialLegacyLineageNeverRunsDestructiveMigrations(int version) {
        legacy(version);
        if (version == 1) jdbc.update("insert into tipo_ocorrencia(id,tipo) values (1,'Legado')");
        if (version < 3) {
            jdbc.update("insert into ocorrencia(tipo_ocorrencia_id,cidadao_id,descricao,lat,lon) values (1,7,'Não apagar',0,0)");
        } else {
            jdbc.update("""
                insert into ocorrencia(tipo_ocorrencia_id,cidadao_id,titulo,descricao,status,created_at,endereco,cidade,estado,especie,lat,lon)
                values (1,?,'Não apagar','Original','ABERTA',now(),'Rua','São Paulo','SP','Gato',0,0)
                """, UUID.randomUUID());
        }
        rejectedUnchanged();
    }

    @Test void nonemptyUnversionedSchemaIsNeverBaselined() {
        jdbc.execute("create table legado(id integer primary key, texto text)");
        jdbc.update("insert into legado values (1,'Não apagar')");
        rejectedUnchanged();
    }

    @Test void baselineOnlyHistoryIsRejected() {
        jdbc.execute("create table legado(id integer)");
        Flyway.configure().dataSource(isolated.dataSource(schema)).defaultSchema(schema).baselineVersion("4").load().baseline();
        rejectedUnchanged();
    }

    @ParameterizedTest @ValueSource(strings = {"failed", "checksum", "script", "future", "missing", "column", "foreignKey", "extraTable", "function", "enum", "nullable", "default"})
    void divergentOrUnknownHistoryAndSchemaAreRejected(String variation) {
        legacy(4);
        switch (variation) {
            case "failed" -> jdbc.update("update flyway_schema_history set success=false where version='4'");
            case "checksum" -> jdbc.update("update flyway_schema_history set checksum=checksum+1 where version='2'");
            case "script" -> jdbc.update("update flyway_schema_history set script='V4__unknown.sql' where version='4'");
            case "future" -> jdbc.update("update flyway_schema_history set version='99' where version='4'");
            case "missing" -> jdbc.update("delete from flyway_schema_history where version='2'");
            case "column" -> jdbc.execute("alter table ocorrencia alter column cidade type varchar(100)");
            case "foreignKey" -> jdbc.execute("alter table ocorrencia drop constraint ocorrencia_animal_id_fkey");
            case "extraTable" -> jdbc.execute("create table unexpected(id integer)");
            case "function" -> jdbc.execute("create function unexpected() returns integer language sql as 'select 1'");
            case "enum" -> jdbc.execute("create type unexpected as enum ('value')");
            case "nullable" -> jdbc.execute("alter table ocorrencia alter column lat drop not null");
            case "default" -> jdbc.execute("alter table ocorrencia alter column id drop default");
            default -> fail("Unknown fixture");
        }
        rejectedUnchanged();
    }
}
