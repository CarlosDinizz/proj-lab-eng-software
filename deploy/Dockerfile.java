# syntax=docker/dockerfile:1
FROM eclipse-temurin:21-jdk-jammy@sha256:432e54724c3e57d1846aeb886f4d339f3b0522931c4e64119c2797013b7cfc3c AS build
# The wrapper switches to tar.gz without unzip; its pinned checksum is for ZIP.
RUN apt-get update \
    && apt-get install -y --no-install-recommends ca-certificates curl unzip \
    && rm -rf /var/lib/apt/lists/*
ARG SERVICE
WORKDIR /workspace
COPY microsservicos/${SERVICE}/ /workspace/microsservicos/${SERVICE}/
COPY shared/data/ /workspace/shared/data/
WORKDIR /workspace/microsservicos/${SERVICE}
RUN case "$SERVICE" in gateway|community|ocorrencias) ;; *) exit 1 ;; esac \
    && tr -d '\r' < mvnw > /tmp/mvnw \
    && cat /tmp/mvnw > mvnw && rm /tmp/mvnw && chmod 0755 mvnw \
    && ./mvnw -B -DskipTests package \
    && case "$SERVICE" in gateway) artifact=supets ;; *) artifact="$SERVICE" ;; esac \
    && mkdir /out && cp "target/${artifact}-0.0.1-SNAPSHOT.jar" /out/app.jar

# Surefire selects its provider and an engine-aligned launcher dynamically.
# Cache both without executing tests so the frozen image can verify offline.
RUN ./mvnw -B dependency:go-offline \
    && ./mvnw -B help:evaluate -Dexpression=maven-surefire-plugin.version -Doutput=/tmp/surefire-version \
    && ./mvnw -B dependency:list -DincludeGroupIds=org.junit.platform \
        -DincludeArtifactIds=junit-platform-engine -DoutputFile=/tmp/junit-platform \
    && surefire_version="$(cat /tmp/surefire-version)" \
    && platform_version="$(awk -F: '/org.junit.platform:junit-platform-engine:jar:/ { print $4; exit }' /tmp/junit-platform)" \
    && test -n "$surefire_version" && test -n "$platform_version" \
    && ./mvnw -B dependency:get \
        "-Dartifact=org.apache.maven.surefire:surefire-junit-platform:$surefire_version" -Dtransitive=true \
    && ./mvnw -B dependency:get \
        "-Dartifact=org.junit.platform:junit-platform-launcher:$platform_version" -Dtransitive=true \
    && rm /tmp/surefire-version /tmp/junit-platform

FROM eclipse-temurin:21-jre-jammy@sha256:dff6eb46527bd293a3c06bbbe9e64e8c9f91f01905b5abbdad31761c03059d2c AS runtime
RUN apt-get update \
    && apt-get install -y --no-install-recommends ca-certificates curl \
    && rm -rf /var/lib/apt/lists/* \
    && groupadd --gid 10001 supets \
    && useradd --uid 10001 --gid 10001 --no-create-home --shell /usr/sbin/nologin supets
WORKDIR /app
COPY --from=build --chown=10001:10001 /out/app.jar /app/app.jar
ENV JAVA_TOOL_OPTIONS="-Xms64m -Xmx384m" \
    SERVER_ADDRESS=0.0.0.0 \
    SERVER_SHUTDOWN=graceful \
    SPRING_LIFECYCLE_TIMEOUT_PER_SHUTDOWN_PHASE=30s
USER 10001:10001
STOPSIGNAL SIGTERM
ENTRYPOINT ["java", "-jar", "/app/app.jar"]
