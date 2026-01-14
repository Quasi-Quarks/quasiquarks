const logic = [
  [
    ["The reason I want to go is that it's warm", "行きたい理由は暖かいからです", "ikitai riyuu wa atatakai kara desu"],
    ["The reason I like apples is that they are tasty", "リンゴが好きな理由は美味しいからです", "ringo ga suki na riyuu wa oishii kara desu"]
  ],

  [
    ["I want to eat chicken because I like it", "好きだからチキンを食べたいです", "suki dakara chikin o tabetai desu"],
    ["I want to drink tea because I enjoy it", "好きだからお茶を飲みたいです", "suki dakara ocha o nomitai desu"]
  ],

  [
    ["Are you talking about the rain?", "雨のことを話していますか", "ame no koto o hanashite imasu ka"],
    ["Are you talking about school?", "学校のことを話していますか", "gakkou no koto o hanashite imasu ka"]
  ],

  [
    ["I think I forgot", "忘れたと思います", "wasureta to omoimasu"],
    ["I think I remember", "思い出したと思います", "omoidashita to omoimasu"]
  ],

  [
    ["It makes sense to learn", "学ぶのは理にかなっています", "manabu no wa ri ni kanatte imasu"],
    ["It makes sense to rest", "休むのは理にかなっています", "yasumu no wa ri ni kanatte imasu"]
  ],

  [
    ["I found that rice is good for you", "ご飯は体に良いと分かりました", "gohan wa karada ni yoi to wakarimashita"],
    ["I found that sleep is important", "睡眠が大切だと分かりました", "suimin ga taisetsu da to wakarimashita"]
  ],

  [
    ["I understand the difference between right and wrong", "正しいことと間違いの違いが分かります", "tadashii koto to machigai no chigai ga wakarimasu"],
    ["I understand the difference between work and rest", "仕事と休みの違いが分かります", "shigoto to yasumi no chigai ga wakarimasu"]
  ],

  [
    ["I remember when I went to school", "学校に行った時のことを覚えています", "gakkou ni itta toki no koto o oboete imasu"],
    ["I remember when we met", "会った時のことを覚えています", "atta toki no koto o oboete imasu"]
  ],

  [
    ["He knows that the chicken is red", "彼はチキンが赤いことを知っています", "kare wa chikin ga akai koto o shitte imasu"],
    ["She knows that the shop is closed", "彼女は店が閉まっていることを知っています", "kanojo wa mise ga shimatte iru koto o shitte imasu"]
  ],

  [
    ["It is a fact that reading books is good for you", "本を読むことは体に良いという事実です", "hon o yomu koto wa karada ni yoi to iu jijitsu desu"],
    ["It is a fact that exercise is important", "運動が大切なのは事実です", "undou ga taisetsu na no wa jijitsu desu"]
  ],

  [
    ["You know that apples are red", "リンゴが赤いことを知っています", "ringo ga akai koto o shitte imasu"],
    ["You know that water is necessary", "水が必要なことを知っています", "mizu ga hitsuyou na koto o shitte imasu"]
  ],

  [
    ["It is true that apples are red", "リンゴが赤いのは事実です", "ringo ga akai no wa jijitsu desu"],
    ["It is true that practice helps", "練習が役立つのは事実です", "renshuu ga yakudatsu no wa jijitsu desu"]
  ],

  [
    ["If you study, you will pass", "勉強すれば合格します", "benkyou sureba goukaku shimasu"],
    ["If you work hard, you will succeed", "一生懸命働けば成功します", "isshoukenmei hatarakeba seikou shimasu"]
  ],

  [
    ["I don’t mind going to university", "大学に行くのは気にしません", "daigaku ni iku no wa ki ni shimasen"],
    ["I don’t mind waiting", "待つのは気にしません", "matsu no wa ki ni shimasen"]
  ],

  [
    ["Why don’t you eat rice?", "なぜご飯を食べないのですか", "naze gohan o tabenai no desu ka"],
    ["Why don’t you try?", "なぜ試さないのですか", "naze tamesanai no desu ka"]
  ],

  [
    ["If we change from playing to studying, it will be better", "遊びから勉強に変えれば良くなります", "asobi kara benkyou ni kaereba yoku narimasu"],
    ["If we rest now, it will be better", "今休めば良くなります", "ima yasumeba yoku narimasu"]
  ],

  [
    ["I would like to prioritise studying over watching", "見ることより勉強を優先したいです", "miru koto yori benkyou o yuusen shitai desu"],
    ["I want to prioritise health over comfort", "快適さより健康を優先したいです", "kaitekisa yori kenkou o yuusen shitai desu"]
  ],

  [
    ["In my opinion, the sky is green", "私の意見では空は緑です", "watashi no iken de wa sora wa midori desu"],
    ["In my opinion, this plan is better", "私の意見ではこの計画の方が良いです", "watashi no iken de wa kono keikaku no hou ga yoi desu"]
  ],

  [
    ["It was based on the event that I got the job", "仕事を得た出来事に基づいていました", "shigoto o eta dekigoto ni motozuite imashita"],
    ["The decision was based on facts", "その決定は事実に基づいていました", "sono kettei wa jijitsu ni motozuite imashita"]
  ],

  [
    ["If it does not have it, it will not work", "それがなければ動きません", "sore ga nakereba ugokimasen"],
    ["Without water, it will not grow", "水がなければ成長しません", "mizu ga nakereba seichou shimasen"]
  ],

  [
    ["When you eat apples, it is good for you", "リンゴを食べると体に良いです", "ringo o taberu to karada ni yoi desu"],
    ["When you sleep well, you feel better", "よく眠ると気分が良くなります", "yoku nemuru to kibun ga yoku narimasu"]
  ],

  [
    ["It is productive to eat apples", "リンゴを食べるのは生産的です", "ringo o taberu no wa seisan teki desu"],
    ["It is productive to plan ahead", "計画するのは生産的です", "keikaku suru no wa seisan teki desu"]
  ],

  [
    ["I believe so", "そう思います", "sou omoimasu"],
    ["I believe it will work", "うまくいくと思います", "umaku iku to omoimasu"]
  ],

  [
    ["I believe it is true", "それは本当だと思います", "sore wa hontou da to omoimasu"],
    ["I believe this is important", "これは重要だと思います", "kore wa juuyou da to omoimasu"]
  ]
];


