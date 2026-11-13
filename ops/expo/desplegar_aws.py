#!/usr/bin/env python3
"""Publica únicamente expo/ en el bucket actual; sin backend, BD ni IAM."""
import argparse, hashlib, json, mimetypes, re, sys, time, urllib.request, uuid
from pathlib import Path, PurePosixPath
ROOT = Path(__file__).resolve().parent
ACCOUNT = '682530816594'
REGION = 'us-east-1'
BUCKET = 'smarth-rh-web-682530816594'
DISTRIBUTION = 'EDLKY9F4USEOH'
PUBLIC_URL = 'https://portal.smart-rh.com.mx/expo/index.html'


def require(value, message):
    if not value:
        raise RuntimeError(message)


def sha(data):
    return hashlib.sha256(data).hexdigest()


def safe_name(name):
    parts = PurePosixPath(name).parts
    require(isinstance(name, str) and bool(name) and not name.startswith('/') and '\\' not in name and all(p not in ('.', '..', '') for p in parts), 'RUTA_NO_PERMITIDA')
    require(name == str(PurePosixPath(name)), 'RUTA_NO_CANONICA')
    return name


def allowed_key(name):
    return 'expo/' + safe_name(name)


def verify_package(root=ROOT):
    hashes = json.loads((root / 'SHA256.json').read_text())
    require(isinstance(hashes, dict) and hashes, 'MANIFIESTO_VACIO')
    for name, expected in hashes.items():
        safe_name(name)
        require(sha((root / name).read_bytes()) == expected, 'PAQUETE_ALTERADO_' + name)
    manifest = json.loads((root / 'manifest.json').read_text())
    files = manifest['web_files']
    require('index.html' in files and len(files) >= 6, 'BUILD_INCOMPLETO')
    for name, expected in files.items():
        key = allowed_key(name)
        require(key.startswith('expo/'), 'PREFIJO_INCORRECTO')
        require(sha((root / 'web-dist' / name).read_bytes()) == expected, 'BUILD_ALTERADO_' + name)
    html = (root / 'web-dist/index.html').read_text()
    for policy in ["connect-src 'none'", "form-action 'none'", "base-uri 'none'"]:
        require(policy in html, 'AISLAMIENTO_NO_CONFIRMADO')
    require('production_commit' in manifest and re.fullmatch('[a-f0-9]{40}', manifest['production_commit']) is not None, 'FALTA_COMMIT_INTEGRADO')
    return manifest


def current(s3, key):
    try:
        item = s3.get_object(Bucket=BUCKET, Key=key)
        item['bytes'] = item['Body'].read()
        return item
    except Exception as error:
        if getattr(error, 'response', {}).get('Error', {}).get('Code') in ('NoSuchKey', '404', 'NotFound'):
            return None
        raise


def put(s3, key, body, before=None, **options):
    require(key.startswith('expo/'), 'ESCRITURA_FUERA_DE_EXPO')
    condition = {'IfMatch': before['ETag']} if before else {'IfNoneMatch': '*'}
    return s3.put_object(Bucket=BUCKET, Key=key, Body=body, **condition, **options)


def readiness():
    with urllib.request.urlopen('https://api.smart-rh.com.mx/ready', timeout=15) as response:
        payload = json.load(response)
    require(payload.get('ok') is True and payload.get('mysql') == 'ok' and payload.get('mongo') == 'ok', 'READINESS_NO_DISPONIBLE')


def preflight(s3, cf):
    config = cf.get_distribution(Id=DISTRIBUTION)['Distribution']['DistributionConfig']
    require('portal.smart-rh.com.mx' in config.get('Aliases', {}).get('Items', []), 'ALIAS_AWS_INCORRECTO')
    origins = config['Origins']['Items']
    require(any(o['DomainName'].split('.')[0] == BUCKET and not o.get('OriginPath') for o in origins), 'ORIGEN_AWS_INCORRECTO')
    root = current(s3, 'index.html')
    require(root is not None, 'PORTAL_PRINCIPAL_NO_ENCONTRADO')
    shape = s3.meta.service_model.operation_model('PutObject').input_shape.members
    require('IfMatch' in shape and 'IfNoneMatch' in shape, 'BOTO3_REQUIERE_ESCRITURAS_CONDICIONALES')
    return root


