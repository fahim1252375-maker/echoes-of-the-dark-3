export type NarrationLanguage = 'en' | 'bn' | 'zh';
export type LoreTrigger =
  | 'statue'
  | 'level_start'
  | 'level_complete'
  | 'death'
  | 'secret_found';

export const VALID_LANGUAGES: ReadonlySet<NarrationLanguage> = new Set(['en', 'bn', 'zh']);

export function normalizeLanguage(raw: unknown): NarrationLanguage {
  if (raw === 'bn' || raw === 'zh') return raw;
  return 'en';
}

export const FALLBACK_LORE_BY_LANG: Record<NarrationLanguage, Record<LoreTrigger, string[]>> = {
  en: {
    level_start: [
      'The stone remembers every footstep. Strike the dark with your Echo Core and listen for what answers.',
      'Beneath the silenced vault, paths appear only to those who dare send a wave into the void.',
      'Another threshold opens in the deep. Measure your pulses well—the abyss watches between rings.',
    ],
    statue: [
      'Ancient stone holds a quiet resonance: those who map the silence always find the hidden bridge.',
      'Carved before the light failed, this watcher remembers explorers who trusted sound over sight.',
      'Its chiselled eyes track no lantern, only the faint ripple of cyan echoes drifting across the chasm.',
    ],
    secret_found: [
      'An unmapped alcove yields its secret. Even the deepest stone cannot keep quiet forever.',
      'You stepped past the obvious span and uncovered a forgotten seam in the cavern’s memory.',
      'Few wanderers listen closely enough to hear a hidden ledge humming behind the dark.',
    ],
    death: [
      'The echo fades, yet the core pulls you back to the anchor. Breathe, pulse, and read the edges anew.',
      'Darkness claimed that stride, not your resolve. Send a wave before your boots leave stone.',
      'A stumble in the silent pit teaches where the void begins. Listen again from the checkpoint.',
    ],
    level_complete: [
      'The ancient seal yields to your resonance. Deeper chambers stir as the portal closes behind you.',
      'Stone locks turn in harmony with your core. Ahead lies older silence waiting to be mapped.',
      'You carried sound through unbroken shadow. The cavern records your passage in faint cyan light.',
    ],
  },
  bn: {
    level_start: [
      'পাথরের বুক প্রতিটি পদধ্বনি মনে রাখে। ইকো কোর বাজিয়ে দেখো অন্ধকার কী উত্তর দেয়।',
      'নীরব গহ্বরের নিচে কেবল তারাই পথ পায়, যারা শূন্যতায় প্রতিধ্বনি পাঠাতে সাহস করে।',
      'গভীর গুহার আরেকটি দুয়ার খুলেছে। প্রতিধ্বনির মাপ বুঝে পা বাড়াও।',
    ],
    statue: [
      'প্রাচীন পাথরে নীরব সুর বাজে—যারা শূন্যতাকে শোনে, তারা অদৃশ্য সেতু খুঁজে পায়।',
      'আলো নিভে যাওয়ার আগেই এই প্রহরী খোদাই হয়েছিল, যে চোখের চেয়ে ধ্বনিকে বিশ্বাস করত।',
      'এর পাথুরে দৃষ্টি কোনো প্রদীপ খোঁজে না, কেবল নীলচে প্রতিধ্বনির ঢেউ অনুসরণ করে।',
    ],
    secret_found: [
      'অজানা এক গুপ্ত কোণ তার রহস্য খুলে দিল। গভীর পাথরও চিরকাল চুপ থাকতে পারে না।',
      'সাধারণ পথ পেরিয়ে তুমি গুহার বিস্মৃত স্মৃতির এক গোপন ফাটল খুঁজে পেয়েছ।',
      'খুব কম অভিযাত্রীই অন্ধকারের আড়ালে লুকানো পাথরের গুঞ্জন শুনতে পায়।',
    ],
    death: [
      'প্রতিধ্বনি মিলিয়ে গেলেও কোর তোমাকে নিরাপদ স্থানে ফিরিয়ে আনে। আবার শব্দ পাঠিয়ে পথ দেখে নাও।',
      'অন্ধকার শুধু একটি পদক্ষেপ কেড়ে নিয়েছে, তোমার সাহস নয়। লাফানোর আগে ইকো চালাও।',
      'নীরব গহ্বরে প্রতিটি পতন দেখিয়ে দেয় শূন্যতার সীমানা কোথায়। শান্ত হয়ে আবার চেষ্টা করো।',
    ],
    level_complete: [
      'প্রাচীন সিল তোমার প্রতিধ্বনিতে সাড়া দিয়েছে। তোরণ বন্ধ হতেই গভীরতর কক্ষ জেগে উঠল।',
      'পাথরের তালা তোমার কোরের সুরে ঘুরেছে। সামনে অপেক্ষা করছে আরও পুরোনো নীরবতা।',
      'অটুট ছায়ার ভেতর দিয়ে তুমি ধ্বনিকে বহন করে এনেছ। গুহা তোমার পথ মনে রাখবে।',
    ],
  },
  zh: {
    level_start: [
      '石壁铭记着每一次脚步。唤醒回声核心，聆听黑暗深处的回应。',
      '在寂静的穹顶之下，唯有敢于向虚空发出声波的人才能看见前路。',
      '深渊的新门扉已开启。把握好每一次脉冲，黑暗在余波之间凝视着你。',
    ],
    statue: [
      '古老石像封存着低沉的共鸣：懂得倾听寂静的人，总能找到隐藏的桥梁。',
      '它雕刻于光芒熄灭之前，铭记着那些宁可信赖声音也不盲从双眼的探索者。',
      '它的石眼不追寻火光，只追随掠过深渊的微弱青色回声涟漪。',
    ],
    secret_found: [
      '一处未被记录的隐秘石室向你敞开。再深沉的岩石也无法永远守住秘密。',
      '你越过寻常路径，触碰到了洞窟尘封记忆中一条被遗忘的缝隙。',
      '少有旅人能静心听见隐藏在黑暗背后的暗桥低鸣。',
    ],
    death: [
      '回声消散，核心仍将你拉回锚点。深呼吸，再发出一道声波看清边缘。',
      '黑暗夺走了一步失足，却夺不走你的决心。起跳前先倾听回响。',
      '每一次坠落都在标出深渊的边界。从检查点重新出发，让声音为你引路。',
    ],
    level_complete: [
      '古老封印随你的共鸣开启。身后的石门合拢，更深处的圣殿正在苏醒。',
      '石锁与核心谐振而转，前方还有更古老的寂静等待你去描绘。',
      '你携着声音穿越无尽暗影，洞窟将用微光记下你的足迹。',
    ],
  },
};

