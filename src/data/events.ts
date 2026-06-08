export type EventStatus = "live" | "upcoming" | "ended";

export type Team = {
  id: string;
  nameZh: string;
  nameEn: string;
  abbr?: string;
  logo: string;
  region?: string;
  seed?: string;
  colors: [string, string];
};

export type Event = {
  id: string;
  name: string;
  shortName: string;
  dateStart: string;
  dateEnd: string;
  status: EventStatus;
  teams: Team[];
  featuredTeamIds: string[];
  sourceUrl: string;
  accent: string;
  coverLabel: string;
  backgroundImage: string;
};

const logo = (id: string) => `/logos/${id}.png`;

const t = (
  id: string,
  nameZh: string,
  nameEn: string,
  region: string,
  colors: [string, string],
  seed?: string,
  abbr?: string,
): Team => ({ id, nameZh, nameEn, abbr, region, colors, seed, logo: logo(id) });

const vt = (
  id: string,
  nameZh: string,
  nameEn: string,
  region: string,
  colors: [string, string],
  abbr: string,
): Team => t(id, nameZh, nameEn, region, colors, undefined, abbr);

const nbaTeams: Team[] = [
  t("sas", "马刺", "San Antonio Spurs", "NBA", ["#c4ced4", "#111111"], "西部冠军"),
  t("nyk", "尼克斯", "New York Knicks", "NBA", ["#f58426", "#006bb6"], "东部冠军"),
];

const valorantTeams: Team[] = [
  vt("g2", "G2 Esports", "G2 Esports", "Americas", ["#c7c7c7", "#111111"], "G2"),
  vt("edg", "EDward Gaming", "EDward Gaming", "CN", ["#111111", "#d71920"], "EDG"),
  vt("team-heretics", "Team Heretics", "Team Heretics", "EMEA", ["#00a3ff", "#111111"], "TH"),
  vt("paper-rex", "Paper Rex", "Paper Rex", "Pacific", ["#ff6f00", "#191919"], "PRX"),
  vt("xlg", "XLG Esports", "XLG Esports", "CN", ["#e63d35", "#101318"], "XLG"),
  vt("drg", "Dragon Ranger", "Dragon Ranger Gaming", "CN", ["#5ce1e6", "#1d2b53"], "DRG"),
  vt("global-esports", "Global Esports", "Global Esports", "Pacific", ["#111111", "#f4c430"], "GE"),
  vt("full-sense", "FULL SENSE", "FULL SENSE", "Pacific", ["#ff5a1f", "#131313"], "FS"),
  { ...vt("team-vitality", "Vitality", "Vitality", "EMEA", ["#f5d547", "#111111"], "VIT"), logo: logo("vitality") },
  vt("fut", "FUT Esports", "FUT Esports", "EMEA", ["#e41d2c", "#111111"], "FUT"),
  vt("leviatan", "Leviatán", "Leviatán", "Americas", ["#00d1ff", "#141414"], "LEV"),
  vt("nrg", "NRG", "NRG", "Americas", ["#d81f26", "#111111"], "NRG"),
];

const csTeams: Team[] = [
  t("b8", "B8", "B8", "Stage 1", ["#008cff", "#111111"]),
  t("betboom", "BetBoom Team", "BetBoom Team", "Stage 1", ["#ffcc00", "#111111"]),
  t("m80", "M80", "M80", "Stage 1", ["#54ff7f", "#111111"]),
  t("mibr", "MIBR", "MIBR", "Stage 1", ["#08a64b", "#111111"]),
  t("big", "BIG", "BIG", "Stage 1", ["#ffffff", "#111111"]),
  t("tyloo", "TYLOO", "TYLOO", "Stage 1", ["#ff251c", "#111111"]),
  t("fut", "FUT Esports", "FUT Esports", "Stage 2", ["#e41d2c", "#111111"]),
  t("spirit", "Spirit", "Spirit", "Stage 2", ["#1d66ff", "#111111"]),
  t("astralis", "Astralis", "Astralis", "Stage 2", ["#e21b2d", "#111111"]),
  t("g2-cs", "G2", "G2 Esports", "Stage 2", ["#c7c7c7", "#111111"]),
  t("legacy", "Legacy", "Legacy", "Stage 2", ["#48ff6a", "#111111"]),
  t("pai-nexus", "paiN Gaming", "paiN Gaming", "Stage 2", ["#d4141e", "#111111"]),
  t("monte", "Monte", "Monte", "Stage 2", ["#e3f5ff", "#111111"]),
  t("9z", "9z Team", "9z Team", "Stage 2", ["#7e39ff", "#111111"]),
  t("vitality", "Vitality", "Vitality", "Stage 3", ["#f2d230", "#111111"]),
  t("natus-vincere", "NAVI", "Natus Vincere", "Stage 3", ["#ffdd00", "#111111"]),
  t("falcons", "Falcons", "Falcons", "Stage 3", ["#0b0b0b", "#26d07c"]),
  t("mongolz", "The MongolZ", "The MongolZ", "Stage 3", ["#d71920", "#111111"]),
  t("parivision", "PARIVISION", "PARIVISION", "Stage 3", ["#9b72ff", "#111111"]),
  t("aurora", "Aurora Gaming", "Aurora Gaming", "Stage 3", ["#5be7ff", "#111111"]),
  t("furia", "FURIA", "FURIA", "Stage 3", ["#111111", "#f7f7f7"]),
  t("mouz", "MOUZ", "MOUZ", "Stage 3", ["#e30613", "#111111"]),
];