def invalidate(cf, run_id):
    return cf.create_invalidation(DistributionId=DISTRIBUTION, InvalidationBatch={'Paths': {'Quantity': 1, 'Items': ['/expo/*']}, 'CallerReference': 'expo-' + run_id})['Invalidation']['Id']


def publish(s3, cf, manifest, root_before, run_id, report, directory=ROOT):
    before = {name: current(s3, allowed_key(name)) for name in manifest['web_files']}
    report['backup_prefix'] = 'backups/expo/' + run_id + '/'
    # Todos los respaldos se crean antes de reemplazar cualquier archivo.
    for name, old in before.items():
        if old is None:
            continue
        key = allowed_key(name)
        s3.copy_object(Bucket=BUCKET, Key=report['backup_prefix'] + name, CopySource={'Bucket': BUCKET, 'Key': key}, CopySourceIfMatch=old['ETag'])
    written = {}
    try:
        for name in sorted(manifest['web_files'], key=lambda n: n == 'index.html'):
            key = allowed_key(name)
            old = before[name]
            body = (directory / 'web-dist' / name).read_bytes()
            if old is not None and sha(old['bytes']) == sha(body):
                continue
            if name == 'index.html':
                require(current(s3, 'index.html')['ETag'] == root_before['ETag'], 'PORTAL_CAMBIO_DURANTE_PUBLICACION')
            response = put(s3, key, body, old, ContentType=mimetypes.guess_type(name)[0] or 'application/octet-stream', CacheControl='no-cache' if not name.startswith('assets/') else 'public,max-age=31536000,immutable', Metadata={'expo-source-commit': manifest['production_commit']})
            written[name] = response['ETag']
            require(sha(current(s3, key)['bytes']) == manifest['web_files'][name], 'VERIFICACION_S3_FALLO_' + name)
        require(current(s3, 'index.html')['bytes'] == root_before['bytes'], 'PORTAL_PRINCIPAL_CAMBIO')
        report['invalidation'] = invalidate(cf, run_id)
        report['uploaded'] = True
    except BaseException:
        ok = True
        for name, etag in reversed(list(written.items())):
            try:
                key = allowed_key(name)
                now = current(s3, key)
                require(now is not None and now['ETag'] == etag, 'OBJETO_CAMBIO_TRAS_PUBLICACION')
                old = before[name]
                if old is not None:
                    options = {k: old[k] for k in ['ContentType', 'CacheControl', 'Metadata', 'ContentEncoding', 'ContentDisposition'] if k in old}
                    put(s3, key, old['bytes'], now, **options)
                elif name == 'index.html':
                    # No se elimina ningún archivo: una página de mantenimiento sustituye
                    # al índice nuevo cuando antes no existía publicación de Expo.
                    put(s3, key, b'<!doctype html><html lang="es"><meta charset="utf-8"><title>SMART RH</title><p>Demostracion temporalmente no disponible.</p></html>', now, ContentType='text/html', CacheControl='no-cache')
            except Exception:
                ok = False
        try:
            if written:
                invalidate(cf, run_id + '-rollback')
        except Exception:
            ok = False
        report['rollback'] = 'OK' if ok else 'REQUIERE_REVISION'
        raise


