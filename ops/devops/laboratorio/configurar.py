#!/usr/bin/env python3
"""Conecta el Jenkins y Gitea locales al portal. Las claves se leen sin eco."""
import argparse
import base64
import getpass
import http.client
import json
import os
from pathlib import Path
import subprocess
import sys
import time
from urllib.parse import quote, urlencode, urlsplit
from xml.etree import ElementTree as ET

LAB = Path(__file__).resolve().parent
JOB = "SMART-RH-Expo"
UPSTREAM = "https://github.com/bzrfn/smart-rh-web-portal"
REPO = "smart-rh-web-portal"
JOB_PATH = "/job/" + JOB


class LocalAPI:
    def __init__(self, port, auth):
        self.port = port
        self.headers = {"Authorization": auth, "Accept": "*/*"}

    def request(self, method, path, data=None, mime="application/json", allowed=(200,)):
        conn = http.client.HTTPConnection("127.0.0.1", self.port, timeout=30)
        try:
            body = json.dumps(data).encode() if data is not None and mime == "application/json" else data
            conn.request(method, path, body=body, headers={**self.headers, "Content-Type": mime})
            resp = conn.getresponse()
            content = resp.read()
            if resp.status not in allowed:
                raise RuntimeError(f"{method} {path.split('?')[0]} en puerto {self.port}: HTTP {resp.status}")
            return resp.status, content, resp.getheader("Location")
        finally:
            conn.close()

    def get(self, path):
        return json.loads(self.request("GET", path)[1])


def network(override):
    if override:
        return override
    ids = subprocess.check_output(["docker", "ps", "-q"], text=True).split()
    if not ids:
        raise RuntimeError("Inicia el Docker Compose de la práctica")
    # Consultamos exclusivamente las redes, nombres y alias de los contenedores.
    raw = subprocess.check_output(["docker", "inspect", "-f", "{{json .NetworkSettings.Networks}}", *ids], text=True)
    aliases = {}
    for line in raw.splitlines():
        for net, cfg in json.loads(line).items():
            aliases.setdefault(net, set()).update((cfg.get("Aliases") or []) + (cfg.get("DNSNames") or []))
    matches = [net for net, names in aliases.items() if {"dind", "jenkins", "gitea"} <= names]
    if len(matches) != 1:
        raise RuntimeError("Indica la red de la práctica con --red NOMBRE. Debe resolver dind, jenkins y gitea.")
    return matches[0]


def mirror(api):
    user = api.get("/api/v1/user")["login"]
    root = "/api/v1/repos/" + quote(user, safe="") + "/" + REPO
    status, body, _ = api.request("GET", root, allowed=(200, 404))
    if status == 404:
        api.request("POST", "/api/v1/repos/migrate", {"clone_addr": UPSTREAM + ".git",
                    "repo_owner": user, "repo_name": REPO, "service": "git",
                    "mirror": True, "mirror_interval": "10m", "private": True}, allowed=(201,))
    info = api.get(root)
    if (not info.get("mirror") or not info.get("private")
            or (info.get("original_url") or "").rstrip("/").removesuffix(".git") != UPSTREAM):
        raise RuntimeError("El repositorio existente en Gitea no es el espejo privado esperado")
    api.request("POST", root + "/mirror-sync", allowed=(200, 202, 204))
    deadline = time.monotonic() + 60
    while True:
        status, _, _ = api.request("GET", root + "/contents/Jenkinsfile?ref=main", allowed=(200, 404))
        if status == 200:
            return "http://gitea:3000/" + quote(user, safe="") + "/" + REPO + ".git"
        if time.monotonic() >= deadline:
            raise RuntimeError("El espejo aún no tiene Jenkinsfile en main. Comprueba que el PR del portal esté integrado y vuelve a ejecutar.")
        time.sleep(3)


def job_xml(remote, credential):
    job = ET.Element("flow-definition")
    ET.SubElement(job, "description").text = "Entrega de ensayo de la demo pública de SMART RH"
    flow = ET.SubElement(job, "definition", {"class": "org.jenkinsci.plugins.workflow.cps.CpsScmFlowDefinition"})
    scm = ET.SubElement(flow, "scm", {"class": "hudson.plugins.git.GitSCM"})
    ET.SubElement(scm, "configVersion").text = "2"
    remote_cfg = ET.SubElement(ET.SubElement(scm, "userRemoteConfigs"), "hudson.plugins.git.UserRemoteConfig")
    ET.SubElement(remote_cfg, "url").text = remote
    ET.SubElement(remote_cfg, "credentialsId").text = credential
    branch = ET.SubElement(ET.SubElement(scm, "branches"), "hudson.plugins.git.BranchSpec")
    ET.SubElement(branch, "name").text = "*/main"
    ET.SubElement(scm, "extensions")
    ET.SubElement(flow, "scriptPath").text = "Jenkinsfile"
    ET.SubElement(flow, "lightweight").text = "false"
    ET.SubElement(job, "disabled").text = "false"
    return ET.tostring(job, encoding="utf-8")


def job(api, remote, credential):
    expected = job_xml(remote, credential)
    status, _, _ = api.request("GET", JOB_PATH + "/api/json", allowed=(200, 404))
    if status == 404:
        api.request("POST", "/createItem?" + urlencode({"name": JOB}), expected, "application/xml", (200, 201, 302))
    config = ET.fromstring(api.request("GET", JOB_PATH + "/config.xml")[1])
    for path in ("./definition/scriptPath", ".//userRemoteConfigs/*/url", ".//userRemoteConfigs/*/credentialsId",
                 ".//branches/*/name"):
        if config.findtext(path) != ET.fromstring(expected).findtext(path):
            raise RuntimeError("Ya existe otro job con ese nombre o configuración. Revisa " + JOB)


