import type { Lesson, Token } from "../lib/types"

function word(text: string, jyutping: string, gloss: string): Token {
  const syllables = jyutping.split(/\s+/)
  const chars = Array.from(text)
  if (chars.length !== syllables.length) {
    throw new Error(`「${text}」字数和粤拼对不上：${jyutping}`)
  }
  return {
    gloss,
    parts: chars.map((char, index) => ({ char, jyutping: syllables[index] })),
  }
}

export const lessons: Lesson[] = [
  {
    id: "tones",
    title: "六个声调",
    blurb: "同一组声母韵母，靠末尾的数字把声调分开。",
    sentences: [
      { id: "si1", gloss: "诗", tokens: [word("詩", "si1", "诗")] },
      { id: "si2", gloss: "史", tokens: [word("史", "si2", "史")] },
      { id: "si3", gloss: "试", tokens: [word("試", "si3", "试")] },
      { id: "si4", gloss: "时", tokens: [word("時", "si4", "时")] },
      { id: "si5", gloss: "市", tokens: [word("市", "si5", "市")] },
      { id: "si6", gloss: "是", tokens: [word("是", "si6", "是")] },
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
        tokens: [word("你", "nei5", "你"), word("好", "hou2", "好")],
      },
      {
        id: "zou-san",
        gloss: "早上好",
        note: "早晨只用在早上。",
        tokens: [word("早晨", "zou2 san4", "早上好")],
      },
      {
        id: "m-goi",
        gloss: "劳驾，谢谢",
        note: "麻烦别人、让路、道谢服务，用唔该。",
        tokens: [word("唔該", "m4 goi1", "劳驾，谢谢")],
      },
      {
        id: "do-ze",
        gloss: "谢谢",
        note: "收礼物、谢人帮忙，用多谢。",
        tokens: [word("多謝", "do1 ze6", "谢谢")],
      },
      {
        id: "zoi-gin",
        gloss: "再见",
        tokens: [word("再見", "zoi3 gin3", "再见")],
      },
    ],
  },
  {
    id: "who",
    title: "你同我",
    blurb: "把「我是学生」从一个字长成一句。",
    sentences: [
      { id: "ngo", gloss: "我", tokens: [word("我", "ngo5", "我")] },
      { id: "nei", gloss: "你", tokens: [word("你", "nei5", "你")] },
      {
        id: "ngo-hai",
        gloss: "我是",
        tokens: [word("我", "ngo5", "我"), word("係", "hai6", "是")],
      },
      { id: "hok-saang", gloss: "学生", tokens: [word("學生", "hok6 saang1", "学生")] },
      {
        id: "ngo-hai-hok",
        gloss: "我是学生",
        tokens: [
          word("我", "ngo5", "我"),
          word("係", "hai6", "是"),
          word("學生", "hok6 saang1", "学生"),
        ],
      },
    ],
  },
  {
    id: "eat",
    title: "食同饮",
    blurb: "吃饭、喝茶，和一句完整的「我想喝茶」。",
    sentences: [
      { id: "sik-faan", gloss: "吃饭", tokens: [word("食飯", "sik6 faan6", "吃饭")] },
      { id: "jam-caa", gloss: "喝茶", tokens: [word("飲茶", "jam2 caa4", "喝茶")] },
      {
        id: "ngo-soeng",
        gloss: "我想",
        tokens: [word("我", "ngo5", "我"), word("想", "soeng2", "想")],
      },
      {
        id: "ngo-soeng-jam",
        gloss: "我想喝茶",
        tokens: [
          word("我", "ngo5", "我"),
          word("想", "soeng2", "想"),
          word("飲茶", "jam2 caa4", "喝茶"),
        ],
      },
      { id: "hou-mei", gloss: "好吃", tokens: [word("好味", "hou2 mei6", "好吃")] },
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
        tokens: [word("係咪", "hai6 mai6", "是不是")],
      },
      { id: "gei-do", gloss: "多少", tokens: [word("幾多", "gei2 do1", "多少")] },
      {
        id: "gei-do-cin",
        gloss: "多少钱",
        note: "钱的本调是 cin4，口语里常变调成 cin2。",
        tokens: [word("幾多", "gei2 do1", "多少"), word("錢", "cin2", "钱")],
      },
      { id: "dim-gaai", gloss: "为什么", tokens: [word("點解", "dim2 gaai2", "为什么")] },
      {
        id: "ngo-m-zi",
        gloss: "我不知道",
        tokens: [word("我", "ngo5", "我"), word("唔知", "m4 zi1", "不知道")],
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
        note: "呢也有人读 lei1。这里记 ni1。",
        tokens: [word("呢個", "ni1 go3", "这个")],
      },
      { id: "go-go", gloss: "那个", tokens: [word("嗰個", "go2 go3", "那个")] },
      { id: "m-sai", gloss: "不用", tokens: [word("唔使", "m4 sai2", "不用")] },
      { id: "gei-hou", gloss: "挺好", tokens: [word("幾好", "gei2 hou2", "挺好")] },
      {
        id: "mou-man-tai",
        gloss: "没问题",
        tokens: [word("冇", "mou5", "没有"), word("問題", "man6 tai4", "问题")],
      },
    ],
  },
  {
    id: "when",
    title: "今日听日",
    blurb: "今天、明天、现在、一会儿、晚点。",
    sentences: [
      { id: "gam-jat", gloss: "今天", tokens: [word("今日", "gam1 jat6", "今天")] },
      { id: "ting-jat", gloss: "明天", tokens: [word("聽日", "ting1 jat6", "明天")] },
      { id: "ji-gaa", gloss: "现在", tokens: [word("而家", "ji4 gaa1", "现在")] },
      { id: "jat-zan", gloss: "一会儿", tokens: [word("一陣", "jat1 zan6", "一会儿")] },
      { id: "ci-di", gloss: "晚点", tokens: [word("遲啲", "ci4 di1", "晚点")] },
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
