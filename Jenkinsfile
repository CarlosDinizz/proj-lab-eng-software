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

        // Falha aqui é erro de compilação.
        stage('Build') {
            steps {
                sh './mvnw -B clean compile'
            }
        }

        // Um teste falhando para a pipeline, mas o relatório JUnit é publicado mesmo assim.
        stage('Test') {
            steps {
                sh './mvnw -B test'
            }
            post {
                always {
                    junit 'target/surefire-reports/*.xml'
                }
            }
        }

        stage('Package') {
            steps {
                sh './mvnw -B package -DskipTests'
                archiveArtifacts 'target/*.jar'
            }
        }

        // Substitui o jar no servidor e reinicia o serviço.
        stage('Deploy') {
            steps {
                sh '''
                    cp target/*.jar /opt/supets/app.jar.novo
                    mv /opt/supets/app.jar.novo /opt/supets/app.jar
                    sudo -n systemctl restart supets
                '''
            }
        }

        // Espera até 60s a aplicação responder.
        stage('Health check') {
            steps {
                sh '''
                    for i in $(seq 1 30); do
                        if curl -fsS http://localhost:8081/api/status; then
                            exit 0
                        fi
                        sleep 2
                    done
                    echo "A aplicação não respondeu em 60 s." >&2
                    exit 1
                '''
            }
        }
    }
}
