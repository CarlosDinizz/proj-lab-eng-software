#!/usr/bin/env bash
# Prepara a EC2 (Ubuntu 24.04, com Jenkins já instalado pelo User Data do laboratório).
# Pode ser executado de novo sem problema. Uso: sudo ./deploy/setup-servidor.sh
set -euo pipefail

if [[ $EUID -ne 0 ]]; then
    echo "Execute com sudo." >&2
    exit 1
fi
if ! id jenkins >/dev/null 2>&1; then
    echo "Usuário jenkins não encontrado; instale o Jenkins antes." >&2
    exit 1
fi

DIR="$(cd "$(dirname "$0")" && pwd)"
SERVICOS=(gateway community ocorrencias)

export DEBIAN_FRONTEND=noninteractive
apt-get update
apt-get install -y openjdk-21-jdk-headless nginx docker.io docker-compose-v2 curl ca-certificates openssl

# Node 22 para buildar o front (o Vite 8 não roda no Node 18 do repositório padrão do Ubuntu).
NODE_MAJOR="$(node -v 2>/dev/null | sed -E 's/^v([0-9]+).*/\1/' || true)"
if [[ -z "${NODE_MAJOR:-}" || "$NODE_MAJOR" -lt 20 ]]; then
    curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
    apt-get install -y nodejs
fi

# Memória: Jenkins + 3 serviços Java + 2 Postgres + builds. Cria 2 GB de swap se não houver.
if [[ "$(swapon --show --noheadings | wc -l)" -eq 0 ]]; then
    fallocate -l 2G /swapfile
    chmod 600 /swapfile
    mkswap /swapfile
    swapon /swapfile
    grep -q '^/swapfile' /etc/fstab || echo '/swapfile none swap sw 0 0' >> /etc/fstab
fi

# Diretórios do deploy.
install -d -o jenkins -g jenkins /opt/supets /var/www/supets
install -d -m 750 -o root -g jenkins /etc/supets

# Segredos: gerados uma única vez, nunca vão para o Git.
if [[ ! -f /etc/supets/supets.env ]]; then
    umask 077
    cat > /etc/supets/supets.env <<ENV
PG_USER=supets
PG_PASSWORD=$(openssl rand -hex 16)
JWT_SECRET=$(openssl rand -hex 32)
ENV
    chown root:jenkins /etc/supets/supets.env
    chmod 640 /etc/supets/supets.env
    echo "Segredos gerados em /etc/supets/supets.env"
fi

# Bancos (Postgres em Docker, com restart automático).
systemctl enable --now docker
docker compose -p supets --env-file /etc/supets/supets.env -f "$DIR/docker-compose.yml" up -d

# Banco separado só para os testes do community: eles gravam dados de verdade.
set -a; . /etc/supets/supets.env; set +a
for i in $(seq 1 30); do
    docker exec community_db pg_isready -U "$PG_USER" -d community >/dev/null 2>&1 && break
    sleep 2
done
docker exec community_db psql -U "$PG_USER" -d community -tAc \
    "SELECT 1 FROM pg_database WHERE datname='community_test'" | grep -q 1 \
    || docker exec community_db psql -U "$PG_USER" -d community -c "CREATE DATABASE community_test"

# Serviços systemd (o antigo supets.service, só do gateway, é removido).
if [[ -f /etc/systemd/system/supets.service ]]; then
    systemctl disable --now supets || true
    rm -f /etc/systemd/system/supets.service
fi
for s in "${SERVICOS[@]}"; do
    install -m 644 "$DIR/supets-$s.service" "/etc/systemd/system/supets-$s.service"
done
systemctl daemon-reload
for s in "${SERVICOS[@]}"; do systemctl enable "supets-$s"; done

# Front: nginx serve /var/www/supets e encaminha a API para o gateway.
rm -f /etc/nginx/sites-enabled/default
install -m 644 "$DIR/nginx-supets.conf" /etc/nginx/sites-available/supets
ln -sf /etc/nginx/sites-available/supets /etc/nginx/sites-enabled/supets
nginx -t
systemctl enable nginx
systemctl reload nginx || systemctl restart nginx

# O Jenkins só pode reiniciar os serviços do SuPets, nada além disso.
SUDOERS="$(mktemp)"
trap 'rm -f "$SUDOERS"' EXIT
{
    printf 'jenkins ALL=(root) NOPASSWD:'
    sep=' '
    for s in "${SERVICOS[@]}"; do
        printf '%s/usr/bin/systemctl restart supets-%s' "$sep" "$s"
        sep=', '
    done
    printf '\n'
} > "$SUDOERS"
visudo -cf "$SUDOERS"
install -m 440 "$SUDOERS" /etc/sudoers.d/supets

echo "Servidor pronto. Security Group: libere 22 (SSH), 80 (site) e 8080 (Jenkins). Não abra 8081, 8082, 8083, 5431 nem 5432."
echo "Depois reinicie o Jenkins (sudo systemctl restart jenkins) para ele enxergar o Node e o grupo docker, se necessário."