def verify_public(cf, manifest, report):
    deadline = time.monotonic() + 240
    while time.monotonic() < deadline:
        if cf.get_invalidation(DistributionId=DISTRIBUTION, Id=report['invalidation'])['Invalidation']['Status'] == 'Completed':
            break
        time.sleep(4)
    else:
        report['cdn_pending'] = True
        raise RuntimeError('PUBLICADO_EN_S3_CDN_PENDIENTE; ejecuta de nuevo --verificar')
    for name, expected in manifest['web_files'].items():
        url = PUBLIC_URL.rsplit('/', 1)[0] + '/' + name + '?verificar=' + report['run_id']
        last_error = None
        for attempt in range(3):
            try:
                with urllib.request.urlopen(url, timeout=20) as response:
                    require(sha(response.read()) == expected, 'ARCHIVO_PUBLICO_DIFIERE_' + name)
                last_error = None
                break
            except Exception as error:
                last_error = error
                time.sleep(2)
        require(last_error is None, 'NO_SE_CONFIRMARON_TODOS_LOS_ARCHIVOS_PUBLICOS_' + name)
    readiness()
    report['completed'] = True


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--apply', action='store_true')
    parser.add_argument('--check-package', action='store_true')
    parser.add_argument('--verificar', action='store_true')
    parser.add_argument('--retirar', action='store_true', help='Sustituye solo expo/index.html por un aviso de cierre; conserva respaldo.')
    args = parser.parse_args()
    manifest = verify_package()
    print('PAQUETE_VERIFICADO=OK', flush=True)
    if args.check_package:
        return
    require(sum([args.apply, args.verificar, args.retirar]) == 1, 'ELIGE_APPLY_VERIFICAR_O_RETIRAR')
    import boto3
    session = boto3.Session(region_name=REGION)
    require(session.client('sts').get_caller_identity()['Account'] == ACCOUNT, 'CUENTA_AWS_INCORRECTA')
    s3, cf = session.client('s3'), session.client('cloudfront')
    readiness()
    root_before = preflight(s3, cf)
    report = {'run_id': uuid.uuid4().hex, 'production_commit': manifest['production_commit'], 'completed': False, 'uploaded': False}
    path = ROOT / ('resultado-' + report['run_id'] + '.json')
    try:
        if args.retirar:
            old = current(s3, 'expo/index.html')
            require(old is not None, 'NO_HAY_DEMO_PUBLICADA')
            report['backup_prefix'] = 'backups/expo/' + report['run_id'] + '/'
            s3.copy_object(Bucket=BUCKET, Key=report['backup_prefix'] + 'index.html', CopySource={'Bucket': BUCKET, 'Key': 'expo/index.html'}, CopySourceIfMatch=old['ETag'])
            closed = '<!doctype html><html lang="es"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>SMART RH | Demostración cerrada</title><h1>SMART RH</h1><p>El periodo de demostración para evaluadores ha concluido.</p></html>'.encode()
            put(s3, 'expo/index.html', closed, old, ContentType='text/html', CacheControl='no-cache')
            manifest = {**manifest, 'web_files': {'index.html': sha(closed)}}
            report['retired'] = True
            report['invalidation'] = invalidate(cf, report['run_id'])
        elif args.verificar:
            report['invalidation'] = invalidate(cf, report['run_id'])
        else:
            print('PRECHECK_PORTAL_Y_API=OK', flush=True)
            publish(s3, cf, manifest, root_before, report['run_id'], report)
            print('DEMO_S3_PUBLICADA=OK', flush=True)
        print('INVALIDACION_CLOUDFRONT=' + report['invalidation'], flush=True)
        verify_public(cf, manifest, report)
        require(current(s3, 'index.html')['bytes'] == root_before['bytes'], 'PORTAL_CAMBIO_EN_LA_VERIFICACION')
        print('PORTAL_PRINCIPAL_CONSERVADO=OK\nREADINESS_PUBLICO=OK\nDEMO_PUBLICA_VERIFICADA=OK', flush=True)
        print(('DEMO_RETIRADA=' if args.retirar else 'URL_PARA_COMPARTIR=') + PUBLIC_URL, flush=True)
    finally:
        path.write_text(json.dumps(report, indent=2) + '\n')
        print('REPORTE=' + str(path), flush=True)


if __name__ == '__main__':
    try:
        main()
    except Exception as error:
        if isinstance(error, RuntimeError):
            message = str(error)
        elif hasattr(error, 'response'):
            message = 'AWS_' + str(error.response.get('Error', {}).get('Code', 'ERROR'))
        else:
            message = type(error).__name__
        print('PUBLICACION_DETENIDA=' + message, flush=True)
        sys.exit(1)
