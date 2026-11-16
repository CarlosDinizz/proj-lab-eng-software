# Deploy (AWS EC2 + Jenkins)

Um push na `main` dispara o Jenkins (webhook do GitHub), que compila, testa, empacota e publica tudo na própria EC2.

```
GitHub --push--> Jenkins (:8080) --> build + testes --> /opt/supets/*.jar + /var/www/supets
                                                        |
Navegador --> nginx (:80) --> front estático            v
                          \-> gateway (:8081) --> community (:8083) --> Postgres :5431
                                              \-> ocorrencias (:8082) --> Postgres :5432
```

O Jenkins ocupa a 8080, por isso o `community` roda na 8083 no servidor (`SERVER_PORT` no `.service`).
Só as portas 22, 80 e 8080 ficam abertas no Security Group; o resto escuta em localhost.

## 1. Preparar o servidor (uma vez)

1. Crie a EC2 conforme o laboratório 7 (Ubuntu 24.04, User Data do Jenkins). Use **t3.medium** (a t3.small é apertada para Jenkins, 3 serviços Java e 2 bancos).
2. Security Group: libere 22, 80 e 8080. Associe um **Elastic IP** (sem ele o IP muda ao reiniciar o Learner Lab e o webhook quebra).
3. Na instância:
   ```sh
   git clone https://github.com/CarlosDinizz/proj-lab-eng-software.git
   cd proj-lab-eng-software
   sudo ./deploy/setup-servidor.sh
   sudo systemctl restart jenkins
   ```
   O script instala Node 22, nginx e Docker, cria swap, sobe os dois Postgres, gera os segredos em `/etc/supets/supets.env` e registra os serviços systemd.

## 2. Job no Jenkins (uma vez)

1. New Item → **Pipeline**.
2. Build Triggers: **GitHub hook trigger for GITScm polling**.
3. Pipeline → *Pipeline script from SCM* → Git → URL do repositório → branch `*/main` → Script Path `Jenkinsfile`.
4. Salve e clique em **Build Now** para o primeiro deploy.

## 3. Webhook no GitHub (uma vez)

Settings → Webhooks → Add webhook:

- Payload URL: `http://<elastic-ip>:8080/github-webhook/`
- Content type: `application/json`
- Evento: **Just the push event**

## Conferindo

```sh
curl http://<elastic-ip>/api/status            # gateway pelo nginx
systemctl status supets-gateway supets-community supets-ocorrencias
journalctl -u supets-community -f              # logs
```

O site abre em `http://<elastic-ip>/`.

## Observações

- Os testes do `community` gravam dados reais, então rodam no banco `community_test` (criado pelo setup), não no `community`.
- Para trocar senhas ou o `JWT_SECRET`: edite `/etc/supets/supets.env` e reinicie os três serviços. Trocar `PG_PASSWORD` depois do primeiro `up` exige alterar a senha dentro do Postgres também.
- O `microsservicos/ocorrencias/.env` saiu do Git, mas continua no histórico. Se ele tinha senha de verdade, troque-a.
