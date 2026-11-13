(function(){
"use strict";
const DB=window.CAREER_SCAN||{verifiedAsOf:"未知",updated:"未更新",jobs:[],meetings:[]};
const JOBS=DB.jobs||[];
const SOURCES=window.CAREER_SOURCES||{groups:[],keywords:{},updated:"未更新"};
const byId=id=>document.getElementById(id);
const esc=s=>String(s==null?"":s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
function load(key){try{return JSON.parse(localStorage.getItem(key)||"[]")}catch(e){return []}}
function store(key,val){try{localStorage.setItem(key,JSON.stringify(val))}catch(e){}}
let starred=load("ld-fav-jobs"), ignored=load("ld-hide-jobs");
let page=["home","teacher","career","study","pay"].includes(location.hash.slice(1))?location.hash.slice(1):"home";
let teacherMode="music",careerMode="recommended",teacherRegion="all",careerRegion="all",teacherLevel="all",teacherNature="all",careerSector="all",searchTeacher="",searchCareer="",teacherSort="recommend",careerSort="recommend",teacherDate="all",careerDate="all",teacherYear="2026",careerYear="2026",showPast=false,onlyFit=false;
let salaryRegion="广东",salaryType="编制教师",salaryYear=1,salaryScenario="基准",salaryExpense=6500;
const validStates=["报名时段","有效性待核","储备待确认"];
const labels={home:"职业导师规划",teacher:"教师招聘",career:"职业招聘",study:"学习规划",pay:"薪酬与晋升"};
const subdesc={home:"只看最重要的机会、学习与下一步。",teacher:"音乐岗位覆盖小学至高校，公告时间与薪酬优先。",career:"企业、国企、事业单位、非教学高校岗位分开。",study:"真实进度，三项重点，一眼看懂。",pay:"广东、浙江、福建及沿海地区的职业薪酬情景曲线。"};
const areaOptions=[["all","全部重点地区"],["prd","珠三角"],["gd","广东"],["zj","浙江"],["fj","福建"],["jzh","江浙沪"],["bj","京津与环渤海"],["other","其他沿海"]];
const tier=(j)=>j.city?.includes("深圳")?100:j.city?.includes("东莞")?95:j.city?.includes("广州")?90:j.city?.includes("佛山")||j.city?.includes("珠海")||j.city?.includes("惠州")?85:j.province==="浙江"&&j.city?.includes("杭州")?80:j.province==="浙江"&&j.city?.includes("宁波")?78:j.province==="浙江"?76:j.province==="福建"?71:j.province==="上海"?68:j.province==="江苏"?65:j.province==="北京"?62:j.province==="天津"?61:j.province==="山东"?60:10;
const todayCN=()=>new Intl.DateTimeFormat("en-CA",{timeZone:"Asia/Shanghai",year:"numeric",month:"2-digit",day:"2-digit"}).format(new Date()).replaceAll("/","-");
const toDate=(d)=>d?new Date(d.slice(0,10)+"T00:00:00+08:00").getTime():null;
const now=()=>Date.now();
const isRecent=(j,n)=>{let t=toDate(j.post);let dif=t==null?100:Math.floor((now()-t)/86400000);return dif>=0&&dif<=n};
const isNewToday=j=>j.post===todayCN();
const enteredThisScan=j=>j.addedBatch===DB.scanBatch;
const deadlineTimestamp=j=>j.deadline?new Date(j.deadline).getTime():j.deadlineDate?new Date(j.deadlineDate+"T23:59:59+08:00").getTime():null;
const daysToDeadline=j=>{let t=deadlineTimestamp(j);return t==null?999:Math.ceil((t-now())/86400000)};
const isUrgent=j=>daysToDeadline(j)>=0&&daysToDeadline(j)<=3;
const isExpired=j=>daysToDeadline(j)<0||/已下线|已截止/.test(j.status||"");
const isOpenOrUnverified=j=>!isExpired(j);
const inArea=(j,key)=>key==="all"||key==="prd"&&(j.province==="广东"&&/(深圳|东莞|广州|佛山|珠海|中山|惠州|江门|肇庆)/.test(j.city||""))||key==="gd"&&j.province==="广东"||key==="zj"&&j.province==="浙江"||key==="fj"&&j.province==="福建"||key==="jzh"&&["浙江","江苏","上海"].includes(j.province)||key==="bj"&&["北京","天津","河北","山东","辽宁"].includes(j.province)||key==="other"&&["海南","广西"].includes(j.province);
const fitCls=j=>j.fit==="较匹配"?"green":/不符|条件偏弱/.test(j.fit||"")?"red":"gold";
function pDate(d){return d?d.slice(0,10).replaceAll("-","."):"待核实"}
function pDeadline(j){if(j.deadline)return j.deadline.slice(0,10).replaceAll("-",".")+" "+j.deadline.slice(11,16);if(j.deadlineDate)return pDate(j.deadlineDate)+"（时点未核）";return "未公布／招满即止"}
function options(items,value){return items.map(x=>'<option value="'+esc(x[0])+'" '+(x[0]===value?"selected":"")+'>'+esc(x[1])+"</option>").join("")}
function stateCounts(){return{music:JOBS.filter(j=>j.type==="teacher"&&j.musicConfirmed).length,career:JOBS.filter(j=>j.type==="career").length,stars:starred.length,urgent:JOBS.filter(j=>j.type==="teacher"&&j.musicConfirmed&&isUrgent(j)).length,added:JOBS.filter(j=>j.type==="teacher"&&j.musicConfirmed&&enteredThisScan(j)&&!isExpired(j)).length}}
function render(){
document.title=labels[page]+"｜职业导师规划";
document.querySelectorAll("[data-nav]").forEach(b=>b.classList.toggle("active",b.dataset.nav===page));
byId("title").textContent=labels[page];byId("subtitle").textContent=subdesc[page];
byId("stamp").textContent="数据核验 "+DB.verifiedAsOf;
let html=page==="home"?renderHome():page==="teacher"?renderRecruitment("teacher"):page==="career"?renderRecruitment("career"):page==="study"?renderStudy():renderPay();
byId("view").innerHTML=html; if(page==="teacher"||page==="career")bindRecruitment(page);if(page==="pay")bindPay();
}
function navigate(tab){if(!labels[tab])tab="home";page=tab;history.replaceState(null,"","#"+tab);render();window.scrollTo(0,0)}
function renderHome(){
const c=stateCounts();
const critical=JOBS.filter(j=>j.type==="teacher"&&j.musicConfirmed&&isUrgent(j)).sort((a,b)=>daysToDeadline(a)-daysToDeadline(b)).slice(0,2);
const recentAdded=JOBS.filter(j=>enteredThisScan(j)&&!isExpired(j)).sort((a,b)=>(b.post||"").localeCompare(a.post||"")).slice(0,6);
const addedRows=recentAdded.length?recentAdded.map(j=>'<div class="minirow new-mini"><span class="dot blue-dot">新</span><div style="flex:1"><b>'+esc(j.org)+' · '+esc(j.title)+'</b><small>'+esc(j.type==="teacher"?"教师招聘":"职业招聘")+' · 公告 '+pDate(j.post)+' · '+esc(j.status||"待核")+'</small></div><button class="btn-outline" data-nav="'+esc(j.type)+'">查看</button></div>').join(""):'<div class="minirow"><span class="dot">✓</span><div><b>本轮没有新增记录</b><small>不会把旧公告冒充新增。</small></div></div>';
let top=critical.length?critical.map(j=>'<div class="minirow"><span class="dot" style="color:#ae3145;background:#fff0f2">!</span><div style="flex:1"><b>'+esc(j.org)+' · '+esc(j.title)+'</b><small>截止 '+pDeadline(j)+' · '+esc(j.fit)+'</small></div><button class="btn-outline" data-nav="teacher">查看</button></div>').join(""):'<div class="minirow"><span class="dot">✓</span><div><b>没有已核实的72小时内截止音乐岗位</b><small>仍可查看其他时间段及资格待核的公告</small></div></div>';
return '<div class="hero"><small>YOUR NEXT MOVE</small><h2>收入、人脉、时间——先看值得投的机会。</h2><p>重点覆盖珠三角、浙江、福建、江浙沪和京津。深圳始终优先排序。</p></div>'+
'<div class="quick"><button data-nav="teacher"><b>▣</b><strong>教师招聘</strong><small>'+c.music+'条已识别音乐岗位</small></button><button data-nav="career"><b>▤</b><strong>职业招聘</strong><small>企业 · 国企 · 事业单位</small></button><button data-nav="study"><b>◷</b><strong>学习进度</strong><small>教综 · 心理学 · 音乐</small></button><button data-nav="pay"><b>¥</b><strong>薪酬曲线</strong><small>滑动看30年职业收入</small></button></div>'+
'<div class="metrics"><div class="metric alert"><label>近期截止音乐岗位</label><strong>'+c.urgent+'</strong><small>未来72小时</small></div><div class="metric"><label>本次新收录音乐岗位</label><strong>'+c.added+'</strong><small>不等于今日发布</small></div><div class="metric"><label>已标星</label><strong>'+c.stars+'</strong><small>本浏览器记录</small></div><div class="metric"><label>重点地区</label><strong style="font-size:18px">沿海为主</strong><small>内陆暂不纳入</small></div></div>'+
'<div class="section color-title"><h2>本轮新增岗位</h2><small class="blue-text">蓝色＝本轮首次收录，不等于今天发布</small></div><div class="minirows new-list">'+addedRows+'</div>'+
'<div class="section"><h2>最需要关注</h2><small>红色＝3天内截止</small></div><div class="minirows">'+top+'</div>'+
'<div class="callout"><b>11月13日职业导师复核｜路线暂不调整</b><br>本轮已复核教师招聘、非教师职业招聘、BOSS公开职位和沿海官方招聘入口。新线索中，温州国际部升学指导岗有海外背景关联，但要求国际升学指导经验；深圳游戏创意策划校招需核届别与作品集；腾讯音乐活动营销经理要求5–10年经验，现阶段不推荐。<br>收入、人脉仍是职业决策主轴，可支配时间作为第二约束。当前没有足够的新官方工资证据支持重算广东、浙江、福建教师薪酬曲线或六条路线的长期收入参数，因此模型保持原假设，不虚构变化。<br><a href="https://www.zhipin.com/shenzhen/" target="_blank" rel="noopener">BOSS深圳公开职位</a> · <a href="https://www.wzrc.net/index.php?a=news_show&c=news&id=19891&m=" target="_blank" rel="noopener">温州国际部招聘公告</a></div>'+ 
'<div class="section"><h2>今天三件事</h2><small>按真实进度与材料节点安排</small></div><div class="minirows"><div class="minirow"><span class="dot">1</span><div><b>核验龙岗区属国企11月13日截止岗位</b><small>先向招聘方确认境外毕业证与留服认证能否补交，未得到答复前不要认定可报。</small></div></div><div class="minirow"><span class="dot">2</span><div><b>教育心理学启动专项刷题</b><small>此前确认0道；今天完成后才记录实际题量与错题。</small></div></div><div class="minirow"><span class="dot">3</span><div><b>音乐学科从第一章开始</b><small>教材尚未开始，先建立章节目录；未汇报不计完成。</small></div></div></div>'+ 
'<div class="callout"><b>11月13日全网检索快照</b><br>教师招聘：已检索华图广东／浙江／福建、万行浙江频道、珠海音乐教师线索、深圳中学公告及地方教育局来源；新增1条珠海短期音乐教师待核线索。<br>职业招聘：检索温州人才网国际部招聘、深圳政企招聘、东莞人才网、国资委及沿海招聘入口；新增1条温州国际升学指导隐藏匹配岗位，经验门槛偏高。<br>职业导师规划：保留收入、人脉、可支配时间与发展四项决策框架；薪酬曲线仍为情景模型，不伪装成真实工资。来源目录按政府／教师招聘／高校／企业／人才网分组折叠。<br>注意：搜索引擎索引不等于全网逐站完成；页面访问失败、待逐岗核验的来源均保留状态标记。</div>'+\n'<div class="callout">材料节点：2026年完成学业，毕业证预计11月底取得；留服认证预计2027年1月。境外学历是否允许补交必须逐公告核实。岗位库最后核验：'+esc(DB.verifiedAsOf)+'。</div>'+renderSourceAudit();
}
function renderRecruitment(type){
const teacher=type==="teacher",mode=teacher?teacherMode:careerMode,region=teacher?teacherRegion:careerRegion,level=teacher?teacherLevel:"all",nature=teacher?teacherNature:careerSector,date=teacher?teacherDate:careerDate,year=teacher?teacherYear:careerYear,sort=teacher?teacherSort:careerSort,query=teacher?searchTeacher:searchCareer;
const all=JOBS.filter(j=>j.type===type),nIgnored=all.filter(j=>ignored.includes(j.id)).length;
const teacherModes=[["music","全部音乐"],["fresh","新收录"],["today","今日发布"],["urgent","临近截止"],["open","报名中"],["watch","待核公告"],["ignored","已忽略 ("+nIgnored+")"]];
const careerModes=[["recommended","最适合我"],["hidden","隐藏匹配"],["unrestricted","不限专业"],["fresh","新收录"],["today","今日发布"],["urgent","临近截止"],["open","报名中"],["admissions","高校／国际交流"],["boss","BOSS线索"],["public","事业单位"],["state","国企"],["enterprise","企业"],["archive","不推荐备查"],["all","全部职业"],["ignored","已忽略 ("+nIgnored+")"]];
const modes=teacher?teacherModes:careerModes;
const levelOptions=[["all","全部学段"],["小学","小学"],["初中","初中"],["高中","高中"],["中职","中职／技工"],["高职","高职／专科"],["高校","本科／高校"],["义务教育","义务教育"]];
const kinds=teacher?[["all","全部性质"],["事业编制","公办编制"],["民办","民办／合同"],["公办非编","公办非编／代课"],["高校","高校事业／高校"]]:[["all","全部类型"],["事业单位","事业单位"],["国企","国企"],["企业","企业"],["高校行政","高校行政"],["高校招生／国际交流","高校招生／国际交流"]];
const sorted=[["recommend","推荐排序"],["recent","公告最新"],["old","公告最早"],["deadline","截止最近"],["salary","金额最高"]];
const n7=JOBS.filter(j=>j.type===type&&j.musicConfirmed!==false&&isRecent(j,7)).length;
const visibleBase=JOBS.filter(j=>j.type===type&&(teacher?j.musicConfirmed!==false:true)&&!isExpired(j));
const todayCount=visibleBase.filter(isNewToday).length,addedCount=visibleBase.filter(enteredThisScan).length,urgentCount=visibleBase.filter(isUrgent).length,openCount=visibleBase.filter(j=>j.status==="报名时段").length;
const yearOptions=[["2026","2026年公告"],["all","全部年份"]];
const statusStrip='<div class="status-strip"><button class="status-tile blue-tile" data-mode="fresh"><span>本轮新收录</span><strong>'+addedCount+'</strong><small>直接列出新增名称</small></button><button class="status-tile red-tile" data-mode="today"><span>今日发布</span><strong>'+todayCount+'</strong><small>按公告日期计算</small></button><button class="status-tile orange-tile" data-mode="urgent"><span>3天内截止</span><strong>'+urgentCount+'</strong><small>点击查看紧急岗位</small></button><button class="status-tile green-tile" data-mode="open"><span>报名期限明确</span><strong>'+openCount+'</strong><small>点击查看报名中</small></button></div>';
const careerPlan=teacher?"":'<div class="career-map"><div class="career-map-head"><div><small>BIG-TECH PATH</small><h3>先找到能创造价值的入口，再进大厂</h3></div><span>不再用“专业不限”冒充适合</span></div><div class="career-lanes"><button data-mode="recommended"><b>① 现在能投</b><small>留学／艺术教育、国际交流、活动与内容支持</small></button><button data-mode="hidden"><b>② 隐藏匹配</b><small>企业文化、文艺演出、品牌活动、音乐商务</small></button><button data-mode="unrestricted"><b>③ 不限专业</b><small>仍需核心职责与你有关，无关产业岗自动降级</small></button></div><div class="bigtech-links"><b>大厂目标入口</b><a href="https://join.tencentmusic.com/campus/" target="_blank" rel="noopener noreferrer">腾讯音乐</a><a href="https://careers.larksuite.com/campus/" target="_blank" rel="noopener noreferrer">字节跳动</a><a href="https://career.huawei.com/cn/campus-recruitment-job-list" target="_blank" rel="noopener noreferrer">华为</a><a href="https://hr.xiaomi.com/campus/list" target="_blank" rel="noopener noreferrer">小米</a></div><p>你的音乐能力是“第二岗位价值”：可承担演出、合唱排练、年会节目、海外嘉宾接待和艺术活动策划；但录用仍要依靠一个真实主岗位。</p></div>';
return '<div class="hero"><small>'+(teacher?"ALL MUSIC EDUCATION":"CAREER · PUBLIC SERVICE · ENTERPRISE")+'</small><h2>'+(teacher?"教师招聘 · 所有音乐方向":"职业招聘 · 大厂目标与隐藏匹配")+'</h2><p>'+(teacher?"小学／初中／高中／中职／高职／本科高校。只把明确写出音乐的岗位放入主雷达。":"默认只显示真正与你相关的主岗位；专业不限但核心工作无关的岗位降入备查。")+'</p></div>'+ (teacher?'<div class="callout" style="margin:10px 0"><strong>重点扫描：全国教师网站</strong> · <a href="https://www.jrzhufu.com/" target="_blank" rel="noopener noreferrer">全国教师网（截图网站）↗</a> · <a href="https://mobile.zhaojiao.net/" target="_blank" rel="noopener noreferrer">招教网全国公告 ↗</a> · <a href="https://m.huatu.com/kaoshi/jiaoshi/kskx/bx" target="_blank" rel="noopener noreferrer">全国公告汇总 ↗</a><div class="fine">作为高优先级线索来源，仍以教育局／人社局及学校官方招聘公告为资格、薪酬和截止时间依据。</div></div>':"")+careerPlan+statusStrip+ 
'<div class="panel filterpanel"><div class="tabs">'+modes.map(m=>'<button data-mode="'+esc(m[0])+'" class="'+(mode===m[0]?"active":"")+'">'+esc(m[1])+'</button>').join("")+'</div><div class="filters"><div class="search"><label>搜索岗位或学校</label><input type="search" id="jobSearch" value="'+esc(query)+'" placeholder="音乐、声乐、钢琴、学校、城市"></div><div><label>公告年份</label><select id="yearFilter">'+options(yearOptions,year)+'</select></div><div><label>重点地区</label><select id="areaFilter">'+options(areaOptions,region)+'</select></div><div><label>'+(teacher?"学校学段":"职业性质")+'</label><select id="levelFilter">'+options(teacher?levelOptions:kinds,teacher?level:careerSector)+'</select></div>'+(teacher?'<div><label>聘用性质</label><select id="natureFilter">'+options(kinds,teacherNature)+'</select></div>':"")+'<div><label>排列顺序</label><select id="sortFilter">'+options(sorted,sort)+'</select></div></div><div class="chips">'+[["all","不限时间"],["7","近7天"],["15","近15天"],["30","近30天"]].map(v=>'<button data-date="'+v[0]+'" class="'+(v[0]===date?"active":"")+'">'+v[1]+'</button>').join("")+'<button data-past="toggle" class="'+(showPast?"active":"")+'">含已截止／下线</button>'+(teacher?'<button data-fit="toggle" class="'+(onlyFit?"active":"")+'">隐藏条件不符</button>':"")+'</div><div class="color-legend"><span class="legend-blue">蓝色：本轮新收录</span><span class="legend-red">红色：今日发布／临近截止</span><span class="legend-green">绿色：报名期限明确</span><span class="legend-orange">橙色：储备／资格待核</span></div><div class="area-text">默认显示2026年公告。地区覆盖珠三角、浙江、福建、江浙沪、京津及环渤海；默认按深圳、东莞优先。颜色表示信息状态，不代表最终一定符合资格。</div></div>'+
'<div class="meta"><span id="listCount">整理中</span><span>'+(teacher?"右滑标星 · 左滑忽略 · 点击「已忽略」可恢复":"标星和忽略仅保存在当前浏览器")+'</span></div>'+
'<div class="list" id="jobList"></div>'+
(type==="career"?'<div class="section"><h2>事业单位扫描原则</h2></div><div class="callout">优先文化馆、艺术馆、歌舞院团、教育行政及综合管理岗。只列有证据的岗位；已过截止日期的只能作历史参考，不能标记为在招。当前已核实的非教学事业单位音乐类机会有限。</div>':mode==="watch"?'<div class="callout">综合招聘公告中“可能含音乐”不等于已确认音乐名额；必须检查官方岗位表，不能据整批人数推断。</div>':"")+
'<div class="callout">数据截至 '+esc(DB.verifiedAsOf)+'。本次新收录是本站本轮收录，不代表今日新发布；“今日发布”按官方/招聘页日期。网站不是实时爬虫，未来数据须持续核验与写入。</div>'+renderSourceAudit();
}
function renderSourceAudit(){
 const groups=SOURCES.groups||[], items=groups.flatMap(g=>g.items||[]);
 const checked=items.filter(x=>/已检查|已核|已检/.test(x[3])).length;
 const pending=items.filter(x=>/待逐站|待核|待深入|待查/.test(x[3])).length;
 const restricted=items.filter(x=>/超时|报错|受限/.test(x[3])).length;
 const words=Object.values(SOURCES.keywords||{}).flat();
 const chips=[["岗位同义词","disciplines"],["学段与学校","schoolTypes"],["用工形式","employment"],["资格匹配","audience"],["招聘信号","discovery"]];
 const groupHtml=groups.map(g=>'<details class="scan-group"><summary><strong>'+esc(g.name)+'</strong><span class="scan-number">'+g.items.length+'个来源入口</span></summary><p class="fine" style="margin:8px 0">'+esc(g.description)+'</p><div class="source-items">'+g.items.map(x=>'<div class="source-item"><div><a href="'+esc(x[1])+'" target="_blank" rel="noopener noreferrer">'+esc(x[0])+' ↗</a><small>'+esc(x[2])+' · '+esc(x[4])+'</small></div><span class="source-status '+(/超时|报错/.test(x[3])?"problem":/待逐站|待深入|待查/.test(x[3])?"pending":"checked")+'">'+esc(x[3])+'</span></div>').join("")+'</div></details>').join("");
 const keyHtml=chips.map(g=>{let w=SOURCES.keywords?.[g[1]]||[];return '<details class="keyword-group"><summary>'+esc(g[0])+' · '+w.length+'个起始词</summary><div class="keyword-cloud">'+w.map(t=>'<span>'+esc(t)+'</span>').join("")+'</div></details>'}).join("");
 return '<div class="section"><h2>扫描来源与覆盖情况</h2><small>可折叠查看</small></div><details class="panel sources-audit"><summary class="source-main"><div><b>已纳入 '+items.length+' 个来源入口</b><small>政府公告／教师招聘网／高校招聘／综合平台</small></div><span class="source-expand">展开目录 ＋</span></summary><div class="source-summary"><span>已查看或检索 '+checked+' 个入口记录</span><span>后续需深入 '+pending+' 个</span><span>访问不顺畅 '+restricted+' 个</span></div><p class="fine">记录截至 '+esc(SOURCES.updated)+'。同一网站可能在不同招聘模块重复列出；“入口已检查”不代表所有岗位已逐条扫描，“待深入”也不代表网站没有职位。'+esc(SOURCES.method)+'</p>'+groupHtml+'<details class="scan-group"><summary><strong>动态扩展的检索关键词</strong><span class="scan-number">'+words.length+'个起始词</span></summary><p class="fine">不设固定关键词数量上限：把学科、岗位名称、学校学段、招聘方式、地区、年届、收入与资格组合，发现新的用语继续扩展。不能把词数等同于已完成搜索次数。</p>'+keyHtml+'</details></details>';
}
function selectedJobs(type){
let arr=JOBS.filter(j=>j.type===type),teacher=type==="teacher",mode=teacher?teacherMode:careerMode,region=teacher?teacherRegion:careerRegion,level=teacher?teacherLevel:"all",sector=teacher?teacherNature:careerSector,date=teacher?teacherDate:careerDate,year=teacher?teacherYear:careerYear,sort=teacher?teacherSort:careerSort,query=(teacher?searchTeacher:searchCareer).toLowerCase().trim();
arr=arr.filter(j=>{
const ig=ignored.includes(j.id);
if(mode==="ignored")return ig;else if(ig)return false;
if(mode==="fresh"&&!enteredThisScan(j))return false;if(mode==="today"&&!isNewToday(j))return false;if(mode==="urgent"&&!isUrgent(j))return false;if(mode==="open"&&j.status!=="报名时段")return false;
if(teacher){if(mode!=="watch"&&mode!=="ignored"&&!j.musicConfirmed)return false;if(mode==="watch"&&j.musicConfirmed)return false;if(level!=="all"&&j.level!==level)return false;if(sector==="事业编制"&&!/事业编制/.test(j.nature||""))return false;if(sector==="民办"&&!/民办/.test(j.nature||""))return false;if(sector==="公办非编"&&!/合同代课|编外|购买服务/.test(j.nature||""))return false;if(sector==="高校"&&!/高校|高职/.test(j.nature||""))return false;if(onlyFit&&/不符|偏弱/.test(j.fit||""))return false;
}else{let sec=j.sector||(j.nature==="国企岗位"?"国企":j.nature==="高校行政岗"?"高校行政":"企业"),track=j.careerTrack||"",majorText=[j.experience,j.requirements,j.canApply,j.fitNote].join(" ");if(mode==="recommended"&&(!["direct","hidden","bridge"].includes(track)||/条件不符|当前资格不符/.test(j.fit||"")))return false;if(mode==="hidden"&&track!=="hidden")return false;if(mode==="unrestricted"&&(!/专业不限|不设限|经验不限|学历不限/.test(majorText)||track==="archive"))return false;if(mode==="archive"&&track!=="archive"&&!/条件不符|条件偏弱|当前资格不符/.test(j.fit||""))return false;if(mode==="boss"&&j.jobPlatform!=="BOSS直聘")return false;if(mode==="admissions"&&sec!=="高校招生／国际交流")return false;if(mode==="public"&&sec!=="事业单位")return false;if(mode==="state"&&sec!=="国企")return false;if(mode==="enterprise"&&sec!=="企业")return false;if(mode==="admin"&&!sec.startsWith("高校"))return false;if(sector!=="all"&&sec!==sector)return false;}
if(!inArea(j,region))return false;
if(year!=="all"&&!(j.post||"").startsWith(year))return false;
if(date!=="all"&&!isRecent(j,Number(date)))return false;
if(!showPast&&isExpired(j)&&mode!=="ignored")return false;
if(query&&![j.org,j.title,j.role,j.city,j.province,j.detail].join(" ").toLowerCase().includes(query))return false;
return true;
});
function score(j){let ageScore=(j.post?Math.max(0,20-Math.max(0,Math.floor((now()-toDate(j.post))/86400000))):0),f=/条件不符|已截止/.test(j.fit||"")?-25:j.fit==="较匹配"?10:0,term=isUrgent(j)?10:0,levelScore=j.musicConfirmed?9:0;return tier(j)*10+j.priority+ageScore+f+term+levelScore-(isExpired(j)?500:0)}
arr.sort((a,b)=>sort==="recent"?(b.post||"").localeCompare(a.post||""):sort==="old"?(a.post||"").localeCompare(b.post||""):sort==="deadline"?(deadlineTimestamp(a)??Infinity)-(deadlineTimestamp(b)??Infinity):sort==="salary"?salaryValue(b)-salaryValue(a):score(b)-score(a));
return arr;
}
function salaryValue(j){if(j.payUnit==="year")return (j.payMin||0)*10000;if(j.payUnit==="month")return (j.payMin||0)*10000*12;return -1}
function jobCard(j){let urgent=isUrgent(j),ign=ignored.includes(j.id),star=starred.includes(j.id),recent=isRecent(j,7),expired=isExpired(j),type=j.type;
let trackLabel=j.careerTrack==="hidden"?"隐藏匹配":j.careerTrack==="direct"?"直接可尝试":j.careerTrack==="bridge"?"大厂跳板":j.careerTrack==="archive"?"不推荐备查":"";
let cardTone=expired?"state-closed":urgent?"state-urgent":enteredThisScan(j)?"state-new":j.status==="报名时段"?"state-open":/储备|待核|线索/.test(j.status||"")?"state-pending":"";
let statusTone=expired?"gray":j.status==="报名时段"?"green":/储备|待核|线索/.test(j.status||"")?"gold":"blue";
let status=expired?"已截止／下线":(j.status||"").includes("预公告")?"仅宣讲预告·未开报":j.status==="储备待确认"?"储备待核":j.status==="报名时段"?"报名期限明确":(j.status||"").includes("有效性待核")?"是否在招待核":(j.status||"").includes("可联系校方")?"可联系校方·资格待核":j.jobPlatform==="BOSS直聘"?"BOSS线索·在招待核":"资格待核";
let t='<article class="job '+cardTone+" "+(urgent&&!expired?"urgent ":"")+(star?"starred":"")+'" data-job="'+esc(j.id)+'"><div class="jobhead"><div><h3>'+esc(j.title)+'</h3><div class="org">'+esc(j.org)+' · '+esc(j.city)+'</div></div><div class="headright"><span class="badge '+fitCls(j)+'">'+esc(j.fit||"待核实")+'</span></div></div>'+
'<div class="badges">'+(trackLabel?'<span class="badge track-'+esc(j.careerTrack)+'">'+esc(trackLabel)+'</span>':"")+'<span class="badge">'+esc(j.level||"")+'</span><span class="badge">'+esc(j.nature)+'</span><span class="badge '+statusTone+'">'+esc(status)+'</span>'+(recent?'<span class="badge red">近7天公告</span>':"")+(isNewToday(j)?'<span class="badge red">今日发布</span>':"")+(enteredThisScan(j)?'<span class="badge gold">本次收录</span>':"")+'</div>'+
'<div class="salarybox"><label>薪酬信息 · '+(j.payUnit==="none"?"未公开数字":"页面招聘标价")+'</label><strong>'+esc(j.pay)+'</strong><small>'+esc(j.payNote||"工资须向招聘单位核实")+'</small></div>'+
'<div class="dates"><div class="'+(recent?"urgent":"")+'"><label>'+esc(j.dateType||"公告时间")+'</label><strong>'+pDate(j.post)+'</strong></div><div class="'+(urgent&&!expired?"urgent":"")+'"><label>报名截止（北京时间）</label><strong>'+pDeadline(j)+'</strong></div></div>'+
(j.type==="career"?'<div class="job-fit"><div><strong>这份工作做什么</strong><p>'+esc(j.duties||j.detail||"职责需要阅读原文确认")+'</p></div><div><strong>与你有什么关联</strong><p>'+esc(j.relevance||"请结合音乐教学、留学和组织经验逐项判断")+'</p></div><div><strong>你能不能做</strong><p>'+esc(j.canApply||j.fitNote||"尚待确认报名资格")+'</p></div></div>':"")+
'<div class="jobdetails"><b>资格判断：</b>'+esc(j.fitNote||"需核实具体专业及证书要求")+'<details><summary>'+(j.type==="career"?"查看经验门槛／风险／来源":"查看岗位要求与来源")+'</summary>'+(j.experience?'<p><b>经验学历：</b>'+esc(j.experience)+'</p>':"")+(j.risk?'<p><b>特别提醒：</b>'+esc(j.risk)+'</p>':"")+'<p>'+esc(j.detail||"")+'</p><p>来源：'+esc(j.source||"招聘原页")+'。核验快照：'+esc(DB.verifiedAsOf)+'</p></details></div>'+
'<div class="jobactions"><a href="'+esc(j.url)+'" target="_blank" rel="noopener noreferrer">'+(j.jobPlatform==="BOSS直聘"?"BOSS职位搜索页 ↗":"公告／岗位原页 ↗")+'</a><button data-star="'+esc(j.id)+'">'+(star?"★ 取消标星":"☆ 标星")+'</button><button data-ignore="'+esc(j.id)+'">'+(ign?"恢复岗位":"忽略")+'</button></div></article>';
return t;
}
function drawList(type){let arr=selectedJobs(type),count=byId("listCount");if(count)count.textContent="显示 "+arr.length+" 条 · "+(type==="teacher"?"音乐确认、资格和地区优先":"与你的关联、可申请性和发展路径优先");const list=byId("jobList");if(list)list.innerHTML=arr.length?arr.map(jobCard).join(""):'<div class="empty">当前筛选下没有已核实岗位。可放宽日期、学段，或切换“已忽略”“待核公告”。</div>';}
function bindRecruitment(type){
byId("jobSearch").addEventListener("input",e=>{if(type==="teacher")searchTeacher=e.target.value;else searchCareer=e.target.value;drawList(type)});
byId("yearFilter").addEventListener("change",e=>{if(type==="teacher")teacherYear=e.target.value;else careerYear=e.target.value;drawList(type)});
byId("areaFilter").addEventListener("change",e=>{if(type==="teacher")teacherRegion=e.target.value;else careerRegion=e.target.value;drawList(type)});
byId("levelFilter").addEventListener("change",e=>{if(type==="teacher")teacherLevel=e.target.value;else careerSector=e.target.value;drawList(type)});
if(type==="teacher")byId("natureFilter").addEventListener("change",e=>{teacherNature=e.target.value;drawList(type)});
byId("sortFilter").addEventListener("change",e=>{if(type==="teacher")teacherSort=e.target.value;else careerSort=e.target.value;drawList(type)});
drawList(type);
}
function flip(id,which){if(which==="star"){starred=starred.includes(id)?starred.filter(x=>x!==id):starred.concat([id]);store("ld-fav-jobs",starred)}else{ignored=ignored.includes(id)?ignored.filter(x=>x!==id):ignored.concat([id]);store("ld-hide-jobs",ignored)}render()}
function renderStudy(){return '<div class="hero"><small>STUDY TRACKER</small><h2>学习进度 · 只记录真实完成</h2><p>没有主动汇报的日期记为0，不按计划自动加进度。</p></div><div class="study-grid"><div class="study-card"><span class="small">教育综合教材</span><strong>已通读</strong><div class="progress"><i style="width:100%"></i></div><p>后续重点是专项刷题与错题。</p></div><div class="study-card"><span class="small">教育心理学专项</span><strong>0题已确认</strong><div class="progress"><i style="width:0%"></i></div><p>尚未启动新的专项刷题；普通心理学旧错题另计。</p></div><div class="study-card"><span class="small">音乐学科</span><strong class="red">尚未开始</strong><div class="progress"><i style="width:0%"></i></div><p>教材、音乐史、乐理、教法、试讲。</p></div></div><div class="section"><h2>今天只做3件事</h2></div><div class="minirows"><div class="minirow"><span class="dot">1</span><div><b>教育心理学第一章 · 启动专项刷题</b><small>记题数与错题。</small></div></div><div class="minirow"><span class="dot">2</span><div><b>音乐学科 · 启动第一节</b><small>从教材或乐理专项开始。</small></div></div><div class="minirow"><span class="dot">3</span><div><b>旧章复习 · 按错题优先</b><small>做完后汇报实际章数和正确率。</small></div></div></div><div class="section"><h2>学习记录</h2></div><div class="panel"><p class="tiny">教材已通读；教育心理学专项题尚未开始（0题已确认）；音乐学科尚未开始。没有新的真实汇报前，不改动完成状态。</p><button class="btn-outline" data-copy-study="1">复制今日打卡模板</button></div>';}
const payBases={
"广东":{"编制教师":[8800,24000],"民办合同":[10200,18000],"高校／高职":[8900,20000]},
"浙江":{"编制教师":[9500,28000],"民办合同":[10500,24000],"高校／高职":[9300,25000]},
"福建":{"编制教师":[7300,20000],"民办合同":[7900,14000],"高校／高职":[7600,18000]},
"江浙沪":{"编制教师":[10500,30000],"民办合同":[11000,26000],"高校／高职":[10000,26000]},
"京津":{"编制教师":[9700,28000],"民办合同":[10000,24000],"高校／高职":[9600,22000]}
};
function salaryAt(year){let start=payBases[salaryRegion][salaryType],g=salaryScenario==="保守"?0.01:salaryScenario==="积极"?0.04:0.025;let mult=Math.pow(1+g,year-1);return {month:Math.round(start[0]*mult),bonus:Math.round(start[1]*mult),annual:Math.round((start[0]*12+start[1])*mult)}}
function payChart(){let arr=Array.from({length:30},(_,i)=>salaryAt(i+1).annual/10000),max=Math.max(...arr)*1.12,axis={l:30,r:696,t:20,b:221};let x=i=>axis.l+i*(axis.r-axis.l)/29,y=v=>axis.b-v/max*(axis.b-axis.t);let line=arr.map((v,i)=>(i?"L":"M")+x(i).toFixed(1)+" "+y(v).toFixed(1)).join(" ");let sel=salaryAt(salaryYear).annual/10000,xx=x(salaryYear-1),yy=y(sel);let grid=[0.25,0.5,0.75,1].map(f=>'<line x1="'+axis.l+'" x2="'+axis.r+'" y1="'+(axis.b-(axis.b-axis.t)*f)+'" y2="'+(axis.b-(axis.b-axis.t)*f)+'" stroke="#e4ebf3" stroke-width="1"></line>').join("");return '<svg id="incomeChart" class="pay-graph" viewBox="0 0 720 250" role="img" aria-label="30年薪酬情景滑动曲线">'+grid+'<path d="'+line+'" stroke="#28719f" stroke-width="3.5" fill="none" stroke-linejoin="round" stroke-linecap="round"/><line x1="'+xx+'" y1="'+axis.t+'" x2="'+xx+'" y2="'+axis.b+'" stroke="#bd884f" stroke-dasharray="5 5" stroke-width="1.7"/><circle cx="'+xx+'" cy="'+yy+'" r="7" fill="#bd884f" stroke="#fff" stroke-width="3"/><text x="31" y="237" font-size="11" fill="#849aab">第1年</text><text x="647" y="237" font-size="11" fill="#849aab">第30年</text><rect x="15" y="2" width="690" height="230" fill="transparent"/></svg>'}
function renderPay(){let s=salaryAt(salaryYear),cash=(s.month*12+s.bonus)/12-salaryExpense;return '<div class="hero"><small>CAREER SALARY · ILLUSTRATIVE MODEL</small><h2>薪酬与晋升 · 滑动看未来30年</h2><p>你尚未入职。这里比较「广东编制、浙江编制、福建编制、民办合同、高校高职」等职业路径的假设收入，不当作真实工资条。</p></div>'+
'<div class="panel"><div class="selects"><label style="width:140px">地区<select id="payRegion">'+options([["广东","广东"],["浙江","浙江"],["福建","福建"],["江浙沪","江浙沪"],["京津","京津"]],salaryRegion)+'</select></label><label style="width:160px">工作类型<select id="payType">'+options([["编制教师","公办教师编制"],["民办合同","民办／合同"],["高校／高职","高职／高校"]],salaryType)+'</select></label><label style="width:130px">情景<select id="payScenario">'+options([["保守","保守 1%"],["基准","基准 2.5%"],["积极","积极 4%"]],salaryScenario)+'</select></label></div><div style="margin-top:16px"><div class="tiny">第 <span id="payYearLabel">'+salaryYear+'</span> 年 · 月均收入折算</div><div class="big-value" id="avgMonth">¥ '+Math.round(s.annual/12).toLocaleString("zh-CN")+'</div><div class="tiny">固定月到手与年度绩效均为演示初值，包含绩效÷12的月均折算；不代表每月银行实发。</div></div>'+
'<div id="graphHost">'+payChart()+'</div><input id="payYear" class="slider" type="range" min="1" max="30" value="'+salaryYear+'" aria-label="滑动选择工作年份"><div class="pay-metrics" id="payValues">'+payValues(s,cash)+'</div><details style="margin-top:13px"><summary style="font-weight:750;cursor:pointer">收入假设与支出调整</summary><div class="callout">本模型的初始月到手与年度绩效仅为可调整的情景假设，并非广东、浙江、福建的真实平均工资。每年按所选增速复利增长，不保证职称晋升或加薪；不包括买房、离职、失业等。</div><label class="tiny">假设每月房租＋生活开支（元）<input id="payExpense" style="display:block;padding:8px;border:1px solid #dce6ee;border-radius:8px;margin:7px 0;width:170px" type="number" min="0" value="'+salaryExpense+'"></label><p class="tiny">月可支配 = (固定月到手×12＋税后绩效)÷12－月开支；年度绩效平均化仅用于比较。</p></details></div>'+
'<div class="callout">教师薪酬只作为选岗决策的参考。实际收入必须用学校合同、税后工资、绩效政策、公积金和当地生活成本重新核对。模型不是地区收入排名。</div>'+
'<div style="margin:11px 0"><button class="btn-outline" data-open-simulator="1">打开独立职业路线模拟器 ↗</button></div>';}
function payValues(s,cash){return '<div><label>固定月到手（假设）</label><strong>¥ '+s.month.toLocaleString("zh-CN")+'</strong></div><div><label>全年税后绩效（假设）</label><strong>¥ '+s.bonus.toLocaleString("zh-CN")+'</strong></div><div><label>年度税后现金合计</label><strong>¥ '+s.annual.toLocaleString("zh-CN")+'</strong></div><div><label>扣每月开支后的月均结余</label><strong style="color:'+(cash<0?"#c93649":"#1d7a62")+'">¥ '+Math.round(cash).toLocaleString("zh-CN")+'</strong></div>'}
function bindPay(){byId("payRegion").onchange=e=>{salaryRegion=e.target.value;render()};byId("payType").onchange=e=>{salaryType=e.target.value;render()};byId("payScenario").onchange=e=>{salaryScenario=e.target.value;render()};byId("payYear").oninput=e=>{salaryYear=Number(e.target.value);updatePayValues()};let expense=byId("payExpense");expense.oninput=e=>{salaryExpense=Math.max(0,Number(e.target.value)||0);updatePayValues()};attachChart()}
function updatePayValues(){const s=salaryAt(salaryYear),cash=s.annual/12-salaryExpense;byId("payYearLabel").textContent=salaryYear;byId("avgMonth").textContent="¥ "+Math.round(s.annual/12).toLocaleString("zh-CN");byId("payValues").innerHTML=payValues(s,cash);byId("graphHost").innerHTML=payChart();attachChart()}
let chartGesture=null;function gestureMove(e){if(!chartGesture)return;let v=(e.clientX-chartGesture.left)/chartGesture.width;let yr=Math.max(1,Math.min(30,Math.round(1+(v*720-30)/666*29)));if(yr!==salaryYear){salaryYear=yr;byId("payYear").value=salaryYear;updatePayValues()}}function attachChart(){const svg=byId("incomeChart");if(!svg)return;svg.addEventListener("pointerdown",e=>{chartGesture=svg.getBoundingClientRect();gestureMove(e);e.preventDefault()})}document.addEventListener("pointermove",e=>{if(chartGesture)gestureMove(e)});document.addEventListener("pointerup",()=>{chartGesture=null});document.addEventListener("pointercancel",()=>{chartGesture=null});
document.addEventListener("click",function(e){
let nav=e.target.closest("[data-nav]");if(nav){navigate(nav.dataset.nav);return}
let mode=e.target.closest("[data-mode]");if(mode){if(page==="teacher")teacherMode=mode.dataset.mode;else careerMode=mode.dataset.mode;render();return}
let date=e.target.closest("[data-date]");if(date){if(page==="teacher")teacherDate=date.dataset.date;else careerDate=date.dataset.date;render();return}
if(e.target.closest("[data-past]")){showPast=!showPast;render();return}
if(e.target.closest("[data-fit]")){onlyFit=!onlyFit;render();return}
let star=e.target.closest("[data-star]");if(star){flip(star.dataset.star,"star");return}
let ig=e.target.closest("[data-ignore]");if(ig){flip(ig.dataset.ignore,"ignore");return}
if(e.target.closest("[data-open-simulator]")){location.href="./simulator.html";return}
if(e.target.closest("[data-copy-study]")){let txt="教师招聘复习打卡（今天）：\n教育心理学：第__章，__题，正确__题。\n音乐学科：学习__，完成__题。\n旧章复习：__。\n请据此更新真实进度，不默认补进度。";if(navigator.clipboard)navigator.clipboard.writeText(txt).then(()=>alert("已复制")).catch(()=>prompt("请复制",txt));else prompt("请复制",txt)}
});
document.addEventListener("touchstart",function(e){let card=e.target.closest(".job");if(!card||e.target.closest("button,a,input,select"))return;card.dataset.touchX=e.changedTouches[0].clientX;card.dataset.touchY=e.changedTouches[0].clientY},{passive:true});
document.addEventListener("touchend",function(e){let card=e.target.closest(".job");if(!card||e.target.closest("button,a,input,select")||!card.dataset.touchX)return;let dx=e.changedTouches[0].clientX-Number(card.dataset.touchX),dy=e.changedTouches[0].clientY-Number(card.dataset.touchY);delete card.dataset.touchX;delete card.dataset.touchY;if(Math.abs(dx)>85&&Math.abs(dx)>1.5*Math.abs(dy))flip(card.dataset.job,dx>0?"star":"ignore")},{passive:true});
window.addEventListener("hashchange",()=>{let p=location.hash.slice(1);if(labels[p]){page=p;render()}});
render();
})();