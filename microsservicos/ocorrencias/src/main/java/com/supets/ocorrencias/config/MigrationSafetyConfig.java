package com.supets.ocorrencias.config;

import org.flywaydb.core.Flyway;
import org.springframework.boot.flyway.autoconfigure.FlywayMigrationStrategy;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;
import java.sql.Connection;
import java.sql.SQLException;
import java.util.HashMap;
import java.util.HashSet;
import java.util.Map;
import java.util.Set;
import java.util.zip.CRC32;

@Configuration(proxyBeanMethods = false)
public class MigrationSafetyConfig {
    public static final String UNSAFE = "Unsafe legacy occurrence schema; preserve the database and use a verified migration plan.";
    private static final String[] SCRIPTS = {"V1__create-tables.sql", "V2__insert-into.sql",
        "V3__ocorrencia_workflow.sql", "V4__casos_de_uso_ocorrencia.sql", "V5__tipos_ocorrencia.sql"};
    private static final Set<String> TABLES = Set.of("tipo_ocorrencia", "ocorrencia", "especie", "porte", "sexo_animal", "animal", "flyway_schema_history");
    private static final Set<String> SEQUENCES = Set.of("tipo_ocorrencia_id_seq", "especie_id_seq", "porte_id_seq", "sexo_animal_id_seq");
    private static final Map<String, Integer> CHECKSUMS = checksums();
    private static final Map<String, String> COLUMNS = Map.of(
        "tipo_ocorrencia", "id:integer:!|tipo:character varying(255):!",
        "especie", "id:integer:!|nome:character varying(255):!",
        "porte", "id:integer:!|nome:character varying(255):!",
        "sexo_animal", "id:integer:!|nome:character varying(255):!",
        "animal", "id:uuid:!|nome:character varying(255):?|raca:character varying(255):?|especie_id:integer:!|sexo_id:integer:?|porte_id:integer:?",
        "ocorrencia", "id:uuid:!|tipo_ocorrencia_id:integer:!|descricao:text:!|lat:double precision:!|lon:double precision:!|cidadao_id:uuid:!|titulo:character varying(255):!|status:character varying(20):!|responsavel_id:uuid:?|created_at:timestamp with time zone:!|endereco:character varying(255):!|cidade:character varying(255):!|estado:character varying(2):!|animal_id:uuid:!|data_ocorrido:date:!|cep:character varying(8):!|responsavel_perfil:character varying(10):?"
    );

    @Bean
    public FlywayMigrationStrategy migrationSafetyStrategy() { return this::migrateSafely; }

    public void migrateSafely(Flyway flyway) {
        try {
            if (!flyway.getConfiguration().isValidateOnMigrate()) reject();
            inspect(flyway);
        } catch (Exception e) {
            // Do not repair, baseline or execute any migration after an unsafe inspection.
            throw new IllegalStateException(UNSAFE, e);
        }
        // migrate() validates applied checksums while permitting pending V1–V5.
        // Standalone validate() rejects the pending migrations of a fresh schema.
        flyway.migrate();
    }

    private static void inspect(Flyway flyway) throws SQLException {
        try (Connection c = flyway.getConfiguration().getDataSource().getConnection()) {
            c.setReadOnly(true);
            String schema = flyway.getConfiguration().getDefaultSchema();
            if (schema == null) schema = c.getSchema();
            Set<String> tables = new HashSet<>();
            Set<String> sequences = new HashSet<>();
            try (var p = c.prepareStatement("select relname, relkind, relpersistence, relrowsecurity from pg_class join pg_namespace n on n.oid=relnamespace where n.nspname=? and relkind not in ('i','I')")) {
                p.setString(1, schema);
                try (var r = p.executeQuery()) {
                    while (r.next()) {
                        if (!"p".equals(r.getString(3)) || r.getBoolean(4)) reject();
                        switch (r.getString(2)) {
                            case "r" -> tables.add(r.getString(1));
                            case "S" -> sequences.add(r.getString(1));
                            default -> reject();
                        }
                    }
                }
            }
            try (var p = c.prepareStatement("""
                select exists(select 1 from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname=?)
                    or exists(select 1 from pg_type t join pg_namespace n on n.oid=t.typnamespace
                              where n.nspname=? and t.typtype in ('e','d'))
                    or exists(select 1 from pg_trigger tr join pg_class t on t.oid=tr.tgrelid
                              join pg_namespace n on n.oid=t.relnamespace where n.nspname=? and not tr.tgisinternal)
                """)) {
                p.setString(1, schema);
                p.setString(2, schema);
                p.setString(3, schema);
                try (var r = p.executeQuery()) { if (r.next() && r.getBoolean(1)) reject(); }
            }
            if (tables.isEmpty() && sequences.isEmpty()) return;
            if (!tables.equals(TABLES) || !sequences.equals(SEQUENCES)) reject();
            inspectHistory(c, schema);
            inspectColumns(c, schema);
            inspectConstraints(c, schema);
        }
    }

    private static void inspectHistory(Connection c, String schema) throws SQLException {
        // Quote the schema as an identifier; values remain JDBC parameters.
        String history = "\"" + schema.replace("\"", "\"\"") + "\".flyway_schema_history";
        int version = 0;
        try (var p = c.prepareStatement("select version, type, script, checksum, success from " + history + " order by installed_rank"); var r = p.executeQuery()) {
            while (r.next()) {
                version++;
                if (version > SCRIPTS.length || !Integer.toString(version).equals(r.getString(1))
                        || !"SQL".equals(r.getString(2)) || !SCRIPTS[version - 1].equals(r.getString(3))
                        || r.getObject(4) == null || r.getInt(4) != CHECKSUMS.get(SCRIPTS[version - 1]) || !r.getBoolean(5)) reject();
            }
        }
        if (version != 4 && version != 5) reject();
    }

