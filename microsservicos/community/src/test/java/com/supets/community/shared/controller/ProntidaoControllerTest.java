package com.supets.community.shared.controller;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.*;
import java.sql.Connection;
import java.sql.Statement;
import java.sql.ResultSet;
import java.sql.SQLException;
import javax.sql.DataSource;
import org.junit.jupiter.api.Test;

class ProntidaoControllerTest {
    @Test
    void consultaLimitadaExigeLookupsEFechaConexao() throws Exception {
        DataSource dataSource = mock(DataSource.class);
        Connection connection = mock(Connection.class);
        Statement statement = mock(Statement.class);
        ResultSet rs = mock(ResultSet.class);
        when(dataSource.getConnection()).thenReturn(connection);
        when(connection.createStatement()).thenReturn(statement);
        when(statement.executeQuery(anyString())).thenReturn(rs);
        when(rs.next()).thenReturn(true);
        when(rs.getBoolean(1)).thenReturn(true, false);
        var controller = new ProntidaoController(dataSource);
        assertThat(controller.ready().getStatusCode().value()).isEqualTo(200);
        assertThat(controller.ready().getStatusCode().value()).isEqualTo(503);
        verify(statement, times(2)).setQueryTimeout(1);
        verify(connection, times(2)).close();
    }

    @Test
    void falhaNaoExpoeSqlNemConfiguracao() throws Exception {
        DataSource dataSource = mock(DataSource.class);
        when(dataSource.getConnection()).thenThrow(new SQLException("jdbc:secret-password"));
        var response = new ProntidaoController(dataSource).ready();
        assertThat(response.getStatusCode().value()).isEqualTo(503);
        assertThat(response.getBody()).containsExactlyEntriesOf(java.util.Map.of("status", "DOWN"));
    }
}