const time = [
  [["I am going there tomorrow", "明日そこに行きます", "ashita soko ni ikimasu"]],
  [["Yesterday I ate chicken", "昨日チキンを食べました", "kinou chikin o tabemashita"]],
  [["Tomorrow is Monday and it will be rainy", "明日は月曜日で雨です", "ashita wa getsuyoubi de ame desu"]],
  [["Later I will play", "後で遊びます", "ato de asobimasu"]],
  [["Later I will learn", "後で勉強します", "ato de benkyou shimasu"]],
  [["Later I will eat rice", "後でご飯を食べます", "ato de gohan o tabemasu"]]
];

const communication = [
  [["I told them that I went to school", "学校に行ったと彼らに言いました", "gakkou ni itta to karera ni iimashita"]],
  [["It describes the situation as useful", "その状況は役に立つと説明しています", "sono joukyou wa yaku ni tatsu to setsumei shite imasu"]],
  [["There could be a shop there", "そこに店があるかもしれません", "soko ni mise ga aru kamo shiremasen"]],
  [["It was accurate to go to school", "学校に行くのは正しい判断でした", "gakkou ni iku no wa tadashii handan deshita"]],
  [["In my opinion, it is right to eat rice", "私の意見ではご飯を食べるのは正しいです", "watashi no iken de wa gohan o taberu no wa tadashii desu"]],
  [["He eliminated all faults", "彼はすべての欠点を取り除きました", "kare wa subete no ketten o torino kimashita"]],
  [["Listen, I like to eat chicken and study", "聞いてください、私はチキンを食べて勉強するのが好きです", "kiite kudasai, watashi wa chikin o tabete benkyou suru no ga suki desu"]],
  [["I took the position that rice is good for you", "ご飯は体に良いという立場を取りました", "gohan wa karada ni yoi to iu tachiba o torimashita"]],
  [["I have to play in the park", "公園で遊ばなければなりません", "kouen de asobanakereba narimasen"]],
  [["Drive faster", "もっと速く運転して", "motto hayaku unten shite"]]
];

