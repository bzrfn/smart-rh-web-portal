"""Prepara, prueba y empaqueta una misma compilación de la demo de Expo Ingenierías."""
import argparse
import fcntl
import hashlib
import importlib.util
import json
import os
import re
import shutil
import tempfile
import urllib.error
import urllib.parse
import urllib.request
import zipfile
from pathlib import Path

OPS = Path(__file__).resolve().parent
DEPLOYER = OPS.parent / "expo" / "desplegar_aws.py"
REVISION = re.compile(r"[0-9a-f]{40}-[0-9a-f]{64}\Z")


def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def documents(folder):
    result = {}
    for item in sorted(folder.rglob("*")):
        if item.is_symlink():
            raise ValueError(f"Enlace inesperado en la compilación: {item.name}")
        if item.is_file():
            result[item.relative_to(folder).as_posix()] = digest(item)
    return result


def write_json(path, data):
    with tempfile.NamedTemporaryFile(dir=path.parent, delete=False, mode="w") as writer:
        json.dump(data, writer, ensure_ascii=False, indent=2)
        writer.write("\n")
    os.replace(writer.name, path)


def validate(package):
    spec = importlib.util.spec_from_file_location("expo_deploy", DEPLOYER)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    record = module.verify_package(package)
    if documents(package / "web-dist") != record["web_files"]:
        raise ValueError("El contenido difiere del inventario")
    if digest(package / "desplegar_aws.py") != digest(DEPLOYER):
        raise ValueError("El publicador difiere del revisado")
    return record


def prepare(dist, package, commit):
    if not re.fullmatch("[0-9a-f]{40}", commit) or not (dist / "index.html").is_file():
        raise ValueError("Se necesita la compilación de la demo y el SHA completo")
    files = documents(dist)
    package.parent.mkdir(parents=True, exist_ok=True)
    with tempfile.TemporaryDirectory(dir=package.parent) as tmp:
        candidate = Path(tmp) / "candidate"
        candidate.mkdir()
        shutil.copytree(dist, candidate / "web-dist")
        shutil.copyfile(DEPLOYER, candidate / "desplegar_aws.py")
        write_json(candidate / "manifest.json", {"production_commit": commit, "web_files": files})
        write_json(candidate / "SHA256.json", documents(candidate))
        validate(candidate)
        if package.exists():
            if documents(package) != documents(candidate):
                raise ValueError("El directorio de salida ya contiene otro candidato")
        else:
            candidate.rename(package)


def key_for(manifest):
    listing = json.dumps(manifest["web_files"], sort_keys=True).encode()
    return manifest["production_commit"] + "-" + hashlib.sha256(listing).hexdigest()


def pointer(root):
    link = root / "expo"
    if not link.is_symlink():
        if link.exists():
            raise ValueError("La ruta expo ya pertenece a otro contenido")
        return None
    target = os.readlink(link)
    if not target.startswith("releases/") or not REVISION.fullmatch(target[9:]):
        raise ValueError("La ruta activa no pertenece al staging")
    return target[9:]


def switch(root, revision):
    if revision is None:
        (root / "expo").unlink(missing_ok=True)
        return
    if not REVISION.fullmatch(revision) or not (root / "releases" / revision).is_dir():
        raise ValueError("Revisión de staging desconocida")
    with tempfile.TemporaryDirectory(dir=root) as tmp:
        link = Path(tmp) / "new"
        link.symlink_to("releases/" + revision)
        os.replace(link, root / "expo")


def smoke(base, path, files):
    opener = urllib.request.build_opener(urllib.request.ProxyHandler({}))
    for name, expected in files.items():
        url = base.rstrip("/") + "/" + path + "/" + urllib.parse.quote(name, safe="/")
        with opener.open(url, timeout=8) as response:
            if response.status != 200 or hashlib.sha256(response.read()).hexdigest() != expected:
                raise RuntimeError(f"Contenido HTTP inesperado en {name}")


def register(root, package):
    manifest = validate(package)
    key = key_for(manifest)
    dest = root / "releases" / key
    if not dest.exists():
        with tempfile.TemporaryDirectory(dir=dest.parent) as tmp:
            tree = Path(tmp) / "files"
            shutil.copytree(package / "web-dist", tree)
            tree.chmod(0o755)
            for path in tree.rglob("*"):
                path.chmod(0o755 if path.is_dir() else 0o644)
            os.rename(tree, dest)
    if documents(dest) != manifest["web_files"]:
        raise RuntimeError("Los archivos de staging difieren del candidato")
    write_json(root / ".estado" / (key + ".json"), manifest["web_files"])
    return key


