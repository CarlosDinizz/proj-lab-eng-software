package com.supets.ocorrencias.ocorrencia;

import com.supets.ocorrencias.IsolatedPostgres;
import com.supets.ocorrencias.ocorrencia.dto.*;
import com.supets.ocorrencias.ocorrencia.enums.PerfilEnum;
import com.supets.ocorrencias.ocorrencia.model.StatusOcorrencia;
import com.supets.ocorrencias.ocorrencia.repository.OcorrenciaRepository;
import com.supets.ocorrencias.ocorrencia.service.OcorrenciaService;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.annotation.DirtiesContext;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;
import org.springframework.web.server.ResponseStatusException;
import java.time.LocalDate;
import java.util.UUID;
import java.util.concurrent.*;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.function.Supplier;
import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest
@DirtiesContext(classMode = DirtiesContext.ClassMode.AFTER_CLASS)
class OcorrenciaPostgresTest {
    private static final IsolatedPostgres DATABASE = new IsolatedPostgres();
    private static final String SCHEMA = DATABASE.createSchema();
    private static final UsuarioAutenticado AUTHOR = new UsuarioAutenticado(UUID.randomUUID(), PerfilEnum.CIDADAO);
    private static final UsuarioAutenticado CLAIMANT = new UsuarioAutenticado(UUID.randomUUID(), PerfilEnum.ONG);
    @Autowired OcorrenciaService service;
    @Autowired OcorrenciaRepository repository;
    @Autowired JdbcTemplate jdbc;
    @Autowired PlatformTransactionManager transactions;

    @DynamicPropertySource
    static void postgresOnly(DynamicPropertyRegistry properties) {
        properties.add("spring.datasource.url", () -> DATABASE.url(SCHEMA));
        properties.add("spring.datasource.username", DATABASE::user);
        properties.add("spring.datasource.password", DATABASE::password);
        properties.add("spring.datasource.driver-class-name", () -> "org.postgresql.Driver");
        properties.add("spring.flyway.enabled", () -> "true");
        properties.add("spring.flyway.default-schema", () -> SCHEMA);
        properties.add("spring.jpa.hibernate.ddl-auto", () -> "validate");
        properties.add("spring.jpa.defer-datasource-initialization", () -> "false");
        properties.add("spring.sql.init.mode", () -> "never");
    }

    @AfterAll static void cleanupSchema() { DATABASE.dropSchema(SCHEMA); }
    @BeforeEach void cleanupRows() { repository.deleteAll(); }

    private static DadosOcorrenciaDto data(String title) {
        return new DadosOcorrenciaDto(title, "Descrição", LocalDate.now().minusDays(1), 1,
            "01000-000", "Rua, 1", "  são paulo  ", "sp", -23.55, -46.63,
            new CriarAnimalDto("Rex", 1, 1, "Raça", 2));
    }

    private OcorrenciaRespostaDto claim(UUID id, UsuarioAutenticado user) {
        return service.atualizarStatus(id, user, new AtualizarStatusDto(StatusOcorrencia.EM_ANDAMENTO));
    }

    private OcorrenciaRespostaDto create(String title) {
        return service.buscar(service.criar(AUTHOR, data(title)).id());
    }

    @Test void actualPostgresStartupMigratesAndValidatesWithoutH2OrSqlInit() {
        assertEquals("PostgreSQL", jdbc.execute((java.sql.Connection c) -> c.getMetaData().getDatabaseProductName()));
        assertEquals(5, jdbc.queryForObject("select count(*) from flyway_schema_history where success", Integer.class));
        assertEquals(4, service.listarTipos().size());
        assertEquals(SCHEMA, jdbc.queryForObject("select current_schema()", String.class));
    }

    @Test void creationRoleAndInvalidLookupCannotLeaveAnimalOrOccurrenceWrites() {
        long animals = jdbc.queryForObject("select count(*) from animal", Long.class);
        assertEquals(403, assertThrows(ResponseStatusException.class, () -> service.criar(CLAIMANT, data("Forbidden"))).getStatusCode().value());
        assertEquals(0, repository.count());
        assertEquals(animals, jdbc.queryForObject("select count(*) from animal", Long.class));
        var original = create("Original");
        var invalid = new DadosOcorrenciaDto("Changed", "Other", LocalDate.now(), 2, "02000000", "Other street", "Santos", "SP",
            0.0, 0.0, new CriarAnimalDto("Changed", 1, 999, null, null));
        assertThrows(RuntimeException.class, () -> service.atualizar(original.id(), AUTHOR, invalid));
        assertEquals(original, service.buscar(original.id()));
    }

