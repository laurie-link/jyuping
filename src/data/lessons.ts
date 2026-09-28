import { word } from "../lib/reading"
import type { Lesson } from "../lib/types"

export const lessons: Lesson[] = [
  {
    id: "tones",
    title: "六个声调",
    blurb: "同一组声母韵母，靠末尾的数字把声调分开。",
    sentences: [
      { id: "si1", gloss: "诗", tokens: [word("詩", "诗")] },
      { id: "si2", gloss: "史", tokens: [word("史", "史")] },
      { id: "si3", gloss: "试", tokens: [word("試", "试")] },
      { id: "si4", gloss: "时", tokens: [word("時", "时")] },
      { id: "si5", gloss: "市", tokens: [word("市", "市")] },
      { id: "si6", gloss: "是", tokens: [word("是", "是")] },
    ],
  },
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

export function getLesson(id: string): Lesson | undefined {
  return lessons.find((lesson) => lesson.id === id)
}

export function nextLessonId(id: string): string | undefined {
  const index = lessons.findIndex((lesson) => lesson.id === id)
  if (index < 0) return undefined
  return lessons[index + 1]?.id
}