export const FALLBACK_HINTS_BY_LANG: Record<NarrationLanguage, Record<number, string[]>> = {
  en: {
    1: [
      'Tap [E] near cliff edges to reveal hidden cyan bridges for 2.5 seconds before jumping.',
      'Watch for faint crimson embers ahead—even in darkness they mark crystal spikes.',
      'Check ledges slightly to the side of the main path; an amber fragment hides along a quiet spur.',
      'Hold [Shift] as you leap across wider hidden stepping stones to land with margin.',
      'Listen to the Ancient Watcher near spawn with [F] if you lose your bearings.',
      'Always activate the Awakening Rune pedestal with [F] in the central sanctuary before crossing north.',
      'Step onto the glowing checkpoint plinth in the middle courtyard to anchor your progress.',
      'Look left from the central courtyard and pulse outward to uncover the violet secret bridge.',
      'Let Echo Energy climb above 25% before stepping onto invisible spans.',
      'Follow the cyan portal beacon at the far north end once the Awakening Rune is active.',
    ],
    2: [
      'The temple exit stays sealed until both West and East Temple Seals are activated with [F].',
      'Moving blue platforms trace steady loops—emit a pulse as one drifts near your ledge.',
      'A secret violet walkway hides off the west temple wing; sweep your sonar northward from the west platform.',
      'Watch sentinel drones sweeping across the north bridge and wait behind stone cover until they clear.',
      'In the East Wing, step onto the vertical moving elevator when it dips closest to your ledge.',
      'Pulse just before boarding the final moving bridge so you can read the exit landing edge clearly.',
      'Trigger the central checkpoint plinth before branching into the West or East wings.',
      'Keep camera yaw aligned with your jump direction using the mouse before crossing moving platforms.',
      'Look for the fourth Echo Fragment hovering above the final horizontal moving platform.',
      'Remember that every activated Temple Seal permanently unlocks half of the north exit lock.',
    ],
    3: [
      'Sentinel drones patrol narrow spans in steady rhythms—wait until their crimson rings drift clear.',
      'Combine sprinting [Shift] with timed jumps across longer abyss gaps right after pulsing.',
      'Follow both West and East wings from the Citadel Hub to awaken the first two Resonance Cores.',
      'A violet secret platform extends north behind the West Resonance Core pedestal.',
      'Use the vertical lift on the North Spire path when it rises level with the upper sanctum floor.',
      'Activate the second checkpoint atop the North Spire before attempting the final drone bridge.',
      'Sweeping your sonar from the Citadel Hub center reveals both side routes and nearby spike clusters.',
      'Keep steady spacing from twin spikes flanking the north stairs of the central plaza.',
      'Read the Heart Architect statue near arrival for a reminder of all three Resonance Cores.',
      'Return to the north portal once all three Resonance Cores glow bright cyan.',
    ],
    4: [
      'Stand atop a colored Glyph Pad while pulsing [E] to resonate its matching crystal door open.',
      'Strike Mirror Crystals with your sonar wave to fire a light beam along invisible cavern ledges.',
      'Watch crumbling stones closely—they shudder and drop 0.8s after your boots touch down.',
      'Crouch with [C] or Ctrl near the sound-sensitive drone in the north vault so footsteps stay silent.',
      'Check behind the West crumbling span for a violet secret ledge holding an amber fragment.',
      'Trigger the Cyan Glyph Pad on the east edge of the hub to unseal the Mirror Gallery.',
      'After pulsing the Mirror Crystal in the East Gallery, cross quickly while its beam lights the bridges.',
      'Climb onto the north central vault and quietly reach the Amber Glyph Pad before pulsing.',
      'Activate both East and West Cavern Chimes [F] before jumping across the final crumbling span.',
      'Sprinting onto crumbling platforms gives clean momentum so you clear them before they collapse.',
    ],
    5: [
      'Hold [E] up to 1.5s for a Charged Pulse to reach distant Mirror Crystals and wide resonance vaults.',
      'Crouch with [C] or Ctrl near sound-hunting drones so footsteps do not draw their pursuit.',
      'Stand on the Cyan and Violet Glyph Pads on opposite sides of the Nexus Plaza while pulsing.',
      'Follow the East Wing past the vertical elevator to discover a hidden secret spur on the far east.',
      'Channel a Charged Pulse toward the West Mirror Crystal to illuminate the entire west bridge line.',
      'Cross crumbling spans smoothly without pausing mid-ledge; they reform 4 seconds after collapsing.',
      'Reach the north spire checkpoint before challenging the Amber Door and Silent Core Heart.',
      'Hold your Echo Pulse while a sound-sensitive drone is right beside you—wait until it drifts away.',
      'Link all three Abyssal Seals with [F] and stun the Silent Warden three times via Mirror beams.',
      'Lure the Silent Warden with a pulse, then charge [E] near a Mirror Crystal to bounce light through it.',
    ],
  },
  bn: {
    1: [
      'লাফ দেওয়ার আগে খাদের ধারে [E] চেপে ২.৫ সেকেন্ডের জন্য অদৃশ্য নীল সেতু দেখে নাও।',
      'সামনের লালচে আভার দিকে নজর রাখো—অন্ধকারেও সেটি ধারালো ক্রিস্টালের চিহ্ন দেখায়।',
      'মূল পথের পাশের ধাপগুলো পরীক্ষা করো; একটি অ্যাম্বার খণ্ড নীরব প্রান্তে লুকিয়ে আছে।',
      'দূরের অদৃশ্য পাথরে লাফানোর সময় [Shift] ধরে দৌড়ে লাফ দাও।',
      'দিক ভুলে গেলে শুরুর দিকের প্রাচীন প্রহরী মূর্তির কাছে [F] চেপে বার্তা পড়ো।',
      'উত্তরে যাওয়ার আগে কেন্দ্রীয় প্রাঙ্গণের অ্যাওয়েকেনিং রুনটি [F] দিয়ে সক্রিয় করো।',
      'মাঝের প্রাঙ্গণে জ্বলজ্বলে চেকপয়েন্ট পাথরে দাঁড়িয়ে অগ্রগতি সংরক্ষণ করো।',
      'মাঝের প্রাঙ্গণ থেকে বাম দিকে পালস পাঠিয়ে বেগুনি গোপন সেতুটি খুঁজে বের করো।',
      'অদৃশ্য পথে পা বাড়ানোর আগে ইকো এনার্জি ২৫% এর ওপরে উঠতে দাও।',
      'রুন সক্রিয় হলে উত্তরের উজ্জ্বল তোরণের দিকে এগিয়ে যাও।',
    ],
    2: [
      'পশ্চিম ও পূর্ব উভয় টেম্পল সিল [F] দিয়ে সক্রিয় না করা পর্যন্ত তোরণ বন্ধ থাকবে।',
      'চলমান নীল পাথরগুলো নির্দিষ্ট পথে ঘোরে—কাছে এলে ইকো পালস চালিয়ে অবস্থান দেখে নাও।',
      'পশ্চিম ডানার উত্তর দিকে একটি গোপন বেগুনি সেতু লুকিয়ে আছে; পালস দিয়ে খুঁজে নাও।',
      'উত্তরের সেতুতে টহল দেওয়া ড্রোন থেকে আড়ালে অপেক্ষা করে নিরাপদ সময়ে পার হও।',
      'পূর্ব ডানায় লিফট পাথরটি নিচে নামলে তবেই তাতে লাফ দাও।',
      'শেষ চলমান সেতুতে ওঠার আগে পালস দাও যেন অবতরণের কিনারা স্পষ্ট দেখা যায়।',
      'দুই ডানায় যাওয়ার আগে কেন্দ্রীয় চেকপয়েন্টে পা রাখো।',
      'লাফ দেওয়ার আগে মাউস দিয়ে ক্যামেরা সেতুর সোজাসুজি স্থির করে নাও।',
      'শেষ চলমান সেতুর ওপরে ভাসমান চতুর্থ ইকো খণ্ডটি সংগ্রহ করতে ভুলো না।',
      'প্রতিটি সিল সক্রিয় করলে উত্তরের তোরণের অর্ধেক তালা স্থায়ীভাবে খুলে যায়।',
    ],
    3: [
      'টহলদারি ড্রোনগুলো নির্দিষ্ট ছন্দে চলে—তাদের লাল আভা সরে যাওয়া পর্যন্ত অপেক্ষা করো।',
      'বড় ফাঁক পেরোতে পালসের পরপরই [Shift] ধরে দৌড়ে লাফ দাও।',
      'কেন্দ্রীয় চত্বর থেকে পশ্চিম ও পূর্ব দুই ডানায় গিয়ে প্রথম দুটি রেজোন্যান্স কোর জাগিয়ে তোলো।',
      'পশ্চিম রেজোন্যান্স কোরের ঠিক উত্তরে একটি বেগুনি গোপন পথ লুকানো আছে।',
      'উত্তর চূড়ার লিফটটি ওপরের মেঝের সমান হলে লাফ দিয়ে ওপরে উঠে যাও।',
      'শেষ ড্রোন সেতু পার হওয়ার আগে উত্তর চূড়ার দ্বিতীয় চেকপয়েন্ট সক্রিয় করো।',
      'কেন্দ্রীয় চত্বরের মাঝখান থেকে পালস দিলে পাশের পথ ও কাঁটার অবস্থান একসাথে দেখা যায়।',
      'কেন্দ্রীয় চত্বরের উত্তর সিঁড়ির দুই পাশের কাঁটা এড়িয়ে মাঝখান দিয়ে হাঁটো।',
      'তিনটি রেজোন্যান্স কোরের নির্দেশনা পেতে শুরুর দিকের স্থপতির মূর্তি [F] দিয়ে পড়ো।',
      'তিনটি কোর উজ্জ্বল নীল হলে উত্তরের মহাতোরণে প্রবেশ করো।',
    ],
    4: [
      'রঙিন গ্লিফ প্যাডের ওপর দাঁড়িয়ে [E] পালস দাও যেন মিল থাকা ক্রিস্টাল দরজা খুলে যায়।',
      'মিরর ক্রিস্টালে সোনার ঢেউ আঘাত হানলে অদৃশ্য সেতু বরাবর আলোর রশ্মি ফুটে ওঠে।',
      'ভঙ্গুর পাথর পা রাখার ০.৮ সেকেন্ড পর কাঁপতে কাঁপতে ভেঙে পড়ে—থামবে না।',
      'উত্তরের কক্ষে শব্দ-সংবেদনশীল ড্রোনের কাছে [C] বা Ctrl চেপে নিঃশব্দে হাঁটো।',
      'পশ্চিমের ভঙ্গুর সেতুর পেছনে বেগুনি গোপন পাথরে একটি ইকো খণ্ড রয়েছে।',
      'মিরর গ্যালারি খুলতে কেন্দ্রীয় কক্ষের পূর্ব ধারের সায়ান গ্লিফ প্যাডে পালস দাও।',
      'পূর্ব গ্যালারির মিরর ক্রিস্টালে পালস করার পর আলোর রশ্মি থাকতে থাকতেই পার হয়ে যাও।',
      'উত্তরের কক্ষে নিঃশব্দে অ্যাম্বার গ্লিফ প্যাডে পৌঁছে তারপর পালস চালিয়ে দরজা খোলো।',
      'শেষ ভঙ্গুর সেতুতে লাফানোর আগে পূর্ব ও পশ্চিম উভয় চিমে [F] দিয়ে সাড়া দাও।',
      'ভঙ্গুর পাথরের ওপর দৌড়ে গেলে ভেঙে পড়ার আগেই সহজেই পরের ধাপে পৌঁছানো যায়।',
    ],
    5: [
      'দূরের মিরর ক্রিস্টাল ও গ্লিফে পৌঁছাতে [E] ১.৫ সেকেন্ড চেপে ধরে চার্জড পালস দাও।',
      'শব্দ-শিকারি ড্রোনের কাছে [C] বা Ctrl চেপে কুঁজো হয়ে চলো যাতে পায়ের শব্দ না যায়।',
      'নেক্সাস চত্বরের দুই পাশের সায়ান ও ভায়োলেট গ্লিফ প্যাডে দাঁড়িয়ে পালস দাও।',
      'পূর্ব ডানার লিফটের পর ডানদিকের একদম প্রান্তে একটি গোপন অ্যাম্বার খণ্ড লুকানো আছে।',
      'পশ্চিমের মিরর ক্রিস্টালে চার্জড পালস ছুড়লে পুরো পশ্চিম সেতুপথ আলোকিত হবে।',
      'ভঙ্গুর পাথরে থেমে না থেকে এগিয়ে চলো; ভেঙে যাওয়ার ৪ সেকেন্ড পর পাথর আবার ফিরে আসে।',
      'অ্যাম্বার দরজার চ্যালেঞ্জের আগে উত্তরের চেকপয়েন্টটি অবশ্যই সক্রিয় করে নাও।',
      'শব্দ-সংবেদনশীল ড্রোন খুব কাছে থাকলে পালস দেওয়া থেকে বিরত থাকো।',
      'তিনটি সিল [F] দিয়ে সক্রিয় করে এবং মিরর ক্রিস্টালের চার্জড প্রতিফলনে সাইলেন্ট ওয়ার্ডেনকে তিনবার থামাও।',
      'পালস দিয়ে সাইলেন্ট ওয়ার্ডেনকে মিরর রশ্মির পথে টেনে এনে চার্জড পালসে স্তব্ধ করো।',
    ],
  },
  zh: {
    1: [
      '在悬崖边缘轻按 [E] 发出声波，隐藏的青色石桥会显现 2.5 秒。',
      '留意前方微弱的红色余晖——即使在黑暗中它也标记着尖刺陷阱。',
      '检查主路旁侧的石阶，一枚琥珀碎片正静静藏在支路尽头。',
      '跨越较宽的隐藏跳台时，按住 [Shift] 冲刺起跳会更稳妥。',
      '若迷失方向，可在起点旁按 [F] 阅读古代守望者石像的铭文。',
      '向北推进前，记得在中庭用 [F] 激活唤醒符文基座。',
      '踏上中央庭院发光的检查点基座以保存当前进度。',
      '在中央庭院面向左侧发出声波，即可发现通往秘密区域的紫色暗桥。',
      '踏上隐形平台前，先等待回声能量恢复到 25% 以上。',
      '激活唤醒符文后，跟随正北方亮起的青色传送门光柱前进。',
    ],
    2: [
      '在用 [F] 激活西翼与东翼的两座神庙封印前，出口大门将保持封闭。',
      '蓝色移动平台按固定轨迹往返——等它靠近你的石台时再发出声波起跳。',
      '西翼平台北方藏着一条紫色秘密通道，向北扫描即可显现。',
      '注意北桥上巡逻的哨兵无人机，先在石柱后等待其红光掠过。',
      '在东翼，等待垂直升降台降到与你齐平的位置再稳步跳上。',
      '踏上最后一座移动桥梁前先发一次脉冲，看清终点石台的边缘。',
      '探索东西两翼之前，先踩亮中央大厅的检查点水晶。',
      '起跳前用鼠标将镜头对准平台正前方，能让空中落点更精准。',
      '第四枚回声碎片悬停在最后一段横向移动平台的上方。',
      '每激活一座神庙封印，北门锁芯便会永久解开一半。',
    ],
    3: [
      '哨兵无人机沿窄桥规律巡航——待其红色警戒圈远离后再动身。',
      '发出声波后立刻结合 [Shift] 冲刺跳跃，可轻松跨过较宽深渊。',
      '从中央圣殿广场分别前往东西两翼，唤醒前两座共鸣核心。',
      '西侧共鸣核心基座后方藏着一条通往秘密碎片的紫色暗径。',
      '北塔路线中，等待垂直升降梯升至与上层平台接近时再跃起。',
      '挑战北端最终巡逻桥前，请先触发北塔上方的第二个检查点。',
      '站在中央广场中心发出脉冲，能同时看清两侧路线与尖刺位置。',
      '中央广场北阶两侧有尖刺守卫，请沿着阶梯正中行进。',
      '可用 [F] 阅读入口处的“核心建筑师”石像，确认三座核心线索。',
      '三座共鸣核心全部亮起青光后，即可返回北方圣坛进入传送门。',
    ],
    4: [
      '站在彩色符文踏板上按 [E] 发出脉冲，即可开启同色共鸣晶体大门。',
      '用声波击中镜面水晶，它会自动朝前方投射持续的照明光束。',
      '碎裂石板在落脚 0.8 秒后便会剧烈晃动并坠落，切勿停留。',
      '靠近北方大厅的听觉猎杀无人机时，按住 [C] 或 Ctrl 静步潜行。',
      '西侧碎石桥后方藏有一块紫色秘密平台，上面留有回声碎片。',
      '在中央大厅东侧的青色符文踏板上发声，即可解锁镜廊通道。',
      '激活东廊镜面水晶后，趁着光束照亮暗桥迅速连续通过。',
      '到达北厅后先悄悄接近琥珀符文踏板，确认安全后再发声开门。',
      '跨过最终碎桥前，确保东西两侧的洞窟音铃都已用 [F] 激活。',
      '以冲刺节奏连续踏过碎裂石台，能在塌陷前顺畅跃至安全区。',
    ],
    5: [
      '长按 [E] 最多 1.5 秒可释放蓄力脉冲，触及远处的镜面水晶与机关。',
      '在听觉无人机附近按住 [C] 或 Ctrl 潜行，脚步将不会暴露位置。',
      '站在核心枢纽左右两侧的青色与紫色符文踏板上脉冲以解锁两翼。',
      '穿过东翼升降平台后继续向最东侧探索，可找到隐藏的秘密碎片。',
      '朝西翼镜面水晶释放蓄力脉冲，可将整条西侧暗桥一次照亮。',
      '经过碎裂平台时保持行进节奏；塌陷后约 4 秒会自动复原。',
      '通过北侧大厅前务必触发第三检查点，为最后的考验做好准备。',
      '当听觉无人机紧邻身旁时先暂缓脉冲，等它飘远再发出声波。',
      '激活全部三座深渊封印 [F]，并借由镜面光束眩晕“沉寂守卫”三次以解锁终局之门。',
      '用脉冲将沉寂守卫引到镜面光束路径上，再对着镜面水晶蓄力脉冲即可将其击晕。',
    ],
  },
};

