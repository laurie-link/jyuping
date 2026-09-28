import { commonLessons } from "./common-words"
import { commonThemes } from "./common-themes"
import { confusableLessons } from "./confusable"
import { spokenCharLessons } from "./spoken-chars"
import { word } from "../lib/reading"
import type { Lesson, Sentence } from "../lib/types"

function item(id: string, text: string, gloss: string, note?: string): Sentence {
  return { id, gloss, note, tokens: [word(text, gloss)] }
}

const soundLessons: Lesson[] = [
  {
    id: "initials",
    title: "声母",
    blurb: "十九个声母，每个配一个例字。",
    sentences: [
      item("b", "巴", "声母 b"),
      item("p", "怕", "声母 p"),
      item("m", "媽", "声母 m"),
      item("f", "花", "声母 f"),
      item("d", "打", "声母 d"),
      item("t", "他", "声母 t"),
      item("n", "那", "声母 n"),
      item("l", "啦", "声母 l"),
      item("g", "家", "声母 g"),
      item("k", "卡", "声母 k"),
      item("ng", "牙", "声母 ng", "牙的声母是 ng，不是 n。"),
      item("h", "蝦", "声母 h"),
      item("gw", "瓜", "声母 gw", "瓜的声母是 gw，不是 g。"),
      item("kw", "誇", "声母 kw", "誇的声母是 kw，不是 k。"),
      item("w", "蛙", "声母 w"),
      item("z", "渣", "声母 z"),
      item("c", "叉", "声母 c"),
      item("s", "沙", "声母 s"),
      item("j", "也", "声母 j"),
    ],
  },
  {
    id: "finals",
    title: "韵母",
    blurb: "没有鼻音、没有入声的韵母。",
    sentences: [
      item("aa", "呀", "韵母 aa"),
      item("e", "呢", "韵母 e", "单字呢是 ne1，韵母是 e。呢個是 ni1，呢度是 nei1。"),
      item("i", "衣", "韵母 i"),
      item("o", "柯", "韵母 o"),
      item("u", "烏", "韵母 u", "乌要写成 wu1，声母 w 不能省。"),
      item("oe", "靴", "韵母 oe"),
      item("yu", "於", "韵母 yu", "於要写成 jyu1，声母 j 不能省。"),
      item("aai", "街", "韵母 aai"),
      item("aau", "拗", "韵母 aau"),
      item("ai", "矮", "韵母 ai"),
      item("au", "歐", "韵母 au"),
      item("ei", "非", "韵母 ei"),
      item("oi", "哀", "韵母 oi"),
      item("ou", "澳", "韵母 ou"),
      item("eoi", "需", "韵母 eoi"),
      item("ui", "杯", "韵母 ui"),
      item("iu", "腰", "韵母 iu"),
    ],
  },
  {
    id: "nasals",
    title: "鼻音韵",
    blurb: "韵尾是 m、n、ng。短 a 和长 aa 要分开。",
    sentences: [
      item("aam", "三", "韵母 aam"),
      item("aan", "山", "韵母 aan"),
      item("aang", "生", "韵母 aang"),
      item("am", "心", "韵母 am", "心是 sam1，韵母 am。三是 saam1，韵母 aam。"),
      item("an", "新", "韵母 an"),
      item("ang", "燈", "韵母 ang"),
      item("eng", "聽", "韵母 eng", "单字听是 teng1。听日、听朝里的听是 ting1。"),
      item("im", "點", "韵母 im"),
      item("in", "先", "韵母 in"),
      item("ing", "星", "韵母 ing"),
      item("on", "安", "韵母 on"),
      item("ong", "方", "韵母 ong"),
      item("un", "碗", "韵母 un"),
      item("ung", "風", "韵母 ung"),
      item("eon", "春", "韵母 eon"),
      item("oeng", "香", "韵母 oeng"),
      item("yun", "冤", "韵母 yun"),
      item("syllabic-m", "唔", "韵母 m"),
      item("syllabic-ng", "吳", "韵母 ng"),
    ],
  },
  {
    id: "checked",
    title: "入声韵",
    blurb: "韵尾是 p、t、k。声调只有 1、3、6。",
    sentences: [
      item("aap", "鴨", "韵母 aap"),
      item("aat", "八", "韵母 aat"),
      item("aak", "百", "韵母 aak"),
      item("ap", "急", "韵母 ap"),
      item("at", "七", "韵母 at", "七是 cat1，韵母 at。八是 baat3，韵母 aat。"),
      item("ak", "北", "韵母 ak"),
      item("ek", "石", "韵母 ek"),
      item("ip", "葉", "韵母 ip"),
      item("it", "熱", "韵母 it"),
      item("ik", "色", "韵母 ik"),
      item("ot", "渴", "韵母 ot"),
      item("ok", "學", "韵母 ok"),
      item("ut", "活", "韵母 ut"),
      item("uk", "屋", "韵母 uk"),
      item("eot", "出", "韵母 eot"),
      item("oek", "腳", "韵母 oek"),
      item("yut", "月", "韵母 yut"),
    ],
  },
  {
    id: "tones",
    title: "声调",
    blurb: "诗史试时市是，同一组声母韵母，靠末尾的数字分开。",
    sentences: [
      item("si1", "詩", "诗"),
      item("si2", "史", "史"),
      item("si3", "試", "试"),
      item("si4", "時", "时"),
      item("si5", "市", "市"),
      item("si6", "是", "是"),
    ],
  },
]

