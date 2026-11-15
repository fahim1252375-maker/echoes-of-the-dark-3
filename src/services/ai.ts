import { MedalTier, NarrationLanguage, TrialBlueprint, TrialDifficulty } from '../game/types';
import {
  formatShareCode,
  generateLocalTrialBlueprint,
  getDailyUtcTrialInfo,
} from '../game/trialGenerator';

const BASE_API = (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/$/, '') || '';

export type LoreTrigger =
  | 'statue'
  | 'level_start'
  | 'level_complete'
  | 'death'
  | 'secret_found';

export interface AiTextResult {
  text: string;
  source: 'gemini' | 'fallback';
}

export interface LorePayload {
  trigger: LoreTrigger;
  levelNumber: number;
  levelName: string;
  fragmentsCollected: number;
  pulsesUsed: number;
  elapsedSeconds: number;
  deaths: number;
  statueInscription?: string;
  language?: NarrationLanguage;
}

export interface HintPayload {
  levelNumber: number;
  levelName: string;
  fragmentsCollected: number;
  fragmentsMissing: number;
  mechanismsActivated: number;
  mechanismsRequired: number;
  secondsStuck: number;
  language?: NarrationLanguage;
}

export interface RecapPayload {
  levelNumber: number;
  levelName: string;
  completionTimeSeconds: number;
  pulsesUsed: number;
  deaths: number;
  fragmentsCollected: number;
  hintsUsed: number;
  medal: MedalTier;
  language?: NarrationLanguage;
}