def check_jenkins(api):
    path = LAB.parents[2] / "Jenkinsfile"
    text = api.request("POST", "/pipeline-model-converter/validate", urlencode({"jenkinsfile": path.read_text()}),
                       "application/x-www-form-urlencoded")[1].decode()
    if "successfully validated" not in text.lower():
        raise RuntimeError("El validador declarativo de Jenkins respondió: " + text[:500])
    print("JENKINSFILE_VALIDADO=OK", flush=True)
    nodes = api.get("/computer/api/json?tree=computer[offline,assignedLabels[name]]")["computer"]
    if not any(not n["offline"] and any(lab["name"] == "agente-python" for lab in n.get("assignedLabels", [])) for n in nodes):
        raise RuntimeError("Inicia el agente con etiqueta agente-python en Jenkins")


def wait_build(api, path, repeat):
    state = api.get(path + "/api/json?tree=inQueue,lastBuild[number,building,result],property[parameterDefinitions[name]]")
    last = state.get("lastBuild")
    if state.get("inQueue"):
        queue = api.get("/queue/api/json?tree=items[id,task[name]]")["items"]
        item = next((i for i in queue if i.get("task", {}).get("name") == JOB), None)
        queue_path = f"/queue/item/{item['id']}" if item else None
        if not queue_path:
            raise RuntimeError("La cola cambió de estado. Vuelve a ejecutar para recuperar el build.")
    elif not last or (repeat and not last["building"]):
        parameters = {p["name"] for prop in state.get("property", [])
                      for p in prop.get("parameterDefinitions", [])}
        action = "/buildWithParameters?ACCION=STAGING" if "ACCION" in parameters else "/build"
        _, _, location = api.request("POST", path + action, allowed=(201, 202))
        queue_path = urlsplit(location or "").path.rstrip("/")
        if not queue_path.startswith("/queue/item/"):
            raise RuntimeError("Jenkins aceptó la petición. Consulta la cola en el job " + JOB)
    else:
        queue_path = None
    deadline = time.monotonic() + 3600
    number = last["number"] if last else None
    while queue_path and time.monotonic() < deadline:
        item = api.get(queue_path + "/api/json")
        if item.get("cancelled"):
            raise RuntimeError("Se canceló la ejecución en cola")
        if item.get("executable"):
            number = item["executable"]["number"]
            queue_path = None
        else:
            time.sleep(3)
    if queue_path or number is None:
        raise RuntimeError("Jenkins aún no asigna ejecutor. Consulta la cola del job.")
    print(f"JENKINS=http://127.0.0.1:{api.port}{path}/{number}/", flush=True)
    while time.monotonic() < deadline:
        status = api.get(f"{path}/{number}/api/json?tree=building,result")
        if not status["building"] and status["result"]:
            if status["result"] != "SUCCESS":
                raise RuntimeError("Jenkins terminó " + status["result"] + ". Consulta Console Output.")
            print("JENKINS_BUILD=SUCCESS", flush=True)
            return
        time.sleep(5)
    raise RuntimeError("El build sigue activo. La URL anterior permite continuar el seguimiento.")


def main():
    cli = argparse.ArgumentParser(description=__doc__)
    cli.add_argument("--usuario-jenkins")
    cli.add_argument("--puerto-jenkins", type=int, default=8080)
    cli.add_argument("--puerto-gitea", type=int, default=3000)
    cli.add_argument("--credencial", default="gitea-cred")
    cli.add_argument("--red")
    cli.add_argument("--solo-validar", action="store_true")
    cli.add_argument("--reintentar", action="store_true", help="programar otro build si el anterior terminó")
    args = cli.parse_args()
    user = args.usuario_jenkins or input("Usuario de Jenkins: ").strip()
    token = getpass.getpass("Token API de Jenkins local: ")
    auth = "Basic " + base64.b64encode((user + ":" + token).encode()).decode()
    jenkins = LocalAPI(args.puerto_jenkins, auth)
    check_jenkins(jenkins)
    if args.solo_validar:
        return
    net = network(args.red)
    gitea = LocalAPI(args.puerto_gitea, "token " + getpass.getpass("Token de Gitea local para crear/sincronizar el espejo: "))
    remote = mirror(gitea)
    job(jenkins, remote, args.credencial)
    env = {**os.environ, "RED_CI": net}
    subprocess.run(["docker", "compose", "-p", "smartrh-devops-vista", "-f",
                    str(LAB / "compose.yaml"), "up", "-d"], check=True, env=env)
    wait_build(jenkins, JOB_PATH, args.reintentar)
    conn = http.client.HTTPConnection("127.0.0.1", 8094, timeout=10)
    try:
        conn.request("GET", "/expo/index.html")
        response = conn.getresponse()
        if response.status != 200 or b"connect-src 'none'" not in response.read():
            raise RuntimeError("El build pasó, pero la demo aún no responde desde la Mac en el puerto 8094")
    finally:
        conn.close()
    print("DEMO_LOCAL=http://127.0.0.1:8094/expo/", flush=True)


if __name__ == "__main__":
    try:
        main()
    except (OSError, ValueError, RuntimeError, subprocess.CalledProcessError) as error:
        sys.exit("CONFIGURACION_DETENIDA=" + str(error))