const starterLessons: Lesson[] = [
  {
    id: "hello",
    title: "打招呼",
    blurb: "见面第一句。先拆开，再拼回整句。",
    sentences: [
      {
        id: "nei-hou",
        gloss: "你好",
        tokens: [word("你", "你"), word("好", "好")],
      },
      {
        id: "zou-san",
        gloss: "早上好",
        note: "早晨只用在早上。",
        tokens: [word("早晨", "早上好")],
      },
      {
        id: "m-goi",
        gloss: "劳驾，谢谢",
        note: "麻烦别人、让路、道谢服务，用唔该。",
        tokens: [word("唔該", "劳驾，谢谢")],
      },
      {
        id: "do-ze",
        gloss: "谢谢",
        note: "收礼物、谢人帮忙，用多谢。",
        tokens: [word("多謝", "谢谢")],
      },
      {
        id: "zoi-gin",
        gloss: "再见",
        tokens: [word("再見", "再见")],
      },
    ],
  },
  {
    id: "who",
    title: "你同我",
    blurb: "把「我是学生」从一个字长成一句。",
    sentences: [
      { id: "ngo", gloss: "我", tokens: [word("我", "我")] },
      { id: "nei", gloss: "你", tokens: [word("你", "你")] },
      {
        id: "ngo-hai",
        gloss: "我是",
        tokens: [word("我", "我"), word("係", "是")],
      },
      { id: "hok-saang", gloss: "学生", tokens: [word("學生", "学生")] },
      {
        id: "ngo-hai-hok",
        gloss: "我是学生",
        tokens: [word("我", "我"), word("係", "是"), word("學生", "学生")],
      },
    ],
  },
  {
    id: "eat",
    title: "食同饮",
    blurb: "吃饭、喝茶，和一句完整的「我想喝茶」。",
    sentences: [
      { id: "sik-faan", gloss: "吃饭", tokens: [word("食飯", "吃饭")] },
      { id: "jam-caa", gloss: "喝茶", tokens: [word("飲茶", "喝茶")] },
      {
        id: "ngo-soeng",
        gloss: "我想",
        tokens: [word("我", "我"), word("想", "想")],
      },
      {
        id: "ngo-soeng-jam",
        gloss: "我想喝茶",
        tokens: [word("我", "我"), word("想", "想"), word("飲茶", "喝茶")],
      },
      { id: "hou-mei", gloss: "好吃", tokens: [word("好味", "好吃")] },
    ],
  },
  {
    id: "ask",
    title: "问一句",
    blurb: "是不是、多少钱、为什么、我不知道。",
    sentences: [
      {
        id: "hai-mai",
        gloss: "是不是",
        note: "係咪是「是不是」的口语缩法。",
        tokens: [word("係咪", "是不是")],
      },
      { id: "gei-do", gloss: "多少", tokens: [word("幾多", "多少")] },
      {
        id: "gei-do-cin",
        gloss: "多少钱",
        note: "词典首选是变调 cin2，本调 cin4 排在后面。练习跟词典首选。",
        tokens: [word("幾多", "多少"), word("錢", "钱")],
      },
      { id: "dim-gaai", gloss: "为什么", tokens: [word("點解", "为什么")] },
      {
        id: "ngo-m-zi",
        gloss: "我不知道",
        tokens: [word("我", "我"), word("唔知", "不知道")],
      },
    ],
  },
  {
    id: "market",
    title: "买嘢",
    blurb: "这个、那个、不用、挺好、没问题。",
    sentences: [
      {
        id: "ni-go",
        gloss: "这个",
        note: "按词查是 ni1 go3。单字「呢」的默认音是 ne1，所以这里整词去查。",
        tokens: [word("呢個", "这个")],
      },
      { id: "go-go", gloss: "那个", tokens: [word("嗰個", "那个")] },
      { id: "m-sai", gloss: "不用", tokens: [word("唔使", "不用")] },
      { id: "gei-hou", gloss: "挺好", tokens: [word("幾好", "挺好")] },
      {
        id: "mou-man-tai",
        gloss: "没问题",
        tokens: [word("冇", "没有"), word("問題", "问题")],
      },
    ],
  },
  {
    id: "when",
    title: "今日听日",
    blurb: "今天、明天、现在、一会儿、晚点。",
    sentences: [
      { id: "gam-jat", gloss: "今天", tokens: [word("今日", "今天")] },
      {
        id: "ting-jat",
        gloss: "明天",
        note: "按词查是 ting1 jat6。单字「聽」的默认音是 teng1。",
        tokens: [word("聽日", "明天")],
      },
      { id: "ji-gaa", gloss: "现在", tokens: [word("而家", "现在")] },
      { id: "jat-zan", gloss: "一会儿", tokens: [word("一陣", "一会儿")] },
      { id: "ci-di", gloss: "晚点", tokens: [word("遲啲", "晚点")] },
    ],
  },
  {
    id: "who-else",
    title: "边个",
    blurb: "他、我们、你们、朋友，再拼成一句。",
    sentences: [
      { id: "keoi", gloss: "他", tokens: [word("佢", "他")] },
      { id: "ngo-dei", gloss: "我们", tokens: [word("我哋", "我们")] },
      { id: "nei-dei", gloss: "你们", tokens: [word("你哋", "你们")] },
      { id: "pang-jau", gloss: "朋友", tokens: [word("朋友", "朋友")] },
      {
        id: "keoi-hai-pang-jau",
        gloss: "他是我朋友",
        tokens: [
          word("佢", "他"),
          word("係", "是"),
          word("我", "我"),
          word("朋友", "朋友"),
        ],
      },
    ],
  },
  {
    id: "where",
    title: "边度",
    blurb: "这里、那里、哪里、家，再到我回家。",
    sentences: [
      {
        id: "nei-dou",
        gloss: "这里",
        note: "呢度是 nei1 dou6。前面「呢個」是 ni1 go3，两个词不一样。",
        tokens: [word("呢度", "这里")],
      },
      { id: "go-dou", gloss: "那里", tokens: [word("嗰度", "那里")] },
      { id: "bin-dou", gloss: "哪里", tokens: [word("邊度", "哪里")] },
      { id: "uk-kei", gloss: "家", tokens: [word("屋企", "家")] },
      {
        id: "ngo-faan-uk",
        gloss: "我回家",
        note: "返屋企里的返是 faan1。单字「返」的默认音是 faan2。",
        tokens: [word("我", "我"), word("返屋企", "回家")],
      },
    ],
  },
  {
    id: "eat-what",
    title: "食咩",
    blurb: "水、奶茶、面、早餐，再到我想吃面。",
    sentences: [
      { id: "seoi", gloss: "水", tokens: [word("水", "水")] },
      { id: "naai-caa", gloss: "奶茶", tokens: [word("奶茶", "奶茶")] },
      { id: "min", gloss: "面", tokens: [word("麵", "面")] },
      { id: "zou-caan", gloss: "早餐", tokens: [word("早餐", "早餐")] },
      {
        id: "ngo-soeng-sik-min",
        gloss: "我想吃面",
        tokens: [word("我", "我"), word("想", "想"), word("食麵", "吃面")],
      },
    ],
  },
  {
    id: "price",
    title: "买几多",
    blurb: "买、贵、便宜、零钱，再到这个多少钱。",
    sentences: [
      { id: "maai", gloss: "买", tokens: [word("買", "买")] },
      { id: "gwai", gloss: "贵", tokens: [word("貴", "贵")] },
      {
        id: "peng",
        gloss: "便宜",
        note: "便宜的首选是 peng4。平坦、水平的平是 ping4。",
        tokens: [word("平", "便宜")],
      },
      { id: "saan-zi", gloss: "零钱", tokens: [word("散紙", "零钱")] },
      {
        id: "ni-go-gei-do-cin",
        gloss: "这个多少钱",
        note: "钱仍是变调 cin2。",
        tokens: [word("呢個", "这个"), word("幾多", "多少"), word("錢", "钱")],
      },
    ],
  },
  {
    id: "numbers",
    title: "数字",
    blurb: "从一数到十，再到二十、一百。",
    sentences: [
      { id: "jat", gloss: "一", tokens: [word("一", "一")] },
      { id: "ji", gloss: "二", tokens: [word("二", "二")] },
      { id: "saam", gloss: "三", tokens: [word("三", "三")] },
      {
        id: "sei",
        gloss: "四",
        note: "四的首选是 sei3。si3 是试。",
        tokens: [word("四", "四")],
      },
      { id: "ng", gloss: "五", tokens: [word("五", "五")] },
      { id: "luk", gloss: "六", tokens: [word("六", "六")] },
      { id: "cat", gloss: "七", tokens: [word("七", "七")] },
      { id: "baat", gloss: "八", tokens: [word("八", "八")] },
      { id: "gau", gloss: "九", tokens: [word("九", "九")] },
      { id: "sap", gloss: "十", tokens: [word("十", "十")] },
      { id: "ji-sap", gloss: "二十", tokens: [word("二十", "二十")] },
      { id: "jat-baak", gloss: "一百", tokens: [word("一百", "一百")] },
    ],
  },
  {
    id: "clock",
    title: "几点",
    blurb: "昨天、明早、下午、点钟，再到现在三点。",
    sentences: [
      { id: "kam-jat", gloss: "昨天", tokens: [word("琴日", "昨天")] },
      {
        id: "ting-ziu",
        gloss: "明早",
        note: "听朝的听是 ting1，和听日一样。单字听的默认音是 teng1。",
        tokens: [word("聽朝", "明早")],
      },
      { id: "haa-zau", gloss: "下午", tokens: [word("下晝", "下午")] },
      { id: "dim-zung", gloss: "点钟", tokens: [word("點鐘", "点钟")] },
      {
        id: "ji-gaa-saam-dim",
        gloss: "现在三点",
        tokens: [word("而家", "现在"), word("三點", "三点")],
      },
    ],
  },
  {
    id: "feel",
    title: "感觉",
    blurb: "开心、累、冷、热、头痛。",
    sentences: [
      { id: "hoi-sam", gloss: "开心", tokens: [word("開心", "开心")] },
      { id: "gui", gloss: "累", tokens: [word("攰", "累")] },
      { id: "dung", gloss: "冷", tokens: [word("凍", "冷")] },
      { id: "jit", gloss: "热", tokens: [word("熱", "热")] },
      { id: "tau-tung", gloss: "头痛", tokens: [word("頭痛", "头痛")] },
    ],
  },
  {
    id: "polite",
    title: "讲礼貌",
    blurb: "不好意思、对不起、可不可以、行不行。",
    sentences: [
      { id: "m-hou-ji-si", gloss: "不好意思", tokens: [word("唔好意思", "不好意思")] },
      { id: "deoi-m-zyu", gloss: "对不起", tokens: [word("對唔住", "对不起")] },
      { id: "ho-m-ho-ji", gloss: "可不可以", tokens: [word("可唔可以", "可不可以")] },
      { id: "dak-m-dak", gloss: "行不行", tokens: [word("得唔得", "行不行")] },
    ],
  },
]

