import hashlib,os,re,json,sys
root=sys.argv[1]
H=lambda p:hashlib.sha1(open(os.path.join(root,p),'rb').read()).hexdigest()[:8]
assets={}
for d,_,fs in os.walk(os.path.join(root,'assets')):
    for f in fs:
        rel=os.path.relpath(os.path.join(d,f),root).replace(os.sep,'/')
        assets[rel]=H(rel)
for name in sorted(os.listdir(os.path.join(root,'css'))):
    if not name.endswith('.css'):continue
    css=os.path.join(root,'css',name)
    s=open(css,encoding='utf-8').read()
    s=re.sub(r"url\(\.\./(assets/[^)?]+)(\?v=[0-9a-f]+)?\)",lambda m:f"url(../{m.group(1)}?v={assets[m.group(1)]})",s)
    open(css,'w',encoding='utf-8').write(s)
open(os.path.join(root,'js/assetv.js'),'w').write('const ASSET_V='+json.dumps(assets,separators=(',',':'),sort_keys=True)+';\n')
idx=os.path.join(root,'index.html')
s=open(idx,encoding='utf-8').read()
def fix(m):
    attr,path=m.group(1),m.group(2)
    return f'{attr}="{path}?v={H(path)}"'
s=re.sub(r'(src|href)="((?:js|css)/[^"?]+)(?:\?v=[0-9a-f]+)?"',fix,s)
s=re.sub(r'src="(assets/[^"?]+)(?:\?v=[0-9a-f]+)?"',lambda m:f'src="{m.group(1)}?v={assets[m.group(1)]}"',s)
open(idx,'w',encoding='utf-8').write(s)
print('stamped',len(assets),'assets')
