import { TestBed } from '@angular/core/testing';
import {
  BossEnum,
  BountyHunterEnum,
  ClueScrollsEnum,
  CompetitiveEnum,
  MiniGameEnum,
  RaidEnum,
  SkillEnum,
} from './hiscore.enum';
import { HiscoreService } from './hiscore.service';

describe('HiscoreService', () => {
  let service: HiscoreService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(HiscoreService);
  });

  it('should be created', () => expect(service).toBeTruthy());

  it('should parse skills from 10/04/2023', () => {
    const hiscoreString =
      '334156,1914,99860290\n576406,87,4188449\n521172,87,4188465\n639254,93,7424420\n480038,97,11487417\n307369,99,14340244\n656770,73,1067785\n640753,90,5737370\n284117,99,13034960\n606830,77,1529619\n326206,90,5347263\n324192,85,3530138\n486289,86,3613313\n213225,90,5346364\n582223,73,995180\n638045,73,1051903\n698786,69,722346\n396600,76,1429094\n469133,75,1210560\n244821,93,7492488\n495070,81,2220596\n400195,68,654647\n595927,71,819574\n429584,82,2428095\n-1,-1\n-1,-1\n-1,-1\n263018,156\n-1,-1\n71658,62\n404405,18\n281515,59\n169031,16\n271102,1\n-1,-1\n-1,-1\n-1,-1\n-1,-1\n126053,87\n-1,-1\n-1,-1\n-1,-1\n-1,-1\n-1,-1\n-1,-1\n-1,-1\n-1,-1\n-1,-1\n130741,52\n-1,-1\n-1,-1\n-1,-1\n-1,-1\n-1,-1\n-1,-1\n248567,52\n-1,-1\n-1,-1\n454256,7\n-1,-1\n150960,194\n200821,963\n-1,-1\n-1,-1\n-1,-1\n-1,-1\n-1,-1\n-1,-1\n-1,-1\n-1,-1\n-1,-1\n-1,-1\n200431,20\n-1,-1\n-1,-1\n-1,-1\n-1,-1\n-1,-1\n-1,-1\n-1,-1\n-1,-1\n-1,-1\n-1,-1\n-1,-1\n-1,-1\n334308,73\n511614,140\n-1,-1\n218039,224';

    const hiscore = service.parseHiscoreString(hiscoreString, new Date(2023, 3, 10));

    expect(hiscore.skills).toEqual({
      [SkillEnum.Overall]: { name: SkillEnum.Overall, rank: 334156, level: 1914, xp: 99860290 },
      [SkillEnum.Attack]: { name: SkillEnum.Attack, rank: 576406, level: 87, xp: 4188449 },
      [SkillEnum.Defence]: { name: SkillEnum.Defence, rank: 521172, level: 87, xp: 4188465 },
      [SkillEnum.Strength]: { name: SkillEnum.Strength, rank: 639254, level: 93, xp: 7424420 },
      [SkillEnum.Hitpoints]: { name: SkillEnum.Hitpoints, rank: 480038, level: 97, xp: 11487417 },
      [SkillEnum.Ranged]: { name: SkillEnum.Ranged, rank: 307369, level: 99, xp: 14340244 },
      [SkillEnum.Prayer]: { name: SkillEnum.Prayer, rank: 656770, level: 73, xp: 1067785 },
      [SkillEnum.Magic]: { name: SkillEnum.Magic, rank: 640753, level: 90, xp: 5737370 },
      [SkillEnum.Cooking]: { name: SkillEnum.Cooking, rank: 284117, level: 99, xp: 13034960 },
      [SkillEnum.Woodcutting]: { name: SkillEnum.Woodcutting, rank: 606830, level: 77, xp: 1529619 },
      [SkillEnum.Fletching]: { name: SkillEnum.Fletching, rank: 326206, level: 90, xp: 5347263 },
      [SkillEnum.Fishing]: { name: SkillEnum.Fishing, rank: 324192, level: 85, xp: 3530138 },
      [SkillEnum.Firemaking]: { name: SkillEnum.Firemaking, rank: 486289, level: 86, xp: 3613313 },
      [SkillEnum.Crafting]: { name: SkillEnum.Crafting, rank: 213225, level: 90, xp: 5346364 },
      [SkillEnum.Smithing]: { name: SkillEnum.Smithing, rank: 582223, level: 73, xp: 995180 },
      [SkillEnum.Mining]: { name: SkillEnum.Mining, rank: 638045, level: 73, xp: 1051903 },
      [SkillEnum.Herblore]: { name: SkillEnum.Herblore, rank: 698786, level: 69, xp: 722346 },
      [SkillEnum.Agility]: { name: SkillEnum.Agility, rank: 396600, level: 76, xp: 1429094 },
      [SkillEnum.Thieving]: { name: SkillEnum.Thieving, rank: 469133, level: 75, xp: 1210560 },
      [SkillEnum.Slayer]: { name: SkillEnum.Slayer, rank: 244821, level: 93, xp: 7492488 },
      [SkillEnum.Farming]: { name: SkillEnum.Farming, rank: 495070, level: 81, xp: 2220596 },
      [SkillEnum.Runecraft]: { name: SkillEnum.Runecraft, rank: 400195, level: 68, xp: 654647 },
      [SkillEnum.Hunter]: { name: SkillEnum.Hunter, rank: 595927, level: 71, xp: 819574 },
      [SkillEnum.Construction]: { name: SkillEnum.Construction, rank: 429584, level: 82, xp: 2428095 },
    });
  });

  it('should parse clue scrolls from 10/04/2023', () => {
    const hiscoreString =
      '334156,1914,99860290\n576406,87,4188449\n521172,87,4188465\n639254,93,7424420\n480038,97,11487417\n307369,99,14340244\n656770,73,1067785\n640753,90,5737370\n284117,99,13034960\n606830,77,1529619\n326206,90,5347263\n324192,85,3530138\n486289,86,3613313\n213225,90,5346364\n582223,73,995180\n638045,73,1051903\n698786,69,722346\n396600,76,1429094\n469133,75,1210560\n244821,93,7492488\n495070,81,2220596\n400195,68,654647\n595927,71,819574\n429584,82,2428095\n-1,-1\n-1,-1\n-1,-1\n263018,156\n-1,-1\n71658,62\n404405,18\n281515,59\n169031,16\n271102,1\n-1,-1\n-1,-1\n-1,-1\n-1,-1\n126053,87\n-1,-1\n-1,-1\n-1,-1\n-1,-1\n-1,-1\n-1,-1\n-1,-1\n-1,-1\n-1,-1\n130741,52\n-1,-1\n-1,-1\n-1,-1\n-1,-1\n-1,-1\n-1,-1\n248567,52\n-1,-1\n-1,-1\n454256,7\n-1,-1\n150960,194\n200821,963\n-1,-1\n-1,-1\n-1,-1\n-1,-1\n-1,-1\n-1,-1\n-1,-1\n-1,-1\n-1,-1\n-1,-1\n200431,20\n-1,-1\n-1,-1\n-1,-1\n-1,-1\n-1,-1\n-1,-1\n-1,-1\n-1,-1\n-1,-1\n-1,-1\n-1,-1\n-1,-1\n334308,73\n511614,140\n-1,-1\n218039,224';

    const hiscore = service.parseHiscoreString(hiscoreString, new Date(2023, 3, 10));

    expect(hiscore.clueScrolls).toEqual({
      [ClueScrollsEnum.ClueScrollsAll]: { name: ClueScrollsEnum.ClueScrollsAll, rank: 263018, score: 156 },
      [ClueScrollsEnum.ClueScrollsBeginner]: { name: ClueScrollsEnum.ClueScrollsBeginner, rank: -1, score: -1 },
      [ClueScrollsEnum.ClueScrollsEasy]: { name: ClueScrollsEnum.ClueScrollsEasy, rank: 71658, score: 62 },
      [ClueScrollsEnum.ClueScrollsMedium]: { name: ClueScrollsEnum.ClueScrollsMedium, rank: 404405, score: 18 },
      [ClueScrollsEnum.ClueScrollsHard]: { name: ClueScrollsEnum.ClueScrollsHard, rank: 281515, score: 59 },
      [ClueScrollsEnum.ClueScrollsElite]: { name: ClueScrollsEnum.ClueScrollsElite, rank: 169031, score: 16 },
      [ClueScrollsEnum.ClueScrollsMaster]: { name: ClueScrollsEnum.ClueScrollsMaster, rank: 271102, score: 1 },
    });
  });

  it('should parse clue scrolls from 10/04/2023', () => {
    const hiscoreString =
      '334156,1914,99860290\n576406,87,4188449\n521172,87,4188465\n639254,93,7424420\n480038,97,11487417\n307369,99,14340244\n656770,73,1067785\n640753,90,5737370\n284117,99,13034960\n606830,77,1529619\n326206,90,5347263\n324192,85,3530138\n486289,86,3613313\n213225,90,5346364\n582223,73,995180\n638045,73,1051903\n698786,69,722346\n396600,76,1429094\n469133,75,1210560\n244821,93,7492488\n495070,81,2220596\n400195,68,654647\n595927,71,819574\n429584,82,2428095\n-1,-1\n-1,-1\n-1,-1\n263018,156\n-1,-1\n71658,62\n404405,18\n281515,59\n169031,16\n271102,1\n-1,-1\n-1,-1\n-1,-1\n-1,-1\n126053,87\n-1,-1\n-1,-1\n-1,-1\n-1,-1\n-1,-1\n-1,-1\n-1,-1\n-1,-1\n-1,-1\n130741,52\n-1,-1\n-1,-1\n-1,-1\n-1,-1\n-1,-1\n-1,-1\n248567,52\n-1,-1\n-1,-1\n454256,7\n-1,-1\n150960,194\n200821,963\n-1,-1\n-1,-1\n-1,-1\n-1,-1\n-1,-1\n-1,-1\n-1,-1\n-1,-1\n-1,-1\n-1,-1\n200431,20\n-1,-1\n-1,-1\n-1,-1\n-1,-1\n-1,-1\n-1,-1\n-1,-1\n-1,-1\n-1,-1\n-1,-1\n-1,-1\n-1,-1\n334308,73\n511614,140\n-1,-1\n218039,224';

    const hiscore = service.parseHiscoreString(hiscoreString, new Date(2023, 3, 10));

    expect(hiscore.clueScrolls).toEqual({
      [ClueScrollsEnum.ClueScrollsAll]: { name: ClueScrollsEnum.ClueScrollsAll, rank: 263018, score: 156 },
      [ClueScrollsEnum.ClueScrollsBeginner]: { name: ClueScrollsEnum.ClueScrollsBeginner, rank: -1, score: -1 },
      [ClueScrollsEnum.ClueScrollsEasy]: { name: ClueScrollsEnum.ClueScrollsEasy, rank: 71658, score: 62 },
      [ClueScrollsEnum.ClueScrollsMedium]: { name: ClueScrollsEnum.ClueScrollsMedium, rank: 404405, score: 18 },
      [ClueScrollsEnum.ClueScrollsHard]: { name: ClueScrollsEnum.ClueScrollsHard, rank: 281515, score: 59 },
      [ClueScrollsEnum.ClueScrollsElite]: { name: ClueScrollsEnum.ClueScrollsElite, rank: 169031, score: 16 },
      [ClueScrollsEnum.ClueScrollsMaster]: { name: ClueScrollsEnum.ClueScrollsMaster, rank: 271102, score: 1 },
    });
  });

  it('should parse bounty hunter from 10/04/2023', () => {
    const hiscoreString =
      '182750,2044,739218553\n-1,1,-1\n-1,1,-1\n33072,99,35667861\n20994,99,59176097\n2285,99,135677275\n-1,1,-1\n18851,99,29759483\n2221,99,200000000\n29587,99,14890984\n14456,99,15294737\n27165,99,14974769\n7625,99,25685277\n9403,99,15677593\n11060,99,15182420\n15994,99,15670250\n8397,99,14543637\n9258,99,14531447\n14017,99,19197367\n6772,99,29348129\n86882,99,14505860\n3987,99,22380804\n4336,99,29717276\n1236,99,17233117\n-1,-1\n4,16726\n363,991\n-1,-1\n-1,-1\n-1,-1\n-1,-1\n-1,-1\n-1,-1\n336531,1\n-1,-1\n-1,-1\n20484,3003\n2992,840\n7871,1328\n360,8290\n-1,-1\n-1,-1\n3597,1459\n13385,2097\n-1,-1\n-1,-1\n78271,44\n-1,-1\n-1,-1\n-1,-1\n-1,-1\n-1,-1\n-1,-1\n-1,-1\n-1,-1\n-1,-1\n48161,553\n8686,921\n123862,56\n-1,-1\n4282,2660\n202115,954\n-1,-1\n-1,-1\n-1,-1\n-1,-1\n-1,-1\n-1,-1\n-1,-1\n-1,-1\n-1,-1\n639,2676\n377056,7\n122464,100\n-1,-1\n-1,-1\n-1,-1\n-1,-1\n69905,666\n-1,-1\n-1,-1\n-1,-1\n-1,-1\n224,5637\n197,3830\n-1,-1\n5999,1018\n-1,-1\n-1,-1';

    const hiscore = service.parseHiscoreString(hiscoreString, new Date(2023, 3, 10));

    expect(hiscore.bountyHunter).toEqual({
      [BountyHunterEnum.BountyHunter]: { name: BountyHunterEnum.BountyHunter, rank: 4, score: 16726 },
      [BountyHunterEnum.BountyHunterRogues]: { name: BountyHunterEnum.BountyHunterRogues, rank: 363, score: 991 },
    });
  });

  it('should parse competitive from 10/04/2023', () => {
    const hiscoreString =
      '282846,1954,157117680\n162551,99,14495220\n151438,99,13895787\n154708,99,16670302\n187495,99,22986635\n163283,99,20887830\n307775,81,2195048\n55579,99,20841830\n275887,99,13035886\n487751,80,2055968\n545102,80,2157975\n501628,80,2132582\n561789,84,3054378\n455762,78,1677130\n446097,75,1312174\n573511,74,1208270\n338145,80,2006088\n380325,77,1483568\n522313,73,1000615\n631879,79,1824580\n251192,93,7408624\n435406,67,556417\n351599,78,1713333\n382224,82,2517440\n-1,-1\n64669,45\n18804,62\n1065312,7\n-1,-1\n809207,3\n1022792,2\n814627,2\n-1,-1\n-1,-1\n1681,8108\n18,5310\n-1,-1\n-1,-1\n-1,-1\n-1,-1\n-1,-1\n-1,-1\n113378,26\n-1,-1\n-1,-1\n-1,-1\n22079,179\n-1,-1\n-1,-1\n-1,-1\n-1,-1\n-1,-1\n-1,-1\n-1,-1\n-1,-1\n-1,-1\n-1,-1\n-1,-1\n319140,18\n-1,-1\n387218,34\n-1,-1\n87819,74\n-1,-1\n-1,-1\n-1,-1\n-1,-1\n-1,-1\n-1,-1\n-1,-1\n-1,-1\n-1,-1\n-1,-1\n283051,33\n-1,-1\n121012,8\n-1,-1\n-1,-1\n-1,-1\n-1,-1\n-1,-1\n44019,1\n121766,7\n-1,-1\n-1,-1\n419414,34\n490434,150\n-1,-1\n259242,113';

    const hiscore = service.parseHiscoreString(hiscoreString, new Date(2023, 3, 10));

    expect(hiscore.competitive).toEqual({
      [CompetitiveEnum.LeaguePoints]: { name: CompetitiveEnum.LeaguePoints, rank: -1, score: -1 }, // League points are not available in regular hiscores
      [CompetitiveEnum.LastManStanding]: { name: CompetitiveEnum.LastManStanding, rank: 1681, score: 8108 },
      [CompetitiveEnum.PvpArena]: { name: CompetitiveEnum.PvpArena, rank: 18, score: 5310 },
    });
  });

  it('should parse minigames from 10/04/2023', () => {
    const hiscoreString =
      '69653,2188,507384852\n19991,99,30483940\n5606,99,35078791\n16583,99,51122403\n12457,99,72126929\n7604,99,91780994\n54614,99,13083796\n124953,99,15955375\n18062,99,22443322\n30029,99,14830625\n41677,99,13513416\n24724,99,15330624\n312388,92,6948378\n33714,99,14260460\n1839,99,43060463\n135592,90,5849993\n114666,91,6446481\n213523,82,2513770\n269336,82,2564465\n63524,99,14834904\n45391,99,17787528\n73945,94,8199447\n97285,92,7010331\n438157,80,2158417\n-1,-1\n-1,-1\n-1,-1\n31327,858\n28808,87\n88914,51\n18171,467\n72458,206\n85434,36\n110019,11\n297753,500\n-1,-1\n3,613379\n187992,58\n-1,-1\n-1,-1\n28367,821\n125522,7\n10571,641\n20566,1684\n-1,-1\n-1,-1\n59973,62\n-1,-1\n150027,33\n-1,-1\n-1,-1\n30882,691\n74419,431\n21113,907\n-1,-1\n8974,1642\n5660,2949\n-1,-1\n153855,47\n-1,-1\n-1,-1\n208060,908\n45603,230\n4404,933\n85430,1\n-1,-1\n-1,-1\n-1,-1\n-1,-1\n-1,-1\n36533,187\n-1,-1\n130416,29\n-1,-1\n3481,182\n-1,-1\n-1,-1\n-1,-1\n43579,1037\n-1,-1\n-1,-1\n-1,-1\n-1,-1\n89277,52\n-1,-1\n-1,-1\n245011,364\n13968,459\n-1,-1';

    const hiscore = service.parseHiscoreString(hiscoreString, new Date(2023, 3, 10));

    expect(hiscore.miniGames).toEqual({
      [MiniGameEnum.SoulWarsZeal]: { name: MiniGameEnum.SoulWarsZeal, rank: 3, score: 613379 },
      [MiniGameEnum.RiftsClosed]: { name: MiniGameEnum.RiftsClosed, rank: 187992, score: 58 },
    });
  });

  it('should parse bosses and raids from 10/04/2023', () => {
    const hiscoreString =
      '2,2277,4600000000\n21,99,200000000\n60,99,200000000\n65,99,200000000\n11,99,200000000\n11,99,200000000\n16,99,200000000\n42,99,200000000\n34,99,200000000\n40,99,200000000\n8,99,200000000\n66,99,200000000\n94,99,200000000\n3,99,200000000\n4,99,200000000\n37,99,200000000\n6,99,200000000\n33,99,200000000\n9,99,200000000\n5,99,200000000\n21,99,200000000\n21,99,200000000\n36,99,200000000\n10,99,200000000\n-1,-1\n-1,-1\n-1,-1\n4,67576\n251,1030\n23,9000\n20,21290\n1,30300\n2,2125\n4,3831\n-1,-1\n-1,-1\n8597,7142\n1742,1087\n13259,1046\n3449,3979\n21890,917\n16389,47\n4766,1207\n869,6436\n141342,55\n22048,36\n27695,150\n2684,719\n2412,1937\n149,7940\n25775,147\n5301,1939\n6606,1955\n5274,1962\n25016,50\n2620,3000\n6315,2754\n4222,1369\n152296,47\n6101,1004\n49014,535\n59262,2612\n441,5009\n2519,1250\n2,337\n2200,3243\n838,2243\n1032,1035\n6946,72\n4073,423\n956,3144\n4143,766\n33921,53\n70093,150\n-1,-1\n117522,10\n8042,661\n3132,189\n3225,3937\n3226,246\n22880,74\n3111,10\n210,175\n17055,447\n432,2667\n3996,5597\n147911,542\n54318,150\n1692,11160';

    const hiscore = service.parseHiscoreString(hiscoreString, new Date(2023, 3, 10));

    expect(hiscore.bosses).toEqual({
      [BossEnum.AbyssalSire]: { name: BossEnum.AbyssalSire, rank: 13259, score: 1046 },
      [BossEnum.AlchemicalHydra]: { name: BossEnum.AlchemicalHydra, rank: 3449, score: 3979 },
      [BossEnum.BarrowsChests]: { name: BossEnum.BarrowsChests, rank: 21890, score: 917 },
      [BossEnum.Bryophyta]: { name: BossEnum.Bryophyta, rank: 16389, score: 47 },
      [BossEnum.Callisto]: { name: BossEnum.Callisto, rank: 4766, score: 1207 },
      [BossEnum.Cerberus]: { name: BossEnum.Cerberus, rank: 869, score: 6436 },
      [BossEnum.ChaosElemental]: { name: BossEnum.ChaosElemental, rank: 27695, score: 150 },
      [BossEnum.ChaosFanatic]: { name: BossEnum.ChaosFanatic, rank: 2684, score: 719 },
      [BossEnum.CommanderZilyana]: { name: BossEnum.CommanderZilyana, rank: 2412, score: 1937 },
      [BossEnum.CorporealBeast]: { name: BossEnum.CorporealBeast, rank: 149, score: 7940 },
      [BossEnum.CrazyArchaeologist]: { name: BossEnum.CrazyArchaeologist, rank: 25775, score: 147 },
      [BossEnum.DagannothPrime]: { name: BossEnum.DagannothPrime, rank: 5301, score: 1939 },
      [BossEnum.DagannothRex]: { name: BossEnum.DagannothRex, rank: 6606, score: 1955 },
      [BossEnum.DagannothSupreme]: { name: BossEnum.DagannothSupreme, rank: 5274, score: 1962 },
      [BossEnum.DerangedArchaeologist]: { name: BossEnum.DerangedArchaeologist, rank: 25016, score: 50 },
      [BossEnum.GeneralGraardor]: { name: BossEnum.GeneralGraardor, rank: 2620, score: 3000 },
      [BossEnum.GiantMole]: { name: BossEnum.GiantMole, rank: 6315, score: 2754 },
      [BossEnum.GrotesqueGuardians]: { name: BossEnum.GrotesqueGuardians, rank: 4222, score: 1369 },
      [BossEnum.Hespori]: { name: BossEnum.Hespori, rank: 152296, score: 47 },
      [BossEnum.KalphiteQueen]: { name: BossEnum.KalphiteQueen, rank: 6101, score: 1004 },
      [BossEnum.KingBlackDragon]: { name: BossEnum.KingBlackDragon, rank: 49014, score: 535 },
      [BossEnum.Kraken]: { name: BossEnum.Kraken, rank: 59262, score: 2612 },
      [BossEnum.KreeArra]: { name: BossEnum.KreeArra, rank: 441, score: 5009 },
      [BossEnum.KrilTsutsaroth]: { name: BossEnum.KrilTsutsaroth, rank: 2519, score: 1250 },
      [BossEnum.Mimic]: { name: BossEnum.Mimic, rank: 2, score: 337 },
      [BossEnum.Nex]: { name: BossEnum.Nex, rank: 2200, score: 3243 },
      [BossEnum.Nightmare]: { name: BossEnum.Nightmare, rank: 838, score: 2243 },
      [BossEnum.PhosanisNightmare]: { name: BossEnum.PhosanisNightmare, rank: 1032, score: 1035 },
      [BossEnum.Obor]: { name: BossEnum.Obor, rank: 6946, score: 72 },
      [BossEnum.PhantomMuspah]: { name: BossEnum.PhantomMuspah, rank: 4073, score: 423 },
      [BossEnum.Sarachnis]: { name: BossEnum.Sarachnis, rank: 956, score: 3144 },
      [BossEnum.Scorpia]: { name: BossEnum.Scorpia, rank: 4143, score: 766 },
      [BossEnum.Skotizo]: { name: BossEnum.Skotizo, rank: 33921, score: 53 },
      [BossEnum.Tempoross]: { name: BossEnum.Tempoross, rank: 70093, score: 150 },
      [BossEnum.ThermoNuclearSmokeDevil]: { name: BossEnum.ThermoNuclearSmokeDevil, rank: 3225, score: 3937 },
      [BossEnum.TzKalZuk]: { name: BossEnum.TzKalZuk, rank: 3111, score: 10 },
      [BossEnum.TzTokJad]: { name: BossEnum.TzTokJad, rank: 210, score: 175 },
      [BossEnum.Venenatis]: { name: BossEnum.Venenatis, rank: 17055, score: 447 },
      [BossEnum.Vetion]: { name: BossEnum.Vetion, rank: 432, score: 2667 },
      [BossEnum.Vorkath]: { name: BossEnum.Vorkath, rank: 3996, score: 5597 },
      [BossEnum.Wintertodt]: { name: BossEnum.Wintertodt, rank: 147911, score: 542 },
      [BossEnum.Zalcano]: { name: BossEnum.Zalcano, rank: 54318, score: 150 },
      [BossEnum.Zulrah]: { name: BossEnum.Zulrah, rank: 1692, score: 11160 },
    });

    expect(hiscore.raids).toEqual({
      [RaidEnum.ChambersOfXeric]: { name: RaidEnum.ChambersOfXeric, rank: 141342, score: 55 },
      [RaidEnum.ChambersOfXericChallengeMode]: { name: RaidEnum.ChambersOfXericChallengeMode, rank: 22048, score: 36 },
      [RaidEnum.TheGauntlet]: { name: RaidEnum.TheGauntlet, rank: -1, score: -1 },
      [RaidEnum.TheCorruptedGauntlet]: { name: RaidEnum.TheCorruptedGauntlet, rank: 117522, score: 10 },
      [RaidEnum.TheatreOfBlood]: { name: RaidEnum.TheatreOfBlood, rank: 8042, score: 661 },
      [RaidEnum.TheatreOfBloodHardMode]: { name: RaidEnum.TheatreOfBloodHardMode, rank: 3132, score: 189 },
      [RaidEnum.TombsOfAmascut]: { name: RaidEnum.TombsOfAmascut, rank: 3226, score: 246 },
      [RaidEnum.TombsOfAmascutExpertMode]: { name: RaidEnum.TombsOfAmascutExpertMode, rank: 22880, score: 74 },
    });
  });
});