const worldCupTeams: Team[] = [
  t("canada", "加拿大", "Canada", "CONCACAF", ["#ff0000", "#ffffff"]),
  t("mexico", "墨西哥", "Mexico", "CONCACAF", ["#006847", "#ce1126"]),
  t("usa", "美国", "United States", "CONCACAF", ["#3c3b6e", "#b22234"]),
  t("australia", "澳大利亚", "Australia", "AFC", ["#012169", "#ffcd00"]),
  t("iraq", "伊拉克", "Iraq", "AFC", ["#ce1126", "#000000"]),
  t("iran", "伊朗", "Iran", "AFC", ["#239f40", "#da0000"]),
  t("japan", "日本", "Japan", "AFC", ["#bc002d", "#ffffff"]),
  t("jordan", "约旦", "Jordan", "AFC", ["#007a3d", "#ce1126"]),
  t("south-korea", "韩国", "South Korea", "AFC", ["#c60c30", "#003478"]),
  t("qatar", "卡塔尔", "Qatar", "AFC", ["#8a1538", "#ffffff"]),
  t("saudi-arabia", "沙特阿拉伯", "Saudi Arabia", "AFC", ["#006c35", "#ffffff"]),
  t("uzbekistan", "乌兹别克斯坦", "Uzbekistan", "AFC", ["#1eb53a", "#0099b5"]),
  t("algeria", "阿尔及利亚", "Algeria", "CAF", ["#006233", "#d21034"]),
  t("cape-verde", "佛得角", "Cape Verde", "CAF", ["#003893", "#cf2027"]),
  t("dr-congo", "刚果民主共和国", "DR Congo", "CAF", ["#007fff", "#ce1021"]),
  t("ivory-coast", "科特迪瓦", "Ivory Coast", "CAF", ["#f77f00", "#009e60"]),
  t("egypt", "埃及", "Egypt", "CAF", ["#ce1126", "#000000"]),
  t("ghana", "加纳", "Ghana", "CAF", ["#fcd116", "#006b3f"]),
  t("morocco", "摩洛哥", "Morocco", "CAF", ["#c1272d", "#006233"]),
  t("senegal", "塞内加尔", "Senegal", "CAF", ["#00853f", "#e31b23"]),
  t("south-africa", "南非", "South Africa", "CAF", ["#007a4d", "#ffb612"]),
  t("tunisia", "突尼斯", "Tunisia", "CAF", ["#e70013", "#ffffff"]),
  t("curacao", "库拉索", "Curacao", "CONCACAF", ["#002b7f", "#f9d90f"]),
  t("haiti", "海地", "Haiti", "CONCACAF", ["#00209f", "#d21034"]),
  t("panama", "巴拿马", "Panama", "CONCACAF", ["#005293", "#d21034"]),
  t("argentina", "阿根廷", "Argentina", "CONMEBOL", ["#75aadb", "#ffffff"]),
  t("brazil", "巴西", "Brazil", "CONMEBOL", ["#009c3b", "#ffdf00"]),
  t("colombia", "哥伦比亚", "Colombia", "CONMEBOL", ["#fcd116", "#003893"]),
  t("ecuador", "厄瓜多尔", "Ecuador", "CONMEBOL", ["#fcd116", "#ce1126"]),
  t("paraguay", "巴拉圭", "Paraguay", "CONMEBOL", ["#d52b1e", "#0038a8"]),
  t("uruguay", "乌拉圭", "Uruguay", "CONMEBOL", ["#0038a8", "#ffffff"]),
  t("new-zealand", "新西兰", "New Zealand", "OFC", ["#00247d", "#ffffff"]),
  t("austria", "奥地利", "Austria", "UEFA", ["#ed2939", "#ffffff"]),
  t("belgium", "比利时", "Belgium", "UEFA", ["#fae042", "#ed2939"]),
  t("bosnia", "波黑", "Bosnia and Herzegovina", "UEFA", ["#002395", "#fecb00"]),
  t("croatia", "克罗地亚", "Croatia", "UEFA", ["#ff0000", "#171796"]),
  t("czechia", "捷克", "Czechia", "UEFA", ["#d7141a", "#11457e"]),
  t("england", "英格兰", "England", "UEFA", ["#ffffff", "#c8102e"]),
  t("france", "法国", "France", "UEFA", ["#0055a4", "#ef4135"]),
  t("germany", "德国", "Germany", "UEFA", ["#000000", "#dd0000"]),
  t("netherlands", "荷兰", "Netherlands", "UEFA", ["#ae1c28", "#21468b"]),
  t("norway", "挪威", "Norway", "UEFA", ["#ba0c2f", "#00205b"]),
  t("portugal", "葡萄牙", "Portugal", "UEFA", ["#006600", "#ff0000"]),
  t("scotland", "苏格兰", "Scotland", "UEFA", ["#0065bd", "#ffffff"]),
  t("spain", "西班牙", "Spain", "UEFA", ["#aa151b", "#f1bf00"]),
  t("sweden", "瑞典", "Sweden", "UEFA", ["#006aa7", "#fecc00"]),
  t("switzerland", "瑞士", "Switzerland", "UEFA", ["#d52b1e", "#ffffff"]),
  t("turkiye", "土耳其", "Turkiye", "UEFA", ["#e30a17", "#ffffff"]),
];

