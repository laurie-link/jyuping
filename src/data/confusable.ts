import { word } from "../lib/reading"
import type { Lesson, Sentence } from "../lib/types"

function item(id: string, text: string, gloss: string, note?: string): Sentence {
  return { id, gloss, note, tokens: [word(text, gloss)] }
}

/** Pairs that are easy to mix up. Notes sit on the later item, after the answer. */
export const confusableLessons: Lesson[] = [
  {
    id: "mix-ne",
    title: "呢",
    blurb: "语气词、这个、这里，三个呢不一样。",
    sentences: [
      item("ne", "呢", "语气词"),
      item("ni", "呢個", "这个", "单独的呢是 ne1。呢個里的呢是 ni1。"),
      item("nei", "呢度", "这里", "呢度的呢是 nei1，和呢個的 ni1 不同。"),
    ],
  },
  {
    id: "mix-faan",
    title: "返和企",
    blurb: "单独一个字，和放进返屋企、屋企里。",
    sentences: [
      item("faan", "返", "回来"),
      item("faan-uk", "返屋企", "回家", "单独的返是 faan2。返屋企的返是 faan1。"),
      item("kei", "企", "站"),
      item("uk-kei", "屋企", "家", "单独的企是 kei5。屋企的企是 kei2。"),
    ],
  },
  {
    id: "mix-ping",
    title: "平和上",
    blurb: "便宜和平坦，上面和上去，还有想。",
    sentences: [
      item("peng", "平", "便宜"),
      item("ping", "平坦", "平坦", "便宜的平是 peng4。平坦的平是 ping4。"),
      item("soeng6", "上", "上面"),
      item("soeng5", "上去", "上去", "上面的上是 soeng6。上去的上是 soeng5。"),
      item("soeng2", "想", "想", "想是 soeng2，和上的 soeng6、soeng5 不同。"),
    ],
  },
  {
    id: "mix-ting",
    title: "听和钱",
    blurb: "听这个动作，和听日、听朝，还有钱。",
    sentences: [
      item("teng", "聽", "听"),
      item("ting-jat", "聽日", "明天", "听这个动作是 teng1。听日的听是 ting1。"),
      item("ting-ziu", "聽朝", "明早", "听朝的听也是 ting1。"),
      item("cin2", "錢", "钱"),
      item("cin4", "金錢", "金钱", "钱单独说，口语首选 cin2。金钱里的钱是 cin4。"),
    ],
  },
  {
    id: "mix-maai",
    title: "买和嗰",
    blurb: "买和卖，个和嗰，咁和噉。",
    sentences: [
      item("maai5", "買", "买"),
      item("maai6", "賣", "卖", "买是 maai5，卖是 maai6。"),
      item("go3", "個", "个"),
      item("go2", "嗰", "那", "个是 go3，嗰是 go2。"),
      item("gam3", "咁", "这么"),
      item("gam2", "噉", "这样", "咁是 gam3，噉是 gam2。"),
    ],
  },
  {
    id: "mix-hai",
    title: "喺和都",
    blurb: "在和是，都、到、度。",
    sentences: [
      item("hai2", "喺", "在"),
      item("hai6", "係", "是", "在是 hai2，是是 hai6。"),
      item("dou1", "都", "都"),
      item("dou3", "到", "到", "都是 dou1，到是 dou3。"),
      item("dou6", "度", "那儿", "度是 dou6，和到的 dou3 不同。"),
    ],
  },
  {
    id: "mix-sik",
    title: "食和过",
    blurb: "吃和识，先和线，过和果。",
    sentences: [
      item("sik6", "食", "吃"),
      item("sik1", "識", "认识", "吃是 sik6，识是 sik1。"),
      item("sin1", "先", "先"),
      item("sin3", "線", "线", "先是 sin1，线是 sin3。"),
      item("gwo3", "過", "过"),
      item("gwo2", "果", "果", "过是 gwo3，果是 gwo2。"),
    ],
  },
  {
    id: "mix-sei",
    title: "四和我",
    blurb: "四不是 si，我和饿差一个声调。",
    sentences: [
      item("sei", "四", "四", "四是 sei3，不是 si3。"),
      item("si4", "時", "时"),
      item("si3", "試", "试", "时是 si4，试是 si3。韵母是 i，四的韵母是 ei。"),
      item("ngo5", "我", "我"),
      item("ngo6", "餓", "饿", "我是 ngo5，饿是 ngo6。"),
    ],
  },
  {
    id: "mix-nei",
    title: "你和几",
    blurb: "n 和 l，还有几和机。",
    sentences: [
      item("nei5", "你", "你"),
      item("lei5", "李", "李", "你是 nei5，李是 lei5。声母 n 和 l 要分开。"),
      item("naam", "男", "男"),
      item("laam", "藍", "蓝", "男是 naam4，蓝是 laam4。"),
      item("gei2", "幾", "几"),
      item("gei1", "機", "机", "几是 gei2，机是 gei1。"),
    ],
  },
  {
    id: "mix-hoi",
    title: "开和行",
    blurb: "开和海，长和张，行路和银行。",
    sentences: [
      item("hoi1", "開", "打开"),
      item("hoi2", "海", "海", "开是 hoi1，海是 hoi2。"),
      item("coeng", "長", "长"),
      item("zoeng", "張", "张", "长是 coeng4，张是 zoeng1。"),
      item("haang", "行", "走"),
      item("hong", "銀行", "银行", "走的行是 haang4。银行的行是 hong4。"),
    ],
  },
  {
    id: "mix-zung",
    title: "钟和仲",
    blurb: "钟、还，和钟意。",
    sentences: [
      item("zung1", "鐘", "钟"),
      item("zung6", "仲", "还", "钟是 zung1，还是 zung6。"),
      item("zung-ji", "鍾意", "喜欢", "钟意的钟也是 zung1。"),
    ],
  },
]