// 10 handwritten hints per level across all 3 narration languages for offline / itch.io static resilience
export const LOCAL_HINT_BANK_BY_LANG: Record<NarrationLanguage, Record<number, string[]>> = {
  en: {
    1: [
      'Tap [E] before a chasm so cyan outlines linger long enough to measure your jump.',
      'Keep watch for faint red glow ahead—crystal spikes emit subtle embers in the dark.',
      'Check slightly off the central bridge; an amber fragment hides along a quiet spur.',
      'Hold [Shift] while leaping across wider hidden stepping stones.',
      'Listen to the Ancient Watcher near spawn with [F] if you lose your bearings.',
      'Always activate the Awakening Rune pedestal with [F] in the central sanctuary.',
      'Step onto the glowing checkpoint plinth in the middle courtyard to save progress.',
      'Look left from the central courtyard and pulse outward for the violet secret bridge.',
      'Let Echo Energy climb above 25% before crossing long invisible spans.',
      'Follow the cyan portal beacon at the far north once the Awakening Rune glows.',
    ],
    2: [
      'The temple exit stays sealed until both West and East Temple Seals are activated with [F].',
      'Moving stone platforms keep steady loops—emit a pulse as one drifts near your ledge.',
      'Sweep a sonar ring northward from the west platform to uncover the violet secret bridge.',
      'Pause behind stone cover on the north bridge until the Sentinel drone clears.',
      'In the East Wing, wait for the vertical moving lift to descend level with your ledge.',
      'Pulse before stepping onto the final moving bridge so you spot the landing edge.',
      'Trigger the central checkpoint plinth before branching into the West or East wings.',
      'Keep your camera aligned straight ahead before hopping between moving platforms.',
      'Look for the fourth Echo Fragment hovering above the final horizontal moving platform.',
      'Every activated Temple Seal permanently unlocks half of the north exit portal.',
    ],
    3: [
      'Sentinel drones sweep fixed routes; pause until their crimson rings drift clear.',
      'Hold [Shift] to sprint into longer jumps across the upper abyss vaults.',
      'Follow both West and East wings from the Citadel Hub to awaken two Resonance Cores.',
      'A violet secret platform hides directly north behind the West Resonance Core.',
      'Board the vertical lift on the North Spire path when it rises beside the sanctum.',
      'Activate the second checkpoint atop the North Spire before crossing the final bridge.',
      'Pulse from the center of the Citadel Hub to map both side wings at once.',
      'Stay centered between twin spikes guarding the north stairs of the central plaza.',
      'Read the Heart Architect statue [F] near arrival for lore on the Resonance Cores.',
      'Return to the north portal once all three Resonance Cores burn bright cyan.',
    ],
    4: [
      'Stand atop a colored Glyph Pad while pulsing [E] to resonate its matching crystal door.',
      'Hit a Mirror Crystal with sonar to fire a directional light beam across unseen chasms.',
      'Crumbling platforms shudder and drop 0.8s after landing—keep moving cleanly.',
      'Crouch with [C] or Ctrl near sound-sensitive drones so footsteps go unheard.',
      'Check behind the West crumbling span for a violet secret ledge holding a fragment.',
      'Trigger the Cyan Glyph Pad on the east hub edge to unseal the Mirror Gallery.',
      'After pulsing the East Mirror Crystal, cross swiftly while its beam lights the stones.',
      'Reach the Amber Glyph Pad in the north vault quietly before emitting a pulse.',
      'Activate both East and West Cavern Chimes [F] before leaping across the final crumble span.',
      'Sprint onto crumbling stones so momentum carries you safely to the next ledge.',
    ],
    5: [
      'Hold [E] up to 1.5s for a Charged Pulse that reaches distant mirrors and hidden glyphs.',
      'Crouch with [C] or Ctrl near sound-attracted drones so footsteps do not alert them.',
      'Stand on the Cyan and Violet Glyph Pads on opposite Nexus flanks while pulsing.',
      'Follow the East Wing past the vertical lift to reach a hidden east secret fragment.',
      'Aim a Charged Pulse at the West Mirror Crystal to light the whole west bridge line.',
      'Cross crumbling spans without hesitating; they reform 4 seconds after collapsing.',
      'Touch the north spire checkpoint before challenging the Amber Door and finale arena.',
      'Hold your Echo Pulse while a sound-hunting drone is right beside you.',
      'Link all three Abyssal Seals with [F] and stun the Silent Warden 3 times via Mirror beams.',
      'Lure the Silent Warden into a Mirror beam line with a pulse, crouch to freeze it, then charge-pulse the mirror.',
    ],
  },
  bn: {
    1: [
      'লাফ দেওয়ার আগে খাদের ধারে [E] চেপে অদৃশ্য নীল সেতু দেখে নাও।',
      'সামনের লালচে আভার দিকে নজর রাখো—অন্ধকারেও সেটি ধারালো ক্রিস্টাল চিহ্নিত করে।',
      'মূল পথের পাশের ধাপগুলো দেখো; একটি অ্যাম্বার খণ্ড পাশের প্রান্তে লুকানো আছে।',
      'দূরের অদৃশ্য পাথরে লাফানোর সময় [Shift] ধরে দৌড়ে লাফ দাও।',
      'দিক ভুলে গেলে শুরুর প্রাচীন প্রহরী মূর্তির কাছে [F] চেপে বার্তা পড়ো।',
      'উত্তরে যাওয়ার আগে কেন্দ্রীয় প্রাঙ্গণের অ্যাওয়েকেনিং রুনটি [F] দিয়ে সক্রিয় করো।',
      'মাঝের প্রাঙ্গণে জ্বলজ্বলে চেকপয়েন্ট পাথরে দাঁড়িয়ে অগ্রগতি সংরক্ষণ করো।',
      'মাঝের প্রাঙ্গণ থেকে বামে পালস পাঠিয়ে বেগুনি গোপন সেতুটি খুঁজে বের করো।',
      'অদৃশ্য পথে পা বাড়ানোর আগে ইকো এনার্জি ২৫% এর ওপরে উঠতে দাও।',
      'রুন সক্রিয় হলে উত্তরের উজ্জ্বল তোরণের দিকে এগিয়ে যাও।',
    ],
    2: [
      'পশ্চিম ও পূর্ব উভয় টেম্পল সিল [F] দিয়ে সক্রিয় না করা পর্যন্ত তোরণ বন্ধ থাকবে।',
      'চলমান নীল পাথরগুলো নির্দিষ্ট পথে ঘোরে—কাছে এলে পালস চালিয়ে অবস্থান দেখে নাও।',
      'পশ্চিম ডানার উত্তরে একটি গোপন বেগুনি সেতু আছে; পালস দিয়ে খুঁজে নাও।',
      'উত্তরের সেতুতে টহল দেওয়া ড্রোনের লাল আভা সরে যাওয়া পর্যন্ত অপেক্ষা করো।',
      'পূর্ব ডানায় লিফট পাথরটি নিচে নামলে তবেই তাতে লাফ দাও।',
      'শেষ চলমান সেতুতে ওঠার আগে পালস দাও যেন অবতরণের কিনারা স্পষ্ট দেখা যায়।',
      'দুই ডানায় যাওয়ার আগে কেন্দ্রীয় চেকপয়েন্টে পা রাখো।',
      'লাফ দেওয়ার আগে মাউস দিয়ে ক্যামেরা সেতুর সোজাসুজি রাখো।',
      'শেষ চলমান সেতুর ওপরে চতুর্থ ইকো খণ্ডটি সংগ্রহ করো।',
      'প্রতিটি সিল সক্রিয় করলে উত্তরের তোরণের অর্ধেক তালা খুলে যায়।',
    ],
    3: [
      'টহলদারি ড্রোনগুলো নির্দিষ্ট ছন্দে চলে—লাল আভা সরে যাওয়া পর্যন্ত অপেক্ষা করো।',
      'বড় ফাঁক পেরোতে পালসের পরপরই [Shift] ধরে দৌড়ে লাফ দাও।',
      'কেন্দ্রীয় চত্বর থেকে পশ্চিম ও পূর্ব দুই ডানায় গিয়ে প্রথম দুটি কোর জাগাও।',
      'পশ্চিম রেজোন্যান্স কোরের ঠিক উত্তরে একটি বেগুনি গোপন পথ আছে।',
      'উত্তর চূড়ার লিফটটি ওপরের মেঝের সমান হলে লাফ দিয়ে ওপরে উঠে যাও।',
      'শেষ ড্রোন সেতু পার হওয়ার আগে উত্তর চূড়ার দ্বিতীয় চেকপয়েন্ট সক্রিয় করো।',
      'কেন্দ্রীয় চত্বরের মাঝখান থেকে পালস দিলে পাশের পথ ও কাঁটা একসাথে দেখা যায়।',
      'কেন্দ্রীয় চত্বরের উত্তর সিঁড়ির কাঁটা এড়িয়ে মাঝখান দিয়ে হাঁটো।',
      'তিনটি কোরের নির্দেশনা পেতে স্থপতির মূর্তি [F] দিয়ে পড়ো।',
      'তিনটি কোর উজ্জ্বল নীল হলে উত্তরের মহাতোরণে প্রবেশ করো।',
    ],
    4: [
      'রঙিন গ্লিফ প্যাডের ওপর দাঁড়িয়ে [E] পালস দাও যেন মিল থাকা দরজা খুলে যায়।',
      'মিরর ক্রিস্টালে সোনার ঢেউ আঘাত হানলে অদৃশ্য সেতু বরাবর আলোর রশ্মি ছড়ায়।',
      'ভঙ্গুর পাথর পা রাখার ০.৮ সেকেন্ড পর ভেঙে পড়ে—থেমে না থেকে পার হও।',
      'উত্তরের কক্ষে শব্দ-সংবেদনশীল ড্রোনের কাছে [C] চেপে নিঃশব্দে হাঁটো।',
      'পশ্চিমের ভঙ্গুর সেতুর পেছনে বেগুনি গোপন পাথরে একটি খণ্ড রয়েছে।',
      'মিরর গ্যালারি খুলতে কেন্দ্রীয় কক্ষের পূর্বের সায়ান গ্লিফ প্যাডে পালস দাও।',
      'পূর্ব গ্যালারির মিরর ক্রিস্টালে পালস করার পর আলোর রশ্মি থাকতে থাকতেই পার হও।',
      'উত্তরের কক্ষে নিঃশব্দে অ্যাম্বার গ্লিফ প্যাডে পৌঁছে তারপর পালস দাও।',
      'শেষ ভঙ্গুর সেতুতে লাফানোর আগে পূর্ব ও পশ্চিম উভয় চিমে [F] দিয়ে সাড়া দাও।',
      'ভঙ্গুর পাথরের ওপর দৌড়ে গেলে ভেঙে পড়ার আগেই পরের ধাপে পৌঁছানো যায়।',
    ],
    5: [
      'দূরের মিরর ক্রিস্টালে পৌঁছাতে [E] ১.৫ সেকেন্ড চেপে ধরে চার্জড পালস দাও।',
      'শব্দ-শিকারি ড্রোনের কাছে [C] বা Ctrl চেপে কুঁজো হয়ে চলো।',
      'নেক্সাস চত্বরের দুই পাশের সায়ান ও ভায়োলেট গ্লিফ প্যাডে দাঁড়িয়ে পালস দাও।',
      'পূর্ব ডানার লিফটের পর ডানদিকের একদম প্রান্তে একটি গোপন খণ্ড লুকানো আছে।',
      'পশ্চিমের মিরর ক্রিস্টালে চার্জড পালস ছুড়লে পশ্চিম সেতুপথ আলোকিত হবে।',
      'ভঙ্গুর পাথরে থেমে না থেকে এগিয়ে চলো; ৪ সেকেন্ড পর পাথর ফিরে আসে।',
      'অ্যাম্বার দরজার আগে উত্তরের চেকপয়েন্টটি সক্রিয় করে নাও।',
      'শব্দ-সংবেদনশীল ড্রোন খুব কাছে থাকলে পালস দেওয়া থেকে বিরত থাকো।',
      'তিনটি সিল [F] দিয়ে সক্রিয় করো এবং মিরর রশ্মিতে সাইলেন্ট ওয়ার্ডেনকে ৩ বার থামাও।',
      'পালস দিয়ে ওয়ার্ডেনকে মিরর রশ্মির পথে টেনে এনে চার্জড পালসে স্তব্ধ করো।',
    ],
  },
  zh: {
    1: [
      '在悬崖边缘轻按 [E] 发出声波，隐藏的青色石桥会显现 2.5 秒。',
      '留意前方微弱的红色余晖——即使在黑暗中它也标记着尖刺陷阱。',
      '检查主路旁侧的石阶，一枚琥珀碎片正藏在支路尽头。',
      '跨越较宽的隐藏跳台时，按住 [Shift] 冲刺起跳会更稳妥。',
      '若迷失方向，可在起点旁按 [F] 阅读古代守望者石像的铭文。',
      '向北推进前，记得在中庭用 [F] 激活唤醒符文基座。',
      '踏上中央庭院发光的检查点基座以保存当前进度。',
      '在中央庭院面向左侧发出声波，即可发现紫色秘密暗桥。',
      '踏上隐形平台前，先等待回声能量恢复到 25% 以上。',
      '激活唤醒符文后，跟随正北方亮起的青色传送门光柱前进。',
    ],
    2: [
      '在用 [F] 激活西翼与东翼的两座神庙封印前，出口大门保持封闭。',
      '蓝色移动平台按固定轨迹往返——等它靠近石台时再发声起跳。',
      '西翼平台北方藏着一条紫色秘密通道，向北扫描即可显现。',
      '注意北桥上巡逻的哨兵无人机，在石柱后等待其红光掠过。',
      '在东翼，等待垂直升降台降到与你齐平的位置再跃上。',
      '踏上最后一座移动桥梁前先发一次脉冲，看清落点边缘。',
      '探索东西两翼之前，先踩亮中央大厅的检查点水晶。',
      '起跳前用鼠标将镜头对准平台正前方，让落点更精准。',
      '第四枚回声碎片悬停在最后一段横向移动平台的上方。',
      '每激活一座神庙封印，北门锁芯便永久解开一半。',
    ],
    3: [
      '哨兵无人机沿窄桥规律巡航——待红色警戒圈远离后再动身。',
      '发出声波后结合 [Shift] 冲刺跳跃，可轻松跨过较宽深渊。',
      '从中央广场分别前往东西两翼，唤醒前两座共鸣核心。',
      '西侧共鸣核心基座后方藏着一条通往秘密碎片的紫色暗径。',
      '北塔路线中，等待垂直升降梯升至与上层平台接近时再跃起。',
      '挑战北端最终巡逻桥前，先触发北塔上方的第二个检查点。',
      '站在中央广场中心发出脉冲，能同时看清两侧路线与尖刺位置。',
      '中央广场北阶两侧有尖刺守卫，请沿着阶梯正中行进。',
      '可用 [F] 阅读入口处的“核心建筑师”石像获取线索。',
      '三座共鸣核心全部亮起青光后，即可返回北方圣坛进入传送门。',
    ],
    4: [
      '站在彩色符文踏板上按 [E] 发出脉冲，即可开启同色晶体大门。',
      '用声波击中镜面水晶，它会自动朝前方投射照明光束。',
      '碎裂石板在落脚 0.8 秒后晃动并坠落，切勿停留。',
      '靠近北方大厅的听觉猎杀无人机时，按住 [C] 静步潜行。',
      '西侧碎石桥后方藏有一块紫色秘密平台与回声碎片。',
      '在中央大厅东侧的青色符文踏板上发声，即可解锁镜廊通道。',
      '激活东廊镜面水晶后，趁光束照亮暗桥迅速连续通过。',
      '到达北厅后先悄悄接近琥珀符文踏板，再发声开门。',
      '跨过最终碎桥前，确保东西两侧的音铃都已用 [F] 激活。',
      '以冲刺节奏连续踏过碎裂石台，能在塌陷前跃至安全区。',
    ],
    5: [
      '长按 [E] 最多 1.5 秒释放蓄力脉冲，触及远处的镜面水晶与机关。',
      '在听觉无人机附近按住 [C] 潜行，脚步不会暴露位置。',
      '站在核心枢纽两侧的青色与紫色符文踏板上脉冲解锁两翼。',
      '穿过东翼升降平台后向最东侧探索，可找到隐藏的秘密碎片。',
      '朝西翼镜面水晶释放蓄力脉冲，可将整条西侧暗桥一次照亮。',
      '经过碎裂平台时保持行进节奏；塌陷后 4 秒会自动复原。',
      '通过北侧大厅前触发检查点，为最终决战做好准备。',
      '当听觉无人机紧邻身旁时暂缓脉冲，等它飘远再发声。',
      '激活全部三座封印 [F]，借镜面光束眩晕沉寂守卫 3 次解锁大门。',
      '用脉冲引诱沉寂守卫走入光束路线，蹲伏冻结后对镜面蓄力脉冲即可击晕。',
    ],
  },
};

