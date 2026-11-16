#!/bin/sh
# Instala somente o Docker Engine em Ubuntu limpo; não instala a aplicação.
# Outros sistemas: https://docs.docker.com/engine/install/
set -eu

fail() { printf '%s\n' "$*" >&2; exit 1; }
[ "$(uname -s)" = Linux ] || fail "Este instalador opcional é apenas para Linux. Use Docker Desktop e o launcher raiz neste sistema."
DOCKER_BIN=${DOCKER_BIN:-docker}

if command -v "$DOCKER_BIN" >/dev/null 2>&1; then
    "$DOCKER_BIN" info --format 'Docker {{.ServerVersion}}; {{.OSType}}/{{.Architecture}}; CPUs={{.NCPU}}; memória={{.MemTotal}} bytes' ||
        fail "Docker já existe, mas não está acessível. Inicie o engine ou corrija a permissão/contexto; nenhuma instalação foi alterada."
    [ "$("$DOCKER_BIN" info --format '{{.OSType}}')" = linux ] ||
        fail "Selecione um engine de contêineres Linux."
    printf '%s\n' "Docker existente preservado. A aplicação é executada pelo launcher supets.sh."
    exit 0
fi
[ "$DOCKER_BIN" = docker ] || fail "DOCKER_BIN não encontrado: $DOCKER_BIN. Corrija o caminho; nenhuma instalação foi alterada."

[ ! -x /snap/bin/docker ] ||
    fail "Docker Snap já existe. Use DOCKER_BIN=/snap/bin/docker; não será instalado outro daemon."
[ "$(id -u)" -eq 0 ] || fail "Docker não encontrado. Para instalar em Ubuntu limpo: sudo sh deploy/setup-servidor.sh"
[ -r /etc/os-release ] || fail "Sistema não identificado. Siga https://docs.docker.com/engine/install/"
. /etc/os-release
[ "${ID:-}" = ubuntu ] ||
    fail "Instalação automática disponível apenas para Ubuntu. Use as instruções oficiais da distribuição detectada: ${ID:-desconhecida}."
case "${VERSION_CODENAME:-}" in
    jammy|noble|resolute|stonking) ;;
    *) fail "Versão Ubuntu não suportada por este instalador: ${VERSION_ID:-desconhecida}." ;;
esac
architecture=$(dpkg --print-architecture)
case "$architecture" in amd64|arm64) ;; *) fail "Arquitetura não suportada pelo projeto: $architecture." ;; esac
[ -d /run/systemd/system ] || fail "systemd não está ativo; instale/inicie Docker conforme a documentação do ambiente."

# Não remover pacotes, reutilizar dados desconhecidos ou sobrescrever configuração.
for package in docker.io docker-compose docker-compose-v2 docker-doc docker-buildx podman-docker containerd runc docker-ce; do
    status=$(dpkg-query -W -f '${db:Status-Status}' "$package" 2>/dev/null || true)
    [ "$status" != installed ] ||
        fail "Pacote existente $package exige revisão manual. Nenhum pacote foi removido."
done
for existing in /var/lib/docker /var/snap/docker /etc/docker /etc/apt/keyrings/docker.asc /etc/apt/sources.list.d/docker.sources /etc/apt/sources.list.d/docker.list; do
    [ ! -e "$existing" ] || fail "Estado/configuração existente: $existing. Revise antes de instalar; nada foi sobrescrito."
done

# Repositório oficial: https://docs.docker.com/engine/install/ubuntu/
export DEBIAN_FRONTEND=noninteractive
apt-get update
apt-get install -y ca-certificates curl
install -m 0755 -d /etc/apt/keyrings
curl --fail --show-error --silent --location --connect-timeout 10 --max-time 60 \
    https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
chmod a+r /etc/apt/keyrings/docker.asc
cat > /etc/apt/sources.list.d/docker.sources <<EOF
Types: deb
URIs: https://download.docker.com/linux/ubuntu
Suites: $VERSION_CODENAME
Components: stable
Architectures: $architecture
Signed-By: /etc/apt/keyrings/docker.asc
EOF
apt-get update
apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
systemctl enable --now docker
docker info --format 'Docker {{.ServerVersion}}; {{.OSType}}/{{.Architecture}}'
printf '%s\n' \
    "Docker instalado. Não foram instalados serviços da aplicação, Jenkins ou proxy, nem alterada a configuração de swap." \
    "Execute o launcher raiz com acesso autorizado ao Docker. O grupo docker concede autoridade administrativa sobre o host." \
    "No servidor público: 80/443 acessíveis; SSH restrito ao seu CIDR. Não publique portas internas."
