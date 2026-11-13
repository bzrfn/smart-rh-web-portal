import copy, hashlib, importlib.util, io, json, tempfile, unittest
from pathlib import Path
from types import SimpleNamespace
spec=importlib.util.spec_from_file_location('deploy',Path(__file__).with_name('desplegar_aws.py'));deploy=importlib.util.module_from_spec(spec);spec.loader.exec_module(deploy)
class Missing(Exception):
    response={'Error':{'Code':'NoSuchKey'}}
class Store:
    def __init__(self):
        self.data={'index.html':{'bytes':b'PRODUCTION','ETag':'root'}};self.puts=[];self.copies=[];self.fail=None
        self.meta=SimpleNamespace(service_model=SimpleNamespace(operation_model=lambda _:SimpleNamespace(input_shape=SimpleNamespace(members={'IfMatch':1,'IfNoneMatch':1}))))
    def get_object(self,**kw):
        if kw['Key'] not in self.data:raise Missing()
        v=copy.deepcopy(self.data[kw['Key']]);v['Body']=io.BytesIO(v['bytes']);return v
    def put_object(self,**kw):
        key=kw['Key'];self.puts.append(key)
        if key==self.fail:raise RuntimeError('WRITE_FAILED')
        old=self.data.get(key)
        if old:assert kw.get('IfMatch')==old['ETag']
        else:assert kw.get('IfNoneMatch')=='*'
        etag=hashlib.md5(kw['Body']).hexdigest();self.data[key]={'bytes':kw['Body'],'ETag':etag,'ContentType':kw.get('ContentType','application/octet-stream')};return {'ETag':etag}
    def copy_object(self,**kw):
        assert kw['Key'].startswith('backups/expo/');self.copies.append(kw);self.data[kw['Key']]=copy.deepcopy(self.data[kw['CopySource']['Key']])
class CDN:
    def __init__(self):self.paths=[]
    def create_invalidation(self,**kw):self.paths.append(kw['InvalidationBatch']['Paths']['Items']);return {'Invalidation':{'Id':'test'}}
    def get_distribution(self,**kw):return {'Distribution':{'DistributionConfig':{'Aliases':{'Items':['portal.smart-rh.com.mx']},'Origins':{'Items':[{'DomainName':deploy.BUCKET+'.s3.amazonaws.com'}]}}}}
class Tests(unittest.TestCase):
    def fixture(self,root):
        d=root/'web-dist';d.mkdir();(d/'assets').mkdir();(d/'assets/x.js').write_bytes(b'const demo=true;');(d/'index.html').write_bytes(b'DEMO');return {'production_commit':'a'*40,'web_files':{'index.html':deploy.sha(b'DEMO'),'assets/x.js':deploy.sha(b'const demo=true;')}}
    def test_paths(self):
        for value in ['../index.html','/index.html','assets/../../x','a\\b','a//b','./index.html']:
            with self.assertRaises(RuntimeError):deploy.allowed_key(value)
        self.assertEqual(deploy.allowed_key('index.html'),'expo/index.html')
    def test_outside_prefix_is_rejected(self):
        with self.assertRaises(RuntimeError):deploy.put(Store(),'index.html',b'bad')
    def test_preflight(self):
        self.assertEqual(deploy.preflight(Store(),CDN())['bytes'],b'PRODUCTION')
    def test_publish_only_expo_and_index_last(self):
        with tempfile.TemporaryDirectory() as tmp:
            root=Path(tmp);m=self.fixture(root);s=Store();cf=CDN();report={};deploy.publish(s,cf,m,deploy.current(s,'index.html'),'run',report,root)
            self.assertEqual(s.puts,['expo/assets/x.js','expo/index.html']);self.assertEqual(s.data['index.html']['bytes'],b'PRODUCTION');self.assertEqual(cf.paths,[['/expo/*']]);self.assertTrue(report['uploaded'])
    def test_failure_preserves_root_and_previous_demo(self):
        with tempfile.TemporaryDirectory() as tmp:
            root=Path(tmp);m=self.fixture(root);s=Store();s.data['expo/index.html']={'bytes':b'OLD_DEMO','ETag':'old'};s.fail='expo/assets/x.js';report={}
            with self.assertRaises(RuntimeError):deploy.publish(s,CDN(),m,deploy.current(s,'index.html'),'run',report,root)
            self.assertEqual(s.data['index.html']['bytes'],b'PRODUCTION');self.assertEqual(s.data['expo/index.html']['bytes'],b'OLD_DEMO');self.assertEqual(report['rollback'],'OK')
    def test_partial_replacement_restores_asset(self):
        with tempfile.TemporaryDirectory() as tmp:
            root=Path(tmp);m=self.fixture(root);s=Store();s.data['expo/assets/x.js']={'bytes':b'OLD','ETag':'old'};s.fail='expo/index.html';report={}
            with self.assertRaises(RuntimeError):deploy.publish(s,CDN(),m,deploy.current(s,'index.html'),'run',report,root)
            self.assertEqual(s.data['expo/assets/x.js']['bytes'],b'OLD');self.assertEqual(s.data['index.html']['bytes'],b'PRODUCTION');self.assertEqual(report['rollback'],'OK')
    def test_identical_rerun_does_not_replace(self):
        with tempfile.TemporaryDirectory() as tmp:
            root=Path(tmp);m=self.fixture(root);s=Store();cf=CDN();deploy.publish(s,cf,m,deploy.current(s,'index.html'),'a',{},root);s.puts=[];deploy.publish(s,cf,m,deploy.current(s,'index.html'),'b',{},root);self.assertEqual(s.puts,[])
    def test_concurrent_root_change_stops_index(self):
        with tempfile.TemporaryDirectory() as tmp:
            root=Path(tmp);m=self.fixture(root);s=Store();original=deploy.current(s,'index.html');s.data['index.html']={'bytes':b'OTHER','ETag':'other'}
            with self.assertRaises(RuntimeError):deploy.publish(s,CDN(),m,original,'run',{},root)
            self.assertNotIn('expo/index.html',s.puts);self.assertEqual(s.data['index.html']['bytes'],b'OTHER')
if __name__=='__main__':unittest.main()