const LOCAL_LORE_BANK_BY_LANG: Record<NarrationLanguage, Record<LoreTrigger, string[]>> = {
  en: {
    level_start: [
      'The cavern holds its breath. Strike the silence with [E] and let stone answer.',
      'Shadow covers the bridges ahead, yet every ledge remembers the hum of an echo.',
    ],
    statue: [
      'Older explorers carved these watchers to remind the lost: listen deeper than you look.',
      'Cold granite carries a warm resonance when your Echo Core rings beside it.',
    ],
    secret_found: [
      'An unmapped seam answers your stride—rare light waits where few dared step.',
      'You read the quiet between bridges and uncovered a forgotten vault.',
    ],
    death: [
      'The anchor pulls your echo back from the abyss. Pulse once before taking flight.',
      'Darkness teaches patience; let each cyan ring settle before crossing.',
    ],
    level_complete: [
      'Ancient locks turn in tune with your core. Deeper silence beckons beyond the gate.',
      'The seal opens cleanly—your echoes now trace a path through the dark.',
    ],
  },
  bn: {
    level_start: [
      'গহ্বর নিশ্বাস ধরে রেখেছে। [E] চেপে নীরবতায় আঘাত হানো এবং শোনো কী উত্তর আসে।',
      'সামনের সেতুগুলো ছায়ায় ঢাকা, তবুও প্রতিটি পাথর প্রতিধ্বনির সুর মনে রাখে।',
    ],
    statue: [
      'প্রাচীন অভিযাত্রীরা এই প্রহরী খোদাই করেছিল: চোখের চেয়ে গভীরে কান পাতো।',
      'ইকো কোর বেজে উঠলে ঠান্ডা গ্রানাইট পাথরেও উষ্ণ কম্পন জাগে।',
    ],
    secret_found: [
      'অজানা এক ফাটল তোমার পদধ্বনিতে সাড়া দিয়েছে—বিরল আলো অপেক্ষা করছে।',
      'দুই সেতুর মাঝের নীরবতা পড়ে তুমি এক বিস্মৃত কক্ষ খুঁজে পেলে।',
    ],
    death: [
      'অ্যাঙ্কর তোমাকে শূন্যতা থেকে ফিরিয়ে আনে। লাফানোর আগে একবার পালস দাও।',
      'অন্ধকার ধৈর্য শেখায়; প্রতিটি নীলচে বৃত্ত স্থির হতে দিয়ে পা বাড়াও।',
    ],
    level_complete: [
      'প্রাচীন তালা তোমার কোরের সুরে ঘুরেছে। তোরণের ওপারে আরও গভীর নীরবতা ডাকছে।',
      'সিল খুলে গেছে—তোমার প্রতিধ্বনিই এখন অন্ধকারের পথরেখা।',
    ],
  },
  zh: {
    level_start: [
      '洞窟屏住呼吸。按下 [E] 敲响寂静，倾听石壁传来的回响。',
      '暗影遮蔽前方桥梁，但每一块基石仍铭记着声波的震颤。',
    ],
    statue: [
      '先代探索者雕琢这些守望石像，只为告诫后来者：倾听胜过凝视。',
      '当回声核心在侧畔鸣响，冰冷的花岗岩也泛起温热的共鸣。',
    ],
    secret_found: [
      '一道未被测绘的岩缝回应了你的脚步——罕见微光留给敢于偏离寻常的人。',
      '你读懂了桥梁之间的寂静，揭开了一座尘封密室。',
    ],
    death: [
      '锚点将你的回声拉回深渊之上。起跃之前，先送出一道声波。',
      '黑暗教会人耐心；等待青色涟漪稳固后再迈步向前。',
    ],
    level_complete: [
      '古老石锁与核心同频转动。门扉之外，更深沉的寂静正在低语。',
      '封印应声开启——你的回声已在黑暗中刻出通途。',
    ],
  },
};