export const events: Event[] = [
  {
    id: "nba-finals",
    name: "总决赛",
    shortName: "NBA",
    dateStart: "2026-06-04",
    dateEnd: "2026-06-20",
    status: "live",
    teams: nbaTeams,
    featuredTeamIds: ["sas", "nyk"],
    sourceUrl: "https://www.nba.com/news/2026-nba-finals-schedule",
    accent: "#f04438",
    coverLabel: "Spurs vs Knicks",
    backgroundImage: "/backgrounds/nba-finals-poster.jpg",
  },
  {
    id: "cs-cologne-major",
    name: "科隆Major",
    shortName: "CS2",
    dateStart: "2026-06-02",
    dateEnd: "2026-06-21",
    status: "live",
    teams: csTeams,
    featuredTeamIds: ["vitality", "spirit", "falcons", "mongolz", "natus-vincere", "mouz"],
    sourceUrl: "https://liquipedia.net/counterstrike/Intel_Extreme_Masters/2026/Cologne",
    accent: "#f5c542",
    coverLabel: "Cathedral of Counter-Strike",
    backgroundImage: "/backgrounds/cs-cologne-major-poster.jpg",
  },
  {
    id: "valorant-masters",
    name: "伦敦大师赛",
    shortName: "Valorant",
    dateStart: "2026-06-06",
    dateEnd: "2026-06-21",
    status: "upcoming",
    teams: valorantTeams,
    featuredTeamIds: ["edg", "g2", "team-heretics", "paper-rex", "xlg", "drg"],
    sourceUrl: "https://liquipedia.net/valorant/VCT/2026/Stage_2/Masters",
    accent: "#00e676",
    coverLabel: "Masters London",
    backgroundImage: "/backgrounds/valorant-masters.jpg",
  },
  {
    id: "world-cup",
    name: "男足世界杯",
    shortName: "WORLD CUP",
    dateStart: "2026-06-12",
    dateEnd: "2026-07-20",
    status: "upcoming",
    teams: worldCupTeams,
    featuredTeamIds: ["argentina", "brazil", "france", "england", "spain", "germany"],
    sourceUrl: "https://www.fifa.com/en/tournaments/mens/worldcup/canadamexicousa2026",
    accent: "#d6a13d",
    coverLabel: "Canada · Mexico · USA",
    backgroundImage: "/backgrounds/world-cup.jpg",
  },
];
