pipeline {
    agent none
    options {
        skipDefaultCheckout(true)
        disableConcurrentBuilds()
        buildDiscarder(logRotator(numToKeepStr: '15'))
        timeout(time: 60, unit: 'MINUTES')
    }
    triggers { pollSCM('H/5 * * * *') }
    parameters {
        choice(name: 'ACCION', choices: ['STAGING', 'PREPARAR_AWS', 'REVERTIR_STAGING'],
               description: 'Publicar en el ensayo, preparar el ZIP aprobado o volver a la versión anterior del ensayo.')
    }
    stages {
        stage('Portal y demo de presentación') {
            agent { label 'agente-python' }
            stages {
                stage('Obtener revisión') {
                    steps {
                        deleteDir()
                        checkout scm
                        sh 'git log -1 --format="%H %s"'
                    }
                }
                stage('Pruebas y compilación') {
                    when { expression { params.ACCION != 'REVERTIR_STAGING' } }
                    steps { sh 'python3 ops/devops/jenkins.py validar' }
                    post {
                        always {
                            archiveArtifacts artifacts: 'salida-ci/informes/**', allowEmptyArchive: true, fingerprint: true
                            script {
                                if (fileExists('salida-ci/informes/junit.xml')) {
                                    junit 'salida-ci/informes/junit.xml'
                                }
                            }
                        }
                    }
                }
                stage('Desplegar y verificar el staging') {
                    when { expression { params.ACCION != 'REVERTIR_STAGING' } }
                    steps {
                        sh 'python3 ops/devops/jenkins.py staging'
                        archiveArtifacts artifacts: 'salida-ci/recibo.json', fingerprint: true
                        script {
                            if (params.ACCION == 'PREPARAR_AWS') {
                                stash name: 'candidato-probado', includes: 'salida-ci/candidato/**,salida-ci/recibo.json,ops/devops/entrega.py,ops/expo/desplegar_aws.py'
                            }
                        }
                    }
                }
                stage('Revertir staging') {
                    when { expression { params.ACCION == 'REVERTIR_STAGING' } }
                    steps {
                        sh 'python3 ops/devops/jenkins.py revertir'
                        archiveArtifacts artifacts: 'salida-ci/recibo.json', fingerprint: true
                    }
                }
            }
        }
        stage('Autorizar entrega para AWS') {
            when { expression { params.ACCION == 'PREPARAR_AWS' } }
            steps {
                timeout(time: 10, unit: 'MINUTES') {
                    input message: '¿Autorizas empaquetar la demo verificada para CloudShell?', ok: 'Autorizar ZIP'
                }
            }
        }
        stage('Entregar el mismo candidato') {
            when { beforeAgent true; expression { params.ACCION == 'PREPARAR_AWS' } }
            agent { label 'agente-python' }
            steps {
                deleteDir()
                unstash 'candidato-probado'
                sh 'python3 ops/devops/entrega.py empaquetar salida-ci/candidato salida-ci/recibo.json entrega'
                archiveArtifacts artifacts: 'entrega/*', fingerprint: true
            }
        }
    }
}