export function getLocalFallbackLore(payload: LorePayload): AiTextResult {
  const lang = payload.language ?? 'en';
  const langBank = LOCAL_LORE_BANK_BY_LANG[lang] ?? LOCAL_LORE_BANK_BY_LANG.en;
  const list = langBank[payload.trigger] ?? langBank.level_start;
  const idx = (payload.levelNumber + payload.pulsesUsed + payload.deaths) % list.length;
  return {
    text:
      lang === 'en' && payload.trigger === 'statue' && payload.statueInscription
        ? payload.statueInscription
        : list[idx],
    source: 'fallback',
  };
}

export function getLocalFallbackHint(payload: HintPayload): AiTextResult {
  const lang = payload.language ?? 'en';
  const langBank = LOCAL_HINT_BANK_BY_LANG[lang] ?? LOCAL_HINT_BANK_BY_LANG.en;
  const list = langBank[payload.levelNumber] ?? langBank[1];
  if (payload.mechanismsRequired > 0 && payload.mechanismsActivated < payload.mechanismsRequired && payload.secondsStuck < 20) {
    return {
      text: `${list[0]} (${payload.mechanismsActivated}/${payload.mechanismsRequired})`,
      source: 'fallback',
    };
  }
  const idx = Math.floor(payload.secondsStuck / 12) % list.length;
  return {
    text: list[idx],
    source: 'fallback',
  };
}

