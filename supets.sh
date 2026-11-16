#!/bin/sh
# Docker is the only installed toolchain required; application options belong to Node.
set -u

fail() {
    printf '%s\n' "SuPets: $*" >&2
    exit 1
}

docker_bin=${DOCKER_BIN:-docker}
command -v "$docker_bin" >/dev/null 2>&1 || fail 'Docker não encontrado. Instale/inicie o Docker Engine ou Docker Desktop (contêineres Linux), ou defina DOCKER_BIN com o caminho do executável.'

project=supets-local
expect_project=false
for argument do
    if [ "$expect_project" = true ]; then
        project=$argument
        expect_project=false
    else
        case $argument in
            --project) expect_project=true ;;
            --project=*) fail 'Use --project nome (não --project=nome).' ;;
        esac
    fi
done
[ "$expect_project" = false ] || fail '--project requer um nome.'
case $project in
    ''|[!a-z0-9]*|*[!a-z0-9_-]*) fail 'Projeto inválido: use [a-z0-9][a-z0-9_-]*.' ;;
esac

case $0 in
    /*) script_path=$0 ;;
    *) script_path=$PWD/$0 ;;
esac
root=$(CDPATH= cd -P "$(dirname "$script_path")" && pwd -P) || fail 'Não foi possível localizar o diretório do projeto.'
case $root in
    *,*) fail 'O caminho do projeto não pode conter vírgula (limitação de --mount do Docker). Mova o checkout e tente novamente.' ;;
esac

# Resolve the CLI's selected local endpoint before contacting or changing the engine.
if [ -n "${DOCKER_CONTEXT:-}" ]; then
    endpoint=$("$docker_bin" context inspect "$DOCKER_CONTEXT" --format '{{.Endpoints.docker.Host}}' 2>/dev/null) || fail 'Contexto Docker indisponível. Selecione um contexto local válido.'
elif [ -n "${DOCKER_HOST:-}" ]; then
    endpoint=$DOCKER_HOST
else
    endpoint=$("$docker_bin" context inspect --format '{{.Endpoints.docker.Host}}' 2>/dev/null) || fail 'Contexto Docker indisponível. Inicie o Docker e selecione um contexto local.'
fi
case $endpoint in
    unix:///*) socket=${endpoint#unix://} ;;
    npipe:*) fail 'Neste Windows, execute supets.ps1 no PowerShell com o Docker Desktop em modo Linux.' ;;
    *) fail 'Endpoint Docker remoto/não suportado. Execute o launcher no host do engine e selecione um contexto local Unix.' ;;
esac
case $socket in
    *,*) fail 'O caminho do socket Docker não pode conter vírgula.' ;;
esac

engine=$("$docker_bin" info --format '{{.OSType}};{{.Architecture}};{{.OperatingSystem}};{{range .SecurityOptions}}{{.}}|{{end}}' 2>/dev/null) || fail 'Docker inacessível. Inicie o Docker Engine/Desktop e conceda ao seu usuário acesso ao engine; use contêineres Linux.'
IFS=';' read -r engine_os architecture operating_system security_options <<EOF
$engine
EOF
[ "$engine_os" = linux ] || fail 'O Docker deve estar em modo contêineres Linux; altere o Docker Desktop e tente novamente.'
case $architecture in
    amd64|x86_64) platform=linux/amd64 ;;
    arm64|aarch64) platform=linux/arm64 ;;
    *) fail "Arquitetura Docker não suportada: $architecture (use amd64 ou arm64)." ;;
esac
rootless=false
case $security_options in *name=rootless*) rootless=true ;; esac
case $security_options in
    *name=userns*) [ "$rootless" = true ] || fail 'Docker rootful com userns-remap não é suportado. Use um engine local sem remapeamento ou rootless; nenhuma configuração de segurança foi alterada.' ;;
esac
case $operating_system in
    *Docker\ Desktop*) socket=/var/run/docker.sock ;;
esac
caller_uid=$(id -u) || fail 'Não foi possível obter o UID do usuário.'
caller_gid=$(id -g) || fail 'Não foi possível obter o GID do usuário.'

# Build tools for the engine, not a possibly foreign --platform application target.
"$docker_bin" build --platform "$platform" --tag supets-tools:local --file "$root/deploy/Dockerfile.tools" "$root" || exit $?

state_volume=supets-$project-state
volume_labels=$("$docker_bin" volume inspect --format '{{index .Labels "com.supets.managed"}};{{index .Labels "com.supets.project"}}' "$state_volume" 2>/dev/null) || {
    "$docker_bin" volume create --label com.supets.managed=true --label "com.supets.project=$project" "$state_volume" >/dev/null || fail 'Não foi possível criar o volume de controle.'
    volume_labels=$("$docker_bin" volume inspect --format '{{index .Labels "com.supets.managed"}};{{index .Labels "com.supets.project"}}' "$state_volume" 2>/dev/null) || fail 'Não foi possível verificar o volume de controle.'
}
[ "$volume_labels" = "true;$project" ] || fail "O volume $state_volume não pertence a este projeto; nenhum volume existente foi alterado."

container_name=supets-tools-$project-$$-$(date +%s)
container_id=
cleanup() {
    if [ -n "$container_id" ]; then
        "$docker_bin" rm --force "$container_id" >/dev/null 2>&1 || :
    fi
}
trap cleanup 0
trap 'exit 130' INT
trap 'exit 143' TERM
trap 'exit 129' HUP

container_id=$("$docker_bin" create --init --name "$container_name" \
    --label com.supets.managed=true --label "com.supets.project=$project" \
    --user 0:0 --platform "$platform" --workdir /workspace \
    --mount "type=bind,source=$root,target=/workspace" \
    --mount "type=bind,source=$socket,target=/var/run/docker.sock" \
    --mount "type=volume,source=$state_volume,target=/state" \
    --env DOCKER_HOST=unix:///var/run/docker.sock \
    --env "SUPETS_CONTAINER_ID=$container_name" \
    --env "SUPETS_CALLER_UID=$caller_uid" --env "SUPETS_CALLER_GID=$caller_gid" \
    --env "SUPETS_ROOTLESS=$rootless" --env "SUPETS_PLATFORM=$platform" \
    --env SUPETS_HOST_OS=unix \
    supets-tools:local node deploy/supets.mjs "$@") || exit $?

"$docker_bin" start --attach "$container_id"
attach_exit=$?
container_state=$("$docker_bin" inspect --format '{{.State.Status}};{{.State.ExitCode}}' "$container_id" 2>/dev/null) || fail 'Não foi possível obter o resultado do contêiner de ferramentas.'
case $container_state in
    exited\;*|dead\;*) exit "${container_state#*;}" ;;
    *) [ "$attach_exit" -ne 0 ] && exit "$attach_exit"
       fail 'A conexão com as ferramentas terminou antes da execução; o contêiner será removido.' ;;
esac
