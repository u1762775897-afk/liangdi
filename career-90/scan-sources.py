"""Public source reachability audit. An accessible entry is never a verified vacancy."""
import concurrent.futures, datetime, hashlib, html, json, pathlib, re, time, urllib.request, urllib.error
from urllib.parse import urlsplit, urljoin
ROOT=pathlib.Path(__file__).resolve().parent
data=json.loads((ROOT/'sources.js').read_text().split('=',1)[1].strip().rstrip(';'))
sources={}
for g in data['groups']:
    for row in g['items']:
        u=row[1].strip()
        if u not in sources: sources[u]={'name':row[0],'url':u,'region':row[2],'groups':[],'attempts':[]}
        sources[u]['groups'].append(g['name'])
def check(s,round_no):
    t=time.monotonic(); a={'round':round_no,'at':datetime.datetime.now(datetime.timezone.utc).isoformat()}
    try:
        req=urllib.request.Request(s['url'],headers={'User-Agent':'LiangDiCareerSourceAudit/1.0 (public recruitment source checking)','Accept':'text/html,application/pdf;q=0.8,*/*;q=0.5'})
        with urllib.request.urlopen(req,timeout=12) as r:
            a.update(http=r.status,finalUrl=r.url,contentType=r.headers.get('Content-Type',''))
            raw=r.read(350000); charset=r.headers.get_content_charset() or 'utf-8'
        text=raw.decode(charset,errors='replace')
        a['bytesRead']=len(raw);a['sha256']=hashlib.sha256(raw).hexdigest()
        title=re.search(r'<title[^>]*>(.*?)</title>',text,re.I|re.S)
        a['title']=html.unescape(re.sub('<[^>]+>','',title.group(1))).strip()[:160] if title else ''
        clean=html.unescape(re.sub('<[^>]+>',' ',re.sub(r'<(script|style)\b[^>]*>.*?</\1>','',text,flags=re.I|re.S)))
        clean=re.sub(r'\s+',' ',clean).strip()
        gate=bool(re.search(r'访问过于频繁|安全验证|人机验证|访问受限|请完成验证|Access Denied|Checking your browser|Just a moment',a['title']+' '+clean[:500],re.I))
        shell=len(clean)<100 or bool(re.search(r'\{\{\s*(online|job|warningText)',text))
        a['state']='protected' if gate else 'dynamic_shell' if shell else 'accessible'
        a['excerpt']=clean[:220] if not gate else '安全限制页；未绕过'
        links=[]
        for href,label in re.findall(r'<a\b[^>]*href=[\"\']([^\"\']+)[\"\'][^>]*>(.*?)</a>',text,re.I|re.S):
            label=html.unescape(re.sub('<[^>]+>','',label)).strip()
            if re.search(r'招聘|岗位|人才|人事|音乐|声乐|招生|合唱',label) and href and not href.startswith(('javascript:','#')):
                full=urljoin(a['finalUrl'],href)
                if full.startswith(('http://','https://')):links.append({'title':label[:120],'url':full})
        a['discoveredLinks']=links[:20]
    except urllib.error.HTTPError as e:
        a.update(http=e.code,state='protected' if e.code in (401,403,429,444) else 'http_error',error=str(e)[:200])
    except Exception as e:a.update(state='network_error',error=str(e)[:200])
    a['elapsedSeconds']=round(time.monotonic()-t,2)
    return a
rounds=[]
pending=list(sources.values())
for n in range(1,4):
    if not pending:break
    with concurrent.futures.ThreadPoolExecutor(max_workers=6) as pool:
        for s,a in zip(pending,pool.map(lambda x:check(x,n),pending)):s['attempts'].append(a)
    rounds.append({'round':n,'attempted':len(pending),'accessible':sum(s['attempts'][-1]['state']=='accessible' for s in pending)})
    print(json.dumps(rounds[-1]),flush=True)
    # Respect explicit safety limits: do not hammer protected sites. Shells and transient failures get later-round attempts.
    pending=[s for s in sources.values() if s['attempts'][-1]['state'] not in ('accessible','protected')]
    if pending and n<3:time.sleep(2)
rows=list(sources.values());counts={}
for s in rows:
    s['state']=s['attempts'][-1]['state'];counts[s['state']]=counts.get(s['state'],0)+1
report={'date':datetime.datetime.now(datetime.timezone(datetime.timedelta(hours=8))).strftime('%Y-%m-%d'),'kind':'three-round-entry-audit','catalogRecords':sum(len(g['items']) for g in data['groups']),'uniqueUrls':len(rows),'rounds':rounds,'attempts':sum(len(s['attempts']) for s in rows),'counts':counts,'announcementBodiesVerified':0,'attachmentsRead':0,'newQualifiedJobs':0,'limits':'本次为入口访问与招聘链接发现，不等同逐站岗位正文和附件核验。安全限制停止自动请求；保留未完成队列供下轮用官方公开替代来源复核。不绕过验证，不提交求职材料。','sources':rows}
(ROOT/'scan-report.json').write_text(json.dumps(report,ensure_ascii=False,indent=2))
(ROOT/'scan-report.js').write_text('window.CAREER_ACCESS_REPORT='+json.dumps(report,ensure_ascii=False)+';\n')
print(json.dumps({k:v for k,v in report.items() if k!='sources'},ensure_ascii=False),flush=True)