export function getLocalFallbackRecap(payload: RecapPayload): AiTextResult {
  const t = Math.round(payload.completionTimeSeconds);
  const lang = payload.language ?? 'en';
  if (lang === 'bn') {
    return {
      text: `লেভেল ০${payload.levelNumber} (${payload.levelName}) ${t} সেকেন্ডে সম্পন্ন—${payload.pulsesUsed}টি পালস ও ${payload.fragmentsCollected}টি খণ্ড নিয়ে অন্ধকার পেরিয়েছ।`,
      source: 'fallback',
    };
  }
  if (lang === 'zh') {
    return {
      text: `历时 ${t} 秒穿过第 0${payload.levelNumber} 关「${payload.levelName}」，以 ${payload.pulsesUsed} 道声波寻回 ${payload.fragmentsCollected} 枚碎片。`,
      source: 'fallback',
    };
  }
  const poise =
    payload.deaths === 0
      ? 'Without a single fall, your pulse read every hidden bridge.'
      : `After ${payload.deaths} ${payload.deaths === 1 ? 'fall' : 'falls'}, your Echo Core mapped the way clean.`;
  return {
    text: `Cleared ${payload.levelName} in ${t}s with ${payload.pulsesUsed} pulses and ${payload.fragmentsCollected} fragments. ${poise}`,
    source: 'fallback',
  };
}