def activate(root, base, package=None):
    state = root / ".estado"
    state.mkdir(mode=0o700, parents=True, exist_ok=True)
    (root / "releases").mkdir(exist_ok=True)
    (root / "releases").chmod(0o755)
    journal = state / "pendiente.json"
    last = state / "anterior.json"

    def verify(key, channel):
        files = json.loads((state / (key + ".json")).read_text())
        smoke(base, channel, files)

    def restore(previous):
        switch(root, previous)
        if previous is not None:
            verify(previous, "expo")
        else:
            opener = urllib.request.build_opener(urllib.request.ProxyHandler({}))
            try:
                with opener.open(base.rstrip("/") + "/expo/index.html", timeout=8):
                    raise RuntimeError("El primer candidato fallido continúa visible")
            except urllib.error.HTTPError as err:
                if err.code != 404:
                    raise

    with (state / "lock").open("a") as lock:
        fcntl.flock(lock, fcntl.LOCK_EX)
        if journal.exists():
            transaction = json.loads(journal.read_text())
            if pointer(root) not in (transaction["before"], transaction["after"]):
                raise RuntimeError("El staging cambió durante una promoción interrumpida")
            restore(transaction["before"])
            write_json(last, transaction["old_previous"])
            journal.unlink()
        previous = pointer(root)
        prior_history = json.loads(last.read_text()) if last.exists() else None
        target = register(root, package) if package else prior_history
        if not target or not REVISION.fullmatch(target):
            raise ValueError("Aún no existe una versión anterior para recuperar")
        verify(target, "releases/" + target)
        if previous != target:
            write_json(journal, {"before": previous, "after": target, "old_previous": prior_history})
            try:
                switch(root, target)
                verify(target, "expo")
                write_json(last, previous)
            except BaseException:
                restore(previous)
                write_json(last, prior_history)
                journal.unlink()
                raise
            journal.unlink()
        else:
            verify(target, "expo")
        return {"version_activa": target, "version_previa": previous, "http_sha256": "ok"}


def package_zip(package, receipt, out):
    info = validate(package)
    receipt_data = json.loads(receipt.read_text())
    key = key_for(info)
    if receipt_data.get("version_activa") != key or receipt_data.get("http_sha256") != "ok":
        raise ValueError("El candidato difiere de la entrega probada por HTTP")
    name = "SMART_RH_Expo_AWS_" + info["production_commit"][:12]
    out.mkdir(parents=True, exist_ok=True)
    archive = out / (name + ".zip")
    with tempfile.TemporaryDirectory(dir=out) as tmp:
        completed = Path(tmp) / archive.name
        with zipfile.ZipFile(completed, "w", compression=zipfile.ZIP_DEFLATED) as zipped:
            for path in sorted(package.rglob("*")):
                if path.is_file():
                    zipped.write(path, name + "/" + path.relative_to(package).as_posix())
        os.replace(completed, archive)
    (out / (archive.name + ".sha256")).write_text(digest(archive) + "  " + archive.name + "\n")
    print(archive)


def main():
    parser = argparse.ArgumentParser()
    subs = parser.add_subparsers(dest="operation", required=True)
    prep = subs.add_parser("preparar")
    prep.add_argument("dist", type=Path)
    prep.add_argument("package", type=Path)
    prep.add_argument("commit")
    for action in ("staging", "revertir"):
        phase = subs.add_parser(action)
        phase.add_argument("root", type=Path)
        phase.add_argument("base")
        phase.add_argument("receipt", type=Path)
        if action == "staging":
            phase.add_argument("package", type=Path)
    pack = subs.add_parser("empaquetar")
    for arg in ("package", "receipt", "out"):
        pack.add_argument(arg, type=Path)
    args = parser.parse_args()
    if args.operation == "preparar":
        prepare(args.dist, args.package, args.commit)
    elif args.operation == "empaquetar":
        package_zip(args.package, args.receipt, args.out)
    else:
        result = activate(args.root, args.base, getattr(args, "package", None))
        write_json(args.receipt, result)
        print(json.dumps(result))


if __name__ == "__main__":
    main()