    private static void inspectColumns(Connection c, String schema) throws SQLException {
        Map<String, Set<String>> actual = new HashMap<>();
        try (var p = c.prepareStatement("""
            select t.relname, a.attname, format_type(a.atttypid,a.atttypmod), a.attnotnull,
                coalesce(pg_get_expr(d.adbin,d.adrelid),''), a.attidentity, a.attgenerated,
                pg_get_serial_sequence(format('%I.%I',n.nspname,t.relname),a.attname)
            from pg_attribute a join pg_class t on t.oid=a.attrelid join pg_namespace n on n.oid=t.relnamespace
            left join pg_attrdef d on d.adrelid=t.oid and d.adnum=a.attnum
            where n.nspname=? and t.relkind='r' and t.relname <> 'flyway_schema_history' and a.attnum>0 and not a.attisdropped
            """)) {
            p.setString(1, schema);
            try (var r = p.executeQuery()) {
                while (r.next()) {
                    String table = r.getString(1);
                    String column = r.getString(2);
                    String value = r.getString(5);
                    if (!r.getString(6).isEmpty() || !r.getString(7).isEmpty()) reject();
                    if (!"id".equals(column)) {
                        if (!value.isEmpty()) reject();
                    } else if ("animal".equals(table) || "ocorrencia".equals(table)) {
                        if (!"gen_random_uuid()".equals(value)) reject();
                    } else {
                        String sequence = table + "_id_seq";
                        if (r.getString(8) == null || !r.getString(8).equals(schema + "." + sequence)
                                || (!value.equals("nextval('" + sequence + "'::regclass)")
                                    && !value.equals("nextval('" + schema + "." + sequence + "'::regclass)"))) reject();
                    }
                    actual.computeIfAbsent(table, ignored -> new HashSet<>())
                        .add(column + ":" + r.getString(3) + ":" + (r.getBoolean(4) ? "!" : "?"));
                }
            }
        }
        for (var expected : COLUMNS.entrySet()) {
            if (!Set.of(expected.getValue().split("\\|")).equals(actual.get(expected.getKey()))) reject();
        }
    }

    private static void inspectConstraints(Connection c, String schema) throws SQLException {
        Set<String> expected = new HashSet<>();
        for (String table : COLUMNS.keySet()) expected.add(table + ":p:id::");
        expected.add("ocorrencia:u:animal_id::");
        expected.add("ocorrencia:f:tipo_ocorrencia_id:tipo_ocorrencia:id");
        expected.add("ocorrencia:f:animal_id:animal:id");
        expected.add("animal:f:especie_id:especie:id");
        expected.add("animal:f:sexo_id:sexo_animal:id");
        expected.add("animal:f:porte_id:porte:id");
        Set<String> actual = new HashSet<>();
        try (var p = c.prepareStatement("""
            select t.relname, co.contype,
              array_to_string(array(select a.attname from unnest(co.conkey) with ordinality k(num,ord)
                join pg_attribute a on a.attrelid=t.oid and a.attnum=k.num order by k.ord), ','),
              coalesce(rt.relname,''),
              array_to_string(array(select a.attname from unnest(co.confkey) with ordinality k(num,ord)
                join pg_attribute a on a.attrelid=rt.oid and a.attnum=k.num order by k.ord), ','),
              rn.nspname, co.convalidated, co.confdeltype, co.confupdtype, co.condeferrable
            from pg_constraint co join pg_class t on t.oid=co.conrelid join pg_namespace n on n.oid=t.relnamespace
            left join pg_class rt on rt.oid=co.confrelid left join pg_namespace rn on rn.oid=rt.relnamespace
            where n.nspname=? and t.relname <> 'flyway_schema_history'
            """)) {
            p.setString(1, schema);
            try (var r = p.executeQuery()) {
                while (r.next()) {
                    if (!r.getBoolean(7) || r.getBoolean(10)) reject();
                    if ("f".equals(r.getString(2)) && (!schema.equals(r.getString(6))
                            || !"a".equals(r.getString(8)) || !"a".equals(r.getString(9)))) reject();
                    actual.add(r.getString(1) + ":" + r.getString(2) + ":" + r.getString(3) + ":" + r.getString(4) + ":" + r.getString(5));
                }
            }
        }
        if (!actual.equals(expected)) reject();
    }

    private static Map<String, Integer> checksums() {
        Map<String, Integer> result = new HashMap<>();
        for (String script : SCRIPTS) {
            CRC32 crc = new CRC32();
            try (var input = MigrationSafetyConfig.class.getResourceAsStream("/db/migration/" + script)) {
                if (input == null) throw new IllegalStateException(UNSAFE);
                try (var reader = new BufferedReader(new InputStreamReader(input, StandardCharsets.UTF_8))) {
                    String line;
                    boolean first = true;
                    // Flyway SQL CRC32 ignores line endings and the optional initial UTF-8 BOM.
                    while ((line = reader.readLine()) != null) {
                        if (first && line.startsWith("\uFEFF")) line = line.substring(1);
                        first = false;
                        crc.update(line.getBytes(StandardCharsets.UTF_8));
                    }
                }
            } catch (Exception e) { throw new IllegalStateException(UNSAFE); }
            result.put(script, (int) crc.getValue());
        }
        return Map.copyOf(result);
    }

    private static void reject() { throw new IllegalStateException(UNSAFE); }
}