async function postAiWithTimeout<TResponse>(path: string, body: unknown, timeoutMs = 3500): Promise<TResponse | null> {
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(`${BASE_API}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { text?: unknown; source?: unknown };
    if (typeof data.text !== 'string' || !data.text.trim()) return null;
    const source = data.source === 'gemini' ? 'gemini' : 'fallback';
    return { text: data.text.trim(), source } as TResponse;
  } catch {
    return null;
  } finally {
    window.clearTimeout(timer);
  }
}

export async function fetchAiLore(
  payload: LorePayload,
  aiEnabled: boolean
): Promise<AiTextResult> {
  if (!aiEnabled) {
    return getLocalFallbackLore(payload);
  }
  const remote = await postAiWithTimeout<AiTextResult>('/api/ai/lore', payload);
  return remote ?? getLocalFallbackLore(payload);
}

export async function fetchAiHint(
  payload: HintPayload,
  aiEnabled: boolean
): Promise<AiTextResult> {
  if (!aiEnabled) {
    return getLocalFallbackHint(payload);
  }
  const remote = await postAiWithTimeout<AiTextResult>('/api/ai/hint', payload);
  return remote ?? getLocalFallbackHint(payload);
}

export async function fetchAiRecap(
  payload: RecapPayload,
  aiEnabled: boolean
): Promise<AiTextResult> {
  if (!aiEnabled) {
    return getLocalFallbackRecap(payload);
  }
  const remote = await postAiWithTimeout<AiTextResult>('/api/ai/recap', payload, 4500);
  return remote ?? getLocalFallbackRecap(payload);
}

export interface TrialFetchResult {
  seed: number;
  difficulty: TrialDifficulty;
  shareCode: string;
  blueprint: TrialBlueprint;
  source: 'gemini' | 'fallback';
  isDaily?: boolean;
  dateUtc?: string;
}

export async function fetchTrialBlueprint(
  seed: number,
  difficulty: TrialDifficulty,
  themeHint?: string
): Promise<TrialFetchResult> {
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), 4500);
  try {
    const res = await fetch(`${BASE_API}/api/ai/trial`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ seed, difficulty, themeHint }),
      signal: controller.signal,
    });
    if (res.ok) {
      const data = (await res.json()) as TrialFetchResult;
      if (data?.blueprint && Array.isArray(data.blueprint.rooms)) {
        return data;
      }
    }
  } catch {
    // Fall back deterministically offline
  } finally {
    window.clearTimeout(timer);
  }
  return {
    seed,
    difficulty,
    shareCode: formatShareCode(seed, difficulty),
    blueprint: generateLocalTrialBlueprint(seed, difficulty),
    source: 'fallback',
  };
}

export async function fetchDailyTrial(): Promise<TrialFetchResult> {
  const localDaily = getDailyUtcTrialInfo();
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), 4500);
  try {
    const res = await fetch(`${BASE_API}/api/trial/daily`, {
      signal: controller.signal,
    });
    if (res.ok) {
      const data = (await res.json()) as TrialFetchResult;
      if (data?.blueprint && Array.isArray(data.blueprint.rooms)) {
        return data;
      }
    }
  } catch {
    // Fall back deterministically offline
  } finally {
    window.clearTimeout(timer);
  }
  return {
    seed: localDaily.seed,
    difficulty: localDaily.difficulty,
    shareCode: localDaily.shareCode,
    blueprint: generateLocalTrialBlueprint(localDaily.seed, localDaily.difficulty),
    source: 'fallback',
    isDaily: true,
    dateUtc: localDaily.dateUtc,
  };
}

export interface VisionTrialResult {
  seed: number;
  difficulty: TrialDifficulty;
  shareCode: string;
  blueprint: TrialBlueprint;
  source: 'gemini-vision' | 'procedural';
  fallbackReason?: string;
}

export const MAX_TRIAL_IMAGE_BYTES = 2 * 1024 * 1024;
const ALLOWED_MIME_TYPES = new Set(['image/png', 'image/jpeg', 'image/webp']);

async function detectBrowserImageMime(file: File): Promise<'image/png' | 'image/jpeg' | 'image/webp' | null> {
  if (file.size < 16 || file.size > MAX_TRIAL_IMAGE_BYTES) return null;
  const header = new Uint8Array(await file.slice(0, 12).arrayBuffer());
  if (
    header[0] === 0x89 &&
    header[1] === 0x50 &&
    header[2] === 0x4e &&
    header[3] === 0x47 &&
    header[4] === 0x0d &&
    header[5] === 0x0a &&
    header[6] === 0x1a &&
    header[7] === 0x0a
  ) {
    return 'image/png';
  }
  if (header[0] === 0xff && header[1] === 0xd8 && header[2] === 0xff) {
    return 'image/jpeg';
  }
  if (
    header[0] === 0x52 &&
    header[1] === 0x49 &&
    header[2] === 0x46 &&
    header[3] === 0x46 &&
    header[8] === 0x57 &&
    header[9] === 0x45 &&
    header[10] === 0x42 &&
    header[11] === 0x50
  ) {
    return 'image/webp';
  }
  return null;
}

function arrayBufferToBase64(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  let binary = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

async function hashBufferToSeed(buf: ArrayBuffer): Promise<number> {
  const bytes = new Uint8Array(buf);
  let h = 2166136261;
  for (let i = 0; i < bytes.length; i += 1) {
    h ^= bytes[i];
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0) || 104729;
}

export async function fetchTrialFromImage(
  file: File,
  difficulty: TrialDifficulty
): Promise<VisionTrialResult> {
  if (file.size > MAX_TRIAL_IMAGE_BYTES) {
    throw new Error('Image exceeds the 2 MB maximum file size.');
  }
  const declaredMime = file.type === 'image/jpg' ? 'image/jpeg' : file.type;
  if (declaredMime && !ALLOWED_MIME_TYPES.has(declaredMime)) {
    throw new Error('Only PNG, JPEG, and WebP images are supported.');
  }
  const magicMime = await detectBrowserImageMime(file);
  if (!magicMime) {
    throw new Error('File header does not match a valid PNG, JPEG, or WebP image.');
  }

  const buffer = await file.arrayBuffer();
  const base64 = arrayBufferToBase64(buffer);
  const localSeed = await hashBufferToSeed(buffer);

  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), 7000);
  try {
    const res = await fetch(`${BASE_API}/api/ai/trial-from-image`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        imageBase64: base64,
        mimeType: magicMime,
        difficulty,
      }),
      signal: controller.signal,
    });
    const json = (await res.json()) as Partial<VisionTrialResult> & { error?: string };
    if (!res.ok) {
      if (res.status === 400 && json.error) {
        throw new Error(json.error);
      }
      throw new Error(json.error || `Vision endpoint returned ${res.status}`);
    }
    if (json.blueprint && Array.isArray(json.blueprint.rooms) && typeof json.seed === 'number') {
      return {
        seed: json.seed,
        difficulty: json.difficulty ?? difficulty,
        shareCode: json.shareCode ?? formatShareCode(json.seed, difficulty),
        blueprint: json.blueprint,
        source: json.source === 'gemini-vision' ? 'gemini-vision' : 'procedural',
        fallbackReason: json.fallbackReason,
      };
    }
  } catch (err) {
    if (err instanceof Error && (err.message.includes('2 MB') || err.message.includes('header') || err.message.includes('supported') || err.message.includes('match'))) {
      throw err;
    }
    // Graceful offline / timeout procedural fallback derived deterministically from image bytes
    return {
      seed: localSeed,
      difficulty,
      shareCode: formatShareCode(localSeed, difficulty),
      blueprint: generateLocalTrialBlueprint(localSeed, difficulty),
      source: 'procedural',
      fallbackReason: 'Backend unreachable or timed out; generated procedural trial from image hash.',
    };
  } finally {
    window.clearTimeout(timer);
  }

  return {
    seed: localSeed,
    difficulty,
    shareCode: formatShareCode(localSeed, difficulty),
    blueprint: generateLocalTrialBlueprint(localSeed, difficulty),
    source: 'procedural',
    fallbackReason: 'Using deterministic procedural fallback from image hash.',
  };
}
