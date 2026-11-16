// Install this reviewed script manually. Default candidate mode never checks out or rebuilds.
// Published main is a separate trusted job, disabled by a root-owned administrator interlock.
pipeline {
    agent { label 'supets-docker' }
    options {
        timestamps()
        disableConcurrentBuilds()
        skipDefaultCheckout()
        skipStagesAfterUnstable()
        timeout(time: 30, unit: 'MINUTES')
    }
    parameters {
        string(name: 'CANDIDATE_ID', defaultValue: '', description: 'Candidate mode only: reviewed ID, incoming/<id>.tar and its .tar.sha256 must already be in this workspace.')
        string(name: 'PROJECT', defaultValue: env.SUPETS_PROJECT ?: 'supets-local', description: 'Must match the project owning this Jenkins control volume.')
        string(name: 'PUBLIC_PORT', defaultValue: env.SUPETS_PUBLIC_PORT ?: '8180', description: 'Existing local application port; keep the operator’s project port unchanged.')
        choice(name: 'TARGET_PLATFORM', choices: env.SUPETS_PLATFORM == 'linux/arm64' ? ['linux/arm64', 'linux/amd64'] : ['linux/amd64', 'linux/arm64'], description: 'Target architecture of all build, test and runtime images.')
        booleanParam(name: 'CLOUD', defaultValue: env.SUPETS_CLOUD == 'true', description: 'Reuse this project’s existing cloud address/TLS configuration; never initialize it in Jenkins.')
    }
    stages {
        stage('Select trusted job track') {
            steps {
                script {
                    env.SUPETS_CI_TRACK = env.JOB_NAME == 'supets-main' ? 'main' : 'candidate'
                }
            }
        }
        stage('Checkout published trusted main') {
            when { expression { env.SUPETS_CI_TRACK == 'main' } }
            steps {
                // The installed helper checks the administrator gate before fetching the fixed main ref.
                sh 'node /opt/supets/deploy/jenkins/main.mjs checkout'
            }
        }
        stage('Import reviewed candidate') {
            when { expression { env.SUPETS_CI_TRACK == 'candidate' } }
            steps {
                sh 'node /opt/supets/deploy/jenkins/candidate.mjs import'
            }
        }
        stage('Frozen hashes before verification') {
            when { expression { env.SUPETS_CI_TRACK == 'candidate' } }
            steps {
                sh 'node /opt/supets/deploy/jenkins/candidate.mjs audit before'
            }
        }
        stage('Build once and verify published main') {
            when { expression { env.SUPETS_CI_TRACK == 'main' } }
            steps {
                // project.build() once -> before audit -> verifyBuilt() -> freeze -> after audit.
                sh 'node /opt/supets/deploy/jenkins/main.mjs verify'
            }
            post {
                always {
                    junit allowEmptyResults: true, testResults: '.ci/evidence/reports/**/*.xml'
                    script {
                        if (fileExists('.ci/evidence/reports/frontend.tap-present')) {
                            step([$class: 'TapPublisher', testResults: '.ci/evidence/reports/**/*.tap', failIfNoResults: true, failedTestsMarkBuildAsFailure: true, outputTapToConsole: false, validateNumberOfTests: true])
                        }
                    }
                }
            }
        }
        stage('Frozen-image verification') {
            when { expression { env.SUPETS_CI_TRACK == 'candidate' } }
            steps {
                // Calls verify --candidate; no build, package, npm install or checkout.
                sh 'node /opt/supets/deploy/jenkins/candidate.mjs verify'
            }
            post {
                always {
                    script {
                        def auditStatus = sh(returnStatus: true, script: 'node /opt/supets/deploy/jenkins/candidate.mjs audit after')
                        def collectionStatus = sh(returnStatus: true, script: 'node /opt/supets/deploy/jenkins/candidate.mjs collect')
                        junit allowEmptyResults: true, testResults: '.ci/evidence/reports/**/*.xml'
                        if (fileExists('.ci/evidence/reports/frontend.tap-present')) {
                            step([$class: 'TapPublisher', testResults: '.ci/evidence/reports/**/*.tap', failIfNoResults: true, failedTestsMarkBuildAsFailure: true, outputTapToConsole: false, validateNumberOfTests: true])
                        }
                        if (auditStatus != 0 || collectionStatus != 0) {
                            error('Candidate hash audit or evidence collection failed; deployment is forbidden.')
                        }
                    }
                }
            }
        }
        stage('Freeze portable main release handoff') {
            when { expression { env.SUPETS_CI_TRACK == 'main' } }
            steps {
                // Package the generated, verified ID, never whichever global release happens to be latest.
                sh 'node /opt/supets/deploy/jenkins/main.mjs package'
            }
        }
        stage('Archive independent Jenkins evidence') {
            steps {
                archiveArtifacts artifacts: '.ci/**/*.json,.ci/evidence/reports/**/*', fingerprint: true
            }
        }
        stage('Deploy exact candidate and check readiness') {
            when { expression { env.SUPETS_CI_TRACK == 'candidate' } }
            steps {
                // Deploy owns the 180-second readiness gate and compatibility-aware rollback.
                // Rollback restoration still returns failure; it is never converted to success.
                sh 'node /opt/supets/deploy/jenkins/candidate.mjs deploy'
            }
        }
        stage('Deploy generated main release and check readiness') {
            when { expression { env.SUPETS_CI_TRACK == 'main' } }
            steps {
                sh 'node /opt/supets/deploy/jenkins/main.mjs deploy'
            }
        }
    }
    post {
        always {
            archiveArtifacts allowEmptyArchive: true, artifacts: '.ci/**/*.json,.ci/evidence/reports/**/*', fingerprint: true
        }
        failure {
            echo 'CI failed. Do not infer deployment success from liveness or a restored predecessor; inspect the archived release evidence.'
        }
        aborted {
            echo 'CI aborted. Shared operation-lock recovery requires proof the old invocation has ended; never delete the lock manually.'
        }
    }
}