    /** The first operation holds the exact production row lock until released; prove the second is blocked in PostgreSQL. */
    private void ordered(UUID id, Supplier<OcorrenciaRespostaDto> first, Supplier<OcorrenciaRespostaDto> second,
                         int secondStatus) throws Exception {
        CountDownLatch locked = new CountDownLatch(1);
        CountDownLatch release = new CountDownLatch(1);
        AtomicInteger ownerPid = new AtomicInteger();
        try (ExecutorService executor = Executors.newVirtualThreadPerTaskExecutor()) {
            Future<OcorrenciaRespostaDto> winner = executor.submit(() -> new TransactionTemplate(transactions).execute(tx -> {
                repository.findByIdForUpdate(id).orElseThrow();
                ownerPid.set(jdbc.queryForObject("select pg_backend_pid()", Integer.class));
                var result = first.get();
                locked.countDown();
                try { if (!release.await(10, TimeUnit.SECONDS)) throw new IllegalStateException("Test lock release timed out"); }
                catch (InterruptedException e) { Thread.currentThread().interrupt(); throw new IllegalStateException(e); }
                return result;
            }));
            assertTrue(locked.await(10, TimeUnit.SECONDS));
            Future<Integer> loser = executor.submit(() -> {
                try { second.get(); return 200; }
                catch (ResponseStatusException e) { return e.getStatusCode().value(); }
            });
            try {
                long deadline = System.nanoTime() + TimeUnit.SECONDS.toNanos(5);
                boolean blocked = false;
                while (System.nanoTime() < deadline) {
                    blocked = Boolean.TRUE.equals(jdbc.queryForObject("select exists(select 1 from pg_stat_activity where ? = any(pg_blocking_pids(pid)))", Boolean.class, ownerPid.get()));
                    if (blocked) break;
                    if (loser.isDone()) break;
                    Thread.sleep(10);
                }
                assertTrue(blocked, "The competing operation must wait on the same PostgreSQL row lock");
            } finally { release.countDown(); }
            assertNotNull(winner.get(10, TimeUnit.SECONDS));
            assertEquals(secondStatus, loser.get(10, TimeUnit.SECONDS));
        } finally { release.countDown(); }
    }

    @Test void editFirstThenClaimCommitsBothWithEditedContentAndUnchangedIds() throws Exception {
        var original = create("Before");
        UUID animalId = jdbc.queryForObject("select animal_id from ocorrencia where id=?", UUID.class, original.id());
        ordered(original.id(), () -> service.atualizar(original.id(), AUTHOR, data("Edited")), () -> claim(original.id(), CLAIMANT), 200);
        var current = service.buscar(original.id());
        assertEquals("Edited", current.titulo());
        assertEquals(StatusOcorrencia.EM_ANDAMENTO, current.status());
        assertEquals(CLAIMANT.id(), current.responsavelId());
        assertEquals(CLAIMANT.perfil(), current.responsavelPerfil());
        assertEquals(original.createdAt(), current.createdAt());
        assertEquals(original.cidadaoId(), current.cidadaoId());
        assertEquals(animalId, jdbc.queryForObject("select animal_id from ocorrencia where id=?", UUID.class, original.id()));
    }

    @Test void claimFirstThenEditConflictsAndPreservesAllContent() throws Exception {
        var original = create("Original");
        ordered(original.id(), () -> claim(original.id(), CLAIMANT), () -> service.atualizar(original.id(), AUTHOR, data("Never saved")), 409);
        var current = service.buscar(original.id());
        assertEquals(original.titulo(), current.titulo());
        assertEquals(original.animal(), current.animal());
        assertEquals(original.lat(), current.lat());
        assertEquals(original.createdAt(), current.createdAt());
        assertEquals(CLAIMANT.id(), current.responsavelId());
    }

    @Test void simultaneousClaimsHaveOneWinnerAndExactlyOneResponsible() throws Exception {
        var occurrence = create("Claim race");
        var other = new UsuarioAutenticado(UUID.randomUUID(), PerfilEnum.CIDADAO);
        ordered(occurrence.id(), () -> claim(occurrence.id(), CLAIMANT), () -> claim(occurrence.id(), other), 409);
        assertEquals(CLAIMANT.id(), service.buscar(occurrence.id()).responsavelId());
        assertEquals(1, repository.count());
    }

    @Test void simultaneousContentEditsAreSerializedLastWriteWins() throws Exception {
        var occurrence = create("Initial");
        ordered(occurrence.id(), () -> service.atualizar(occurrence.id(), AUTHOR, data("First")),
            () -> service.atualizar(occurrence.id(), AUTHOR, data("Last")), 200);
        assertEquals("Last", service.buscar(occurrence.id()).titulo());
        assertEquals(StatusOcorrencia.ABERTA, service.buscar(occurrence.id()).status());
    }

    @Test void serviceRejectsNonfiniteCoordinatesOnCreateAndEdit() {
        var occurrence = create("Original");
        for (double value : new double[]{Double.NaN, Double.POSITIVE_INFINITY, Double.NEGATIVE_INFINITY, 90.01}) {
            var bad = new DadosOcorrenciaDto("Invalid", "Description", LocalDate.now(), 1, "01000000", "Rua", "São Paulo", "SP",
                value, 0.0, new CriarAnimalDto(null, 1, null, null, null));
            assertEquals(400, assertThrows(ResponseStatusException.class, () -> service.criar(AUTHOR, bad)).getStatusCode().value());
            assertEquals(400, assertThrows(ResponseStatusException.class, () -> service.atualizar(occurrence.id(), AUTHOR, bad)).getStatusCode().value());
            assertEquals(occurrence, service.buscar(occurrence.id()));
        }
    }
}
