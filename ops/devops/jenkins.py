"""Ejecuta Docker en el agente de la práctica. Transfiere archivos al daemon DinD por su API."""
import contextlib
import json
import os
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path
from urllib.parse import urlsplit

from entrega import prepare

OUT = Path("salida-ci")
SERVER = "smartrh-expo-ensayo-v1"
VOLUME = SERVER + "-sitio"
LABEL = "mx.smartrh.devops=expo-staging-v1"


def docker(*args, capture=False, check=True, stdin=None):
    # El proxy de la Mac apunta al DinD del laboratorio, incluso si el agente tiene otros contextos.
    default = "tcp://dind:2376" if os.environ.get("DOCKER_TLS_VERIFY") else "tcp://dind:2375"
    endpoint = os.environ.get("SMARTRH_DIND_HOST") or os.environ.get("DOCKER_HOST") or default
    if urlsplit(endpoint).hostname != "dind":
        endpoint = default
    env = {**os.environ, "DOCKER_HOST": endpoint}
    env.pop("DOCKER_CONTEXT", None)
    return subprocess.run(["docker", *map(str, args)], check=check, stdin=stdin, env=env,
                          stdout=subprocess.PIPE if capture else None, text=stdin is None)


@contextlib.contextmanager
def container(*args):
    identifier = docker("create", *args, capture=True).stdout.strip()
    try:
        yield identifier
    finally:
        docker("rm", "-fv", identifier, check=False, capture=True)


def run_container(identifier):
    docker("start", "-a", identifier)
    code = int(docker("inspect", "-f", "{{.State.ExitCode}}", identifier, capture=True).stdout)
    if code:
        raise SystemExit(code)


def build():
    OUT.mkdir(exist_ok=True)
    reports = OUT / "informes"
    reports.mkdir(exist_ok=True)
    rev = subprocess.check_output(["git", "rev-parse", "HEAD"], text=True).strip()
    with tempfile.TemporaryDirectory() as tmp:
        # El contexto de la imagen de herramientas únicamente contiene el Dockerfile.
        shutil.copyfile("ops/devops/Dockerfile.ci", Path(tmp) / "Dockerfile")
        image = docker("build", "--pull", "-q", tmp, capture=True).stdout.strip().splitlines()[-1]
    with container("-e", "CI=1", "-e", "VITE_API_URL=https://ci.invalid", image,
                   "sh", "ops/devops/portal_ci.sh") as box:
        with tempfile.TemporaryFile() as tracked:
            subprocess.run(["git", "archive", "--format=tar", "HEAD"], stdout=tracked, check=True)
            tracked.seek(0)
            docker("cp", "-", box + ":/work/", stdin=tracked)
        try:
            run_container(box)
        finally:
            docker("cp", box + ":/work/informes-ci/.", reports, check=False)
        if not (reports / "junit.xml").is_file():
            raise RuntimeError("Falta el reporte JUnit de la compilación")
        dist = OUT / "dist-expo"
        dist.mkdir(exist_ok=True)
        docker("cp", box + ":/work/dist-expo/.", dist)
    prepare(dist, OUT / "candidato", rev)


def ensure_staging():
    names = docker("ps", "-a", "--format", "{{.Names}}", capture=True).stdout.splitlines()
    if SERVER not in names:
        docker("volume", "create", "--label", LABEL, VOLUME)
        docker("run", "-d", "--name", SERVER, "--label", LABEL, "--restart", "unless-stopped",
               "-p", "8094:80", "--mount", f"type=volume,src={VOLUME},dst=/usr/share/nginx/html,readonly,volume-nocopy",
               "nginx:stable-alpine")
    info = json.loads(docker("inspect", SERVER, capture=True).stdout)[0]
    if (info["Config"]["Labels"].get("mx.smartrh.devops") != "expo-staging-v1" or
        not any(m.get("Name") == VOLUME and m["Destination"] == "/usr/share/nginx/html" and not m["RW"]
                for m in info["Mounts"])):
        raise RuntimeError("El contenedor existente no corresponde al staging de SMART RH")
    if not info["State"]["Running"]:
        docker("start", SERVER)


def stage(action):
    OUT.mkdir(exist_ok=True)
    ensure_staging()
    args = ["python3", "ops/devops/entrega.py", action, "/sitio", "http://127.0.0.1", "recibo.json"]
    if action == "staging":
        args.append("candidato")
    with container("--network", "container:" + SERVER, "--mount", f"type=volume,src={VOLUME},dst=/sitio",
                   "-w", "/work", "python:3.12-alpine", *args) as box:
        with tempfile.TemporaryDirectory() as tmp:
            folder = Path(tmp)
            for item in ("ops/devops/entrega.py", "ops/expo/desplegar_aws.py"):
                (folder / item).parent.mkdir(parents=True, exist_ok=True)
                shutil.copyfile(item, folder / item)
            if action == "staging":
                shutil.copytree(OUT / "candidato", folder / "candidato")
            docker("cp", tmp + "/.", box + ":/work/")
        run_container(box)
        docker("cp", box + ":/work/recibo.json", OUT / "recibo.json")


if __name__ == "__main__":
    if sys.argv[1:] == ["validar"]:
        build()
    elif sys.argv[1:] in (["staging"], ["revertir"]):
        stage(sys.argv[1])
    else:
        raise SystemExit("Elige validar, staging o revertir")