export const sections: Array<{ id: string; title: string; blurb: string; lessons: Lesson[] }> = [
  {
    id: "sound",
    title: "声母韵母声调",
    blurb: "先把声母、韵母和声调练熟。",
    lessons: soundLessons,
  },
  {
    id: "starter",
    title: "入门必学",
    blurb: "见面、吃饭、问路这些日常说法。",
    lessons: starterLessons,
  },
  {
    id: "spoken",
    title: "粤语口语常用字",
    blurb: "说话里最常见的单字，按用法分成小课。",
    lessons: spokenCharLessons,
  },
  {
    id: "common",
    title: "常用三千词",
    blurb: "按出现次数排，也可以按题目再看。",
    lessons: commonLessons,
  },
  {
    id: "confusable",
    title: "易混读音",
    blurb: "容易写错的几组读音，一组一组对着打。",
    lessons: confusableLessons,
  },
]

export const lessons: Lesson[] = sections.flatMap((section) =>
  section.id === "common"
    ? [...section.lessons, ...commonThemes.flatMap((theme) => theme.lessons)]
    : section.lessons,
)

export function getLesson(id: string): Lesson | undefined {
  return lessons.find((lesson) => lesson.id === id)
}

export function nextLessonId(id: string): string | undefined {
  const index = lessons.findIndex((lesson) => lesson.id === id)
  if (index < 0) return undefined
  return lessons[index + 1]?.id
}
