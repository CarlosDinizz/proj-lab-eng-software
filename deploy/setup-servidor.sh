#!/usr/bin/env bash
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

apt-get update
apt-get install -y openjdk-21-jdk-headless

install -d -o jenkins -g jenkins /opt/supets

install -m 644 "$DIR/supets.service" /etc/systemd/system/supets.service
systemctl daemon-reload
systemctl enable supets

SUDOERS="$(mktemp)"
trap 'rm -f "$SUDOERS"' EXIT
echo 'jenkins ALL=(root) NOPASSWD: /usr/bin/systemctl restart supets' > "$SUDOERS"
visudo -cf "$SUDOERS"
install -m 440 "$SUDOERS" /etc/sudoers.d/supets

echo "Servidor pronto. Libere a porta 8081 no security group da EC2."