const action = [
  [["He is currently playing in the park", "彼は今公園で遊んでいます", "kare wa ima kouen de asonde imasu"]]
];

const description = [
  [["It was quick", "それは速かったです", "sore wa hayakatta desu"]],
  [["It was beautiful", "それは美しかったです", "sore wa utsukushikatta desu"]]
];

const makeUseful = [
  [["I made the cake", "ケーキを作りました", "keeki o tsukurimashita"]],
  [["I did my homework", "宿題をしました", "shukudai o shimashita"]],
  [["I tried to eat rice", "ご飯を食べようとしました", "gohan o tabeyou to shimashita"]],
  [["It is useful to eat rice", "ご飯を食べるのは役に立ちます", "gohan o taberu no wa yaku ni tachimasu"]]
];

const place = [
  [["He came from the school", "彼は学校から来ました", "kare wa gakkou kara kimashita"]],
  [["He arrived at school", "彼は学校に到着しました", "kare wa gakkou ni touchaku shimashita"]],
  [["He went to school", "彼は学校に行きました", "kare wa gakkou ni ikimashita"]]
];

const shape = [
  [["He took the form of fighting", "彼は戦う形を取りました", "kare wa tatakau katachi o torimashita"]]
];

const connection = [
  [["It is connected to winning and studying", "それは勝つことと勉強に関係しています", "sore wa katsu koto to benkyou ni kankei shite imasu"]],
  [["Go back to the university", "大学に戻ってください", "daigaku ni modotte kudasai"]],
  [["Think ahead that eating rice is useful", "ご飯を食べることが役立つと考えてください", "gohan o taberu koto ga yakudatsu to kangaete kudasai"]],
  [["He switched the fire on", "彼は火をつけました", "kare wa hi o tsukemashita"]],
  [["They landed at the restaurant", "彼らはレストランに着きました", "karera wa resutoran ni tsukimashita"]],
  [["I will come back to you", "また戻ってきます", "mata modotte kimasu"]],
  [["You need to follow the master", "師匠に従う必要があります", "shishou ni shitagau hitsuyou ga arimasu"]],
  [["I applied the idea that studying skills is good for you", "技術を学ぶことが良いという考えを適用しました", "gijutsu o manabu koto ga yoi to iu kangae o tekiyou shimashita"]],
  [["There is not much going on", "あまり何も起きていません", "amari nani mo okite imasen"]],
  [["There are many cars on the road", "道路に多くの車があります", "douro ni ooku no kuruma ga arimasu"]],
  [["There are many students studying at school", "学校で多くの学生が勉強しています", "gakkou de ooku no gakusei ga benkyou shite imasu"]]
];

const environment = [
  [["It was raining", "雨が降っていました", "ame ga futte imashita"]],
  [["It was sunny", "晴れていました", "harete imashita"]]
];

const environment2 = [
  [["The object was in that place", "その物はその場所にありました", "sono mono wa sono basho ni arimashita"]]
];

const control = [
  [["He controlled the computer", "彼はコンピューターを操作しました", "kare wa konpyuutaa o sousa shimashita"]],
  [["He controlled the situation", "彼は状況をコントロールしました", "kare wa joukyou o kontorooru shimashita"]]
];

const running = [
  [["He worshipped God", "彼は神を崇拝しました", "kare wa kami o suuhai shimashita"]],
  [["He ate from the store", "彼は店の食べ物を食べました", "kare wa mise no tabemono o tabemashita"]]
];

const passTookHave = [
  [["I passed the ball to him", "彼にボールを渡しました", "kare ni booru o watashimashita"]],
  [["I took the rice from him", "彼からご飯を取りました", "kare kara gohan o torimashita"]],
  [["I have rice", "ご飯を持っています", "gohan o motte imasu"]],
  [["I own rice", "ご飯を所有しています", "gohan o shoyuu shite imasu"]],
  [["I own a car", "車を所有しています", "kuruma o shoyuu shite imasu"]],
  [["You need to eat healthy to study", "勉強するために健康的に食べる必要があります", "benkyou suru tame ni kenkouteki ni taberu hitsuyou ga arimasu"]]
];