export function selectFallbackLore(
  trigger: LoreTrigger,
  levelNumber: number,
  pulsesUsed: number,
  deaths: number,
  language: NarrationLanguage = 'en'
): string {
  const langBank = FALLBACK_LORE_BY_LANG[language] ?? FALLBACK_LORE_BY_LANG.en;
  const bank = langBank[trigger] ?? langBank.level_start;
  const idx = (levelNumber + pulsesUsed + deaths) % bank.length;
  return bank[idx];
}

export function selectFallbackHint(
  levelNumber: number,
  mechanismsActivated: number,
  mechanismsRequired: number,
  secondsStuck: number,
  language: NarrationLanguage = 'en'
): string {
  const langBank = FALLBACK_HINTS_BY_LANG[language] ?? FALLBACK_HINTS_BY_LANG.en;
  const bank = langBank[levelNumber] ?? langBank[1];
  const idx = secondsStuck < 20 ? 0 : Math.floor(secondsStuck / 12) % bank.length;
  const line = bank[idx];
  if (mechanismsRequired > 0 && mechanismsActivated < mechanismsRequired) {
    return `${line} (${mechanismsActivated}/${mechanismsRequired})`;
  }
  return line;
}

export interface RecapFallbackInput {
  levelNumber: number;
  levelName: string;
  completionTimeSeconds: number;
  pulsesUsed: number;
  deaths: number;
  fragmentsCollected: number;
  hintsUsed: number;
  medal: 'gold' | 'silver' | 'bronze' | null;
  language: NarrationLanguage;
}

