pipeline {
    agent any

    triggers {
        githubPush()
    }

    options {
        timestamps()
        disableConcurrentBuilds()
        // O estágio Checkout abaixo já faz o checkout.
        skipDefaultCheckout()
    }

    stages {
        // Baixar o código do commit que disparou o build.
        stage('Checkout') {
            steps {
                checkout scm
            }
        }

        // Falha aqui é erro de compilação (gateway, community e ocorrencias).
        stage('Build') {
            steps {
                sh '''
                    set -e
                    for s in gateway community ocorrencias; do
                        (cd microsservicos/$s && ./mvnw -B clean compile)
                    done
                '''
            }
        }

        // Um teste falhando para a pipeline, mas o relatório JUnit é publicado mesmo assim.
        stage('Test') {
            steps {
                sh '''
                    set -e
                    (cd microsservicos/gateway && ./mvnw -B test)
                    (cd microsservicos/ocorrencias && ./mvnw -B test)

                    # Os testes do community usam Postgres de verdade: apontam para o banco community_test,
                    # nunca para o banco da aplicação. O JWT_SECRET fica de fora para valer o padrão dos testes.
                    (
                        set -a; . /etc/supets/supets.env; set +a
                        unset JWT_SECRET
                        cd microsservicos/community
                        SPRING_DATASOURCE_URL=jdbc:postgresql://localhost:5431/community_test ./mvnw -B test
                    )

                    (cd frontend/supets && npm ci && npm test)
                '''
            }
            post {
                always {
                    junit allowEmptyResults: true, testResults: 'microsservicos/*/target/surefire-reports/*.xml'
                }
            }
        }

        stage('Package') {
            steps {
                sh '''
                    set -e
                    for s in gateway community ocorrencias; do
                        (cd microsservicos/$s && ./mvnw -B package -DskipTests)
                    done
                    (cd frontend/supets && npm run build)
                '''
                archiveArtifacts 'microsservicos/*/target/*.jar'
            }
        }

        // Troca os jars e o front no servidor e reinicia os serviços (community e ocorrencias antes do gateway).
        stage('Deploy') {
            steps {
                sh '''
                    set -e
                    for s in gateway community ocorrencias; do
                        cp microsservicos/$s/target/*.jar /opt/supets/$s.jar.novo
                        mv /opt/supets/$s.jar.novo /opt/supets/$s.jar
                    done

                    find /var/www/supets -mindepth 1 -delete
                    cp -r frontend/supets/dist/. /var/www/supets/

                    for s in community ocorrencias gateway; do
                        sudo -n systemctl restart supets-$s
                    done
                '''
            }
        }

        // Espera até 120s: os três serviços ativos, o gateway respondendo e o front servido pelo nginx.
        stage('Health check') {
            steps {
                sh '''
                    for i in $(seq 1 60); do
                        if systemctl is-active --quiet supets-community supets-ocorrencias supets-gateway \
                            && curl -fsS http://localhost:8081/api/status \
                            && curl -fsS http://localhost/api/status \
                            && curl -fsS -o /dev/null http://localhost/; then
                            exit 0
                        fi
                        sleep 2
                    done
                    echo "A aplicação não respondeu em 120 s." >&2
                    systemctl --no-pager status supets-community supets-ocorrencias supets-gateway >&2 || true
                    exit 1
                '''
            }
        }
    }
}
