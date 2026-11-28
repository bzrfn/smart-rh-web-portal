"""Traduce los resultados de Jest al formato que publica Jenkins."""
import json
import re
import sys
import xml.etree.ElementTree as ET
from pathlib import Path


def report(source, target):
    data = json.loads(source.read_text())
    if not data.get("numTotalTests") and not data.get("numFailedTestSuites"):
        raise ValueError("Jest no ejecutó pruebas")
    root = ET.Element("testsuites")
    for suite in data["testResults"]:
        node = ET.SubElement(root, "testsuite", name=Path(suite["name"]).name)
        tests = suite["assertionResults"]
        for test in tests:
            case = ET.SubElement(node, "testcase", name=test["title"],
                                 classname=" / ".join(test["ancestorTitles"]) or node.get("name"),
                                 time=str((test.get("duration") or 0) / 1000))
            if test["status"] == "failed":
                ET.SubElement(case, "failure").text = "\n".join(test.get("failureMessages", []))
            elif test["status"] != "passed":
                ET.SubElement(case, "skipped")
        if suite.get("status") == "failed" and not tests:
            case = ET.SubElement(node, "testcase", name="Carga de la suite")
            ET.SubElement(case, "error").text = suite.get("message", "Falló la suite")
        node.set("tests", str(len(node.findall("testcase"))))
        node.set("failures", str(len(node.findall("testcase/failure"))))
        node.set("errors", str(len(node.findall("testcase/error"))))
        node.set("skipped", str(len(node.findall("testcase/skipped"))))
    for attr in ('tests', 'failures', 'errors', 'skipped'):
        root.set(attr, str(sum(int(n.get(attr, '0')) for n in root)))
    # Jest puede incluir colores ANSI en las trazas de una prueba fallida.
    xml = ET.tostring(root, encoding="unicode")
    clean = re.sub(r"[^\x09\x0a\x0d\x20-\ud7ff\ue000-\ufffd\U00010000-\U0010ffff]", "", xml)
    target.write_text(clean, encoding="utf-8")


if __name__ == "__main__":
    report(Path(sys.argv[1]), Path(sys.argv[2]))