export function clampWords(text: string, maxWords: number): string {
  const words = text.trim().split(/\s+/).filter(Boolean);
  if (words.length <= maxWords) return text.trim();
  return `${words.slice(0, maxWords).join(' ').replace(/[.,;:!?]+$/, '')}.`;
}

export function selectFallbackRecap(input: RecapFallbackInput): string {
  const t = Math.round(input.completionTimeSeconds);
  const medalText = input.medal ? input.medal.toUpperCase() : 'CLEAR';
  if (input.language === 'bn') {
    return `লেভেল ০${input.levelNumber} (${input.levelName}) ${t} সেকেন্ডে সম্পন্ন হয়েছে। ${input.pulsesUsed}টি ইকো পালস ও ${input.fragmentsCollected}টি খণ্ড নিয়ে অন্ধকার জয় করেছ (${medalText})।`;
  }
  if (input.language === 'zh') {
    return `你以 ${t} 秒穿越第 0${input.levelNumber} 关「${input.levelName}」，发出 ${input.pulsesUsed} 道声波并寻回 ${input.fragmentsCollected} 枚碎片，在静默深渊中刻下光痕。`;
  }
  const poise =
    input.deaths === 0
      ? 'Without a single fall, your footsteps read every hidden span.'
      : `After ${input.deaths} ${input.deaths === 1 ? 'fall' : 'falls'}, your resolve held steady through the dark.`;
  return clampWords(
    `Through ${input.levelName} in ${t}s with ${input.pulsesUsed} sonar pulses and ${input.fragmentsCollected} fragments recovered. ${poise}`,
    45
  );
}
