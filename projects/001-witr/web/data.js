'use strict';
const WITR_DATA = (() => {
  const commit = 'dc4fa1da82d3e266fcbd928641b4f30b3077c64f';
  const source = path => `https://github.com/pranshuparmar/witr/blob/${commit}/${path}`;
  const platforms = {
    windows: {name:'Windows',root:'Windows Terminal',shell:'pwsh.exe',service:'services.exe',app:'node.exe',cwd:'C:/work/demo',file:'C:/work/demo/app.log',fileApp:'python.exe',source:'交互式终端',serviceName:'Windows Service',steps:[
      ['定位目标进程','端口查询解析 netstat -ano 的输出；按文件查询使用 Restart Manager。将查询对象映射为一个或多个 PID。','netstat -ano · RmRegisterResources / RmGetList','internal/proc/net_windows.go'],
      ['读取系统快照','ToolHelp32 枚举进程与父进程。通过系统 API 获取启动时间、内存和 I/O，部分详情读取进程环境块（PEB）。','CreateToolhelp32Snapshot · ReadProcessMemory · GetProcessTimes','internal/proc/peb_windows.go']]},
    linux: {name:'Linux',root:'systemd',shell:'bash',service:'systemd',app:'node',cwd:'/srv/demo',file:'/var/log/demo.log',fileApp:'python3',source:'交互式终端',serviceName:'systemd service',steps:[
      ['定位目标进程','读取 /proc/net 中的网络表，找到套接字 inode，再与 /proc/<pid>/fd 中的套接字关联，解析出所属 PID。','/proc/net/tcp · /proc/net/udp · /proc/<pid>/fd','internal/proc/net_linux.go'],
      ['读取内核公开的数据','读取 /proc/<pid>/stat、cmdline、cwd、environ 和 cgroup。这里的文件由内核动态提供，无需先运行 ps。','/proc/<pid>/{stat,cmdline,cwd,environ,cgroup}','internal/proc/process_linux.go']]},
    macos: {name:'macOS',root:'launchd',shell:'zsh',service:'launchd',app:'node',cwd:'/Users/demo/work/app',file:'/Users/demo/work/app/app.log',fileApp:'python3',source:'交互式终端',serviceName:'launchd service',steps:[
      ['定位目标进程','使用 lsof 查询网络连接与文件持有者，将地址、端口和文件信息关联到 PID。','lsof -i -P -n','internal/proc/net_darwin.go'],
      ['组合命令与原生接口','ps 读取基本进程信息，lsof 读取目录等上下文。启用相应构建条件时，扩展信息可通过 libproc 获取。','ps · lsof · sysctl · 可选 libproc','internal/proc/process_darwin.go']]},
    freebsd: {name:'FreeBSD',root:'init',shell:'sh',service:'daemon',app:'node',cwd:'/usr/local/demo',file:'/var/log/demo.log',fileApp:'python3',source:'交互式终端',serviceName:'rc.d service',steps:[
      ['定位目标进程','通过 sockstat 获取网络套接字与 PID 的对应关系；文件相关查询结合系统文件工具。','sockstat · procstat','internal/proc/net_freebsd.go'],
      ['解析系统命令结果','ps 获取进程与资源信息，procstat -f / -e 获取文件和环境信息；还可用 jls 解析 jail 名称。','ps · procstat -f · procstat -e · jls','internal/proc/process_freebsd.go']]}
  };
  const questions={port:'3000 端口被谁占用了？',pid:'这个后台服务由谁启动？',file:'谁还持有这个日志文件？',container:'这个 Redis 容器属于哪个项目？'};
  function fixture(os,scenario){
    const p=platforms[os];
    const init={pid:os==='windows'?720:1,name:p.root,note:'可观察到的祖先进程'};
    const dev={pid:4821,name:p.app,note:'开发服务器 · 查询目标'};
    const base={platform:p.name,scenario,source:p.source,command:'node server.js',cwd:p.cwd,git:'demo / main',cpu:'1.8%',memory:'84 MiB',warnings:[],ancestry:[init,{pid:3100,name:p.shell,note:'启动程序的交互式终端'},dev],process:dev,port:3000,question:questions[scenario],meaning:'这是从终端启动的开发服务器。先核对工作目录，再决定是否停止对应项目的服务。',query:'witr --port 3000'};
    if(scenario==='pid') Object.assign(base,{process:{pid:6100,name:p.app,note:'后台服务 · 查询目标'},source:p.serviceName,command:'node worker.js',port:null,query:'witr --pid 6100',meaning:'程序由系统服务管理。若它在结束后再次出现，应继续检查服务配置与重启策略。',cpu:'3.2%',memory:'126 MiB',ancestry:[{pid:os==='windows'?800:1,name:p.service,note:'系统服务管理来源'},{pid:6100,name:p.app,note:'后台服务 · 查询目标'}]});
    if(scenario==='file') Object.assign(base,{process:{pid:7200,name:p.fileApp,note:'日志写入程序 · 查询目标'},source:p.source,command:'python log_worker.py',file:p.file,port:null,query:`witr --file ${p.file}`,meaning:os==='windows'?'Windows 可通过 Restart Manager 按文件查询相关进程。这不等于支持系统级文件锁枚举，也不证明该进程持有排他锁。':'找到的是持有文件的进程。文件被打开不一定意味着持有排他锁，应结合实际锁信息和程序行为继续判断。',cpu:'0.6%',memory:'32 MiB',ancestry:[init,{pid:3100,name:p.shell,note:'交互式终端'},{pid:7200,name:p.fileApp,note:'持有日志文件'}]});
    if(scenario==='container') Object.assign(base,{process:null,source:'Docker / Compose',command:'redis-server',cwd:'容器运行时提供的上下文',git:'不适用',cpu:'未采集',memory:'未采集',port:6379,query:'witr --container redis',container:{name:'demo-redis-1',image:'redis:7',project:'demo',service:'redis'},ancestry:[],meaning:'容器元数据表明它属于 demo 项目的 redis 服务。Windows / macOS 的 Linux 容器常位于虚拟机内，此处不拼接虚构的宿主机进程链。'});
    return base;
  }
  function steps(os){return [...platforms[os].steps,
    ['追溯父进程链','从目标 PID 读取父进程 PID，再继续向上查找；遇到根进程、读取失败或循环时停止。最后反转为从祖先到目标的顺序。','ResolveAncestry → ReadProcess → PPID','internal/proc/ancestry.go'],
    ['识别启动来源','按规则优先级识别容器、SSH、终端、系统服务和进程管理器，选取一个主要来源。属于基于当前线索的推断，不是历史事件回放。','source.Detect(ancestry)','internal/source/detect.go'],
    ['补充上下文并呈现','汇总工作目录、Git 信息、网络和规则提示，输出报告、进程树或 JSON。权限不足时可能缺少字段。','AnalyzePID → model.Result → output / tui','internal/pipeline/analyze.go']];}
  const matrix=[['按名称 / PID / 端口查询','支持','支持','支持','支持'],['按文件查询相关进程','支持','支持','支持','支持'],['祖先进程链与项目上下文','支持','支持','支持','支持'],['服务来源识别','systemd','Windows 服务','launchd','rc.d'],['容器查询（需运行时工具）','支持','支持','支持','支持'],['CPU / 内存信息','支持','支持','支持','支持'],['打开文件 / 句柄详情','支持','有限：数量','支持','支持'],['环境变量','支持','有限：受保护进程','有限：SIP','支持'],['系统文件锁 / Locks 面板','支持','不支持','支持','支持'],['定时触发信息识别','systemd timers','不支持','launchd','不支持'],['界面内信号 / 优先级操作','支持','不支持','支持','支持'],['JSON / 进程树输出','支持','支持','支持','支持']];
  return {commit,source,platforms,fixture,steps,matrix};
})();
if(typeof module!=='undefined') module.exports=WITR_DATA;
