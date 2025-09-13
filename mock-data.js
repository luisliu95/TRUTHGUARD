// Mock dataset for prototype
// Verdict: true | partial | false | unknown

window.MockDB = (() => {
  const claims = [
    {
      id: 'c_health_1',
      title: '喝柠檬水可以“杀死癌细胞”',
      category: '健康',
      verdict: 'false',
      confidence: 90,
      updatedAt: '2025-08-12',
      evidence: [
        { source: 'cancer.org', excerpt: '目前没有可靠医学研究证明柠檬水能杀死癌细胞。维生素C与抗氧化物质不能替代癌症治疗。', grade: 'A', url: 'https://www.cancer.org' }
      ],
      follow: false
    },
    {
      id: 'c_tech_1',
      title: '5G 信号会危害人体健康',
      category: '科技',
      verdict: 'false',
      confidence: 92,
      updatedAt: '2025-08-28',
      evidence: [
        { source: 'oecd.org', excerpt: '未见一致性科学证据表明 5G 会对人体造成危害；WHO、OECD 认为现有水平下的辐射符合安全标准。', grade: 'A', url: 'https://www.oecd.org' }
      ],
      follow: false
    },
    {
      id: 'c_society_1',
      title: '某城市正在大规模“限养宠物”并强制收走狗只',
      category: '社会',
      verdict: 'false',
      confidence: 80,
      updatedAt: '2025-07-30',
      evidence: [
        { source: '人民网', excerpt: '官方通报称仅开展犬只登记与疫苗检查，不存在“大规模强制收走”。网传为夸大与误读。', grade: 'A', url: '#' }
      ],
      follow: false
    },
    {
      id: 'c_ent_1',
      title: '某知名演员宣布将“退出影视圈”',
      category: '娱乐',
      verdict: 'false',
      confidence: 88,
      updatedAt: '2025-09-05',
      evidence: [
        { source: 'weibo.com', excerpt: '演员本人及工作室公开辟谣，相关截图和短视频为恶意剪辑拼接。', grade: 'B', url: 'https://weibo.com' }
      ],
      follow: false
    },
    {
      id: 'c_fin_1',
      title: '比特币将在 2025 年底被联合国全面禁止',
      category: '财经',
      verdict: 'false',
      confidence: 89,
      updatedAt: '2025-08-20',
      evidence: [
        { source: 'reuters.com', excerpt: '联合国未出台任何涉及禁止比特币的政策，传言源于社交媒体的虚假解读；各国监管由本国制定。', grade: 'A', url: 'https://www.reuters.com' }
      ],
      follow: false
    }
  ];

  const loadSubs = () => JSON.parse(localStorage.getItem('subs') || '[]');
  const saveSubs = (subs) => localStorage.setItem('subs', JSON.stringify(subs));
  const loadHistory = () => JSON.parse(localStorage.getItem('history') || '[]');
  const saveHistory = (history) => localStorage.setItem('history', JSON.stringify(history));

  return { claims, loadSubs, saveSubs, loadHistory, saveHistory };
})();