const comparison = [
  [["I have rice but I do not have chicken", "ご飯はありますがチキンはありません", "gohan wa arimasu ga chikin wa arimasen"]],
  [["I eat fish but I do not eat meat", "魚は食べますが肉は食べません", "sakana wa tabemasu ga niku wa tabemasen"]],
  [["I play in the park but I do not drive a car", "公園で遊びますが車は運転しません", "kouen de asobimasu ga kuruma wa untenshimasen"]],
  [["I do not want to run but I want to read a book", "走りたくありませんが本を読みたいです", "hashiritaku arimasen ga hon o yomitai desu"]],
  [["The condition for playing in the park is reading books", "公園で遊ぶ条件は本を読むことです", "kouen de asobu jouken wa hon o yomu koto desu"]],
  [["I do not eat much except apples", "リンゴ以外はあまり食べません", "ringo igai wa amari tabemasen"]]
];

const position = [
  [["There is a convenience store over there", "あそこにコンビニがあります", "asoko ni konbini ga arimasu"]],
  [["The car is in the market", "車は市場にあります", "kuruma wa ichiba ni arimasu"]],
  [["The car is at the restaurant", "車はレストランにあります", "kuruma wa resutoran ni arimasu"]],
  [["He made the airplane go up", "彼は飛行機を上昇させました", "kare wa hikouki o joushou sasemashita"]],
  [["The plane is under the table", "飛行機はテーブルの下にあります", "hikouki wa teeburu no shita ni arimasu"]],
  [["The pen is to the right of the book", "ペンは本の右にあります", "pen wa hon no migi ni arimasu"]]
];

const question = [
  [["What kind of phone is this?", "これはどんな携帯ですか", "kore wa donna keitai desu ka"]],
  [["Is it real?", "それは本物ですか", "sore wa honmono desu ka"]],
  [["Are apples really good for you?", "リンゴは本当に体に良いですか", "ringo wa hontou ni karada ni yoi desu ka"]],
  [["Do you think I should use it?", "使ったほうがいいと思いますか", "tsukatta hou ga ii to omoimasu ka"]],
  [["I think it should be fair", "公平であるべきだと思います", "kouhei de aru beki da to omoimasu"]],
  [["Why don’t you wash the car?", "なぜ車を洗わないのですか", "naze kuruma o arawanai no desu ka"]],
  [["Do you know that apples are good?", "リンゴが良いことを知っていますか", "ringo ga yoi koto o shitte imasu ka"]],
  [["I was asking about the book", "その本について聞いていました", "sono hon ni tsuite kiite imashita"]],
  [["I was asked about the book", "その本について聞かれました", "sono hon ni tsuite kikaremashita"]],
  [["Is it good to eat a lot of apples?", "リンゴをたくさん食べるのは良いですか", "ringo o takusan taberu no wa yoi desu ka"]]
];

const emotions = [
  [["I am happy", "私は幸せです", "watashi wa shiawase desu"]],
  [["I feel happy", "幸せに感じます", "shiawase ni kanjimasu"]],
  [["I am happy to study how to make rice", "ご飯の作り方を勉強できて嬉しいです", "gohan no tsukurikata o benkyou dekite ureshii desu"]],
  [["I am glad that I enjoyed it", "楽しめて嬉しいです", "tanoshimete ureshii desu"]]
];

const sentences = [
  [["It only takes two apples a day to be healthy", "健康になるには1日2個のリンゴで十分です", "kenkou ni naru ni wa ichinichi niko no ringo de juubun desu"]],
  [["It only takes five cups of water a day to stay healthy", "健康を保つには1日5杯の水で十分です", "kenkou o tamotsu ni wa ichinichi gohai no mizu de juubun desu"]]
];

const position2 = [
  [["The pen is over the table", "ペンはテーブルの上にあります", "pen wa teeburu no ue ni arimasu"]]
];












