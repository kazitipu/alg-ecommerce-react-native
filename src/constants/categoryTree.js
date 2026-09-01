/**
 * The two-level category drawer from the web header, extracted verbatim.
 *
 * Shape: top-level group -> mainCategories -> subCategories -> categories,
 * where each leaf is `{ name, route }`. `route` is the Chinese search term
 * actually sent to 1688 — the English `name` is only the label — which is why
 * these strings must not be "cleaned up".
 *
 * 281 leaf categories in total.
 */

export const CATEGORY_TREE = {
  "Dress & clothing": {
    id: "Dress & clothing",
    mainCategories: [
      {
        id: "women's clothing market",
        subCategories: [
          {
            id: "Featured",
            categories: [{ name: "womens clothing", route: "女性着装" }],
          },
          {
            id: "dress",
            categories: [
              { name: "skirts", route: "裙子" },
              { name: "womens dress", route: "女装" },
              { name: "floral dress", route: "碎花连衣裙" },
            ],
          },
          {
            id: "tops",
            categories: [
              { name: "camisole", route: "吊带背心" },
              { name: "womens T-shirt", route: "女式 T 恤" },
              { name: "womens shirt", route: "女式衬衫" },
            ],
          },
        ],
        image: {
          title: "Fashion two-piece list",
          route: "时尚两件套",
          src: "https://cbu01.alicdn.com/img/ibank/O1CN01Mn9hmD1STd5eIV27L_!!2208389072248-0-cib.search.jpg",
        },
      },
      {
        id: "Men's Market",
        subCategories: [
          {
            id: "Customized",
            categories: [
              { name: "mens T-Shirt", route: "男士 T 恤" },
              { name: "mens POLO", route: "男士马球" },
              { name: "casual shirt", route: "休闲衬衫" },
            ],
          },
          {
            id: "Coat",
            categories: [
              { name: "jacket", route: "夹克" },
              { name: "hoodie", route: "连帽衫" },
              { name: "PU leather jacket", route: "PU皮夹克" },
            ],
          },
          {
            id: "trousers",
            categories: [
              { name: "casual shorts", route: "休闲短裤" },
              { name: "denim shorts", route: "牛仔短裤" },
              { name: "underwear", route: "内衣" },
            ],
          },
        ],
        image: {
          title: "Hoodie",
          route: "连帽衫",
          src: "https://cbu01.alicdn.com/img/ibank/O1CN01VJt6vG1TCyIGxa4Di_!!2208681812347-0-cib.search.jpg",
        },
      },
      {
        id: "underwear market",
        subCategories: [
          {
            id: "home wear",
            categories: [
              { name: "womens pajamas", route: "女式睡衣" },
              { name: "night dress", route: "晚礼服" },
              { name: "couple pajamas", route: "情侣睡衣" },
            ],
          },
          {
            id: "thermal",
            categories: [
              {
                name: "Warm cloths can be worn outside",
                route: "暖和的衣服可以在外面穿",
              },
              { name: "long johns", route: "长内衣裤" },
            ],
          },
          {
            id: "panties",
            categories: [
              {
                name: "modal women",
                route: "模态女性",
              },
              { name: "silk panties", route: "丝绸内裤" },
              {
                name: "maternity panties",
                route: "孕妇内裤",
              },
            ],
          },
        ],
        image: {
          title: "Denim Shirt List",
          route: "牛仔衬衫清单",
          src: "https://cbu01.alicdn.com/img/ibank/O1CN01Wp625A1ymvUDQiXpK_!!2200753606622-0-cib.search.jpg",
        },
      },
    ],
  },
  "Accessories Shoes": {
    id: "Accessories Shoes",
    mainCategories: [
      {
        id: "accessories market",
        subCategories: [
          {
            id: "Jewelry/Glass",
            categories: [
              { name: "Quartz watch", route: "英表" },
              { name: "mechanical watch", route: "机械表" },
              { name: "digital watch", route: "数字手表" },
            ],
          },
          {
            id: "accessories",
            categories: [
              {
                name: "mens shoes",
                route: "男装鞋",
              },
              { name: "womens shoes", route: "女鞋" },
              { name: "umbilical foot ornament", route: "脐足饰品" },
              { name: "Jewelry Set", route: "首饰套装" },
            ],
          },
          {
            id: "cross-border",
            categories: [
              { name: "surface", route: "表面" },
              { name: "necklace", route: "项链" },
              { name: "earring", route: "耳环" },
              { name: "Glass and Accessories", route: "玻璃及配件" },
            ],
          },
        ],
        image: {
          title: "silver ring",
          route: "银戒指",
          src: "https://cbu01.alicdn.com/img/ibank/O1CN01IEhTks1YNZXxA3vd2_!!2449613047-0-cib.search.jpg",
        },
      },
      {
        id: "shoe market",
        subCategories: [
          {
            id: "men's shoes",
            categories: [
              { name: "sandals", route: "凉鞋" },
              { name: "mens shoes", route: "男装鞋" },
              { name: "skate shoes", route: "滑板鞋" },
            ],
          },
          {
            id: "women's shoes",
            categories: [
              { name: "sandals", route: "女式凉鞋" },
              { name: "sports shoes", route: "运动鞋" },
              { name: "casual shoes", route: "休闲鞋" },
              { name: "High heel", route: "高跟鞋" },
            ],
          },
          {
            id: "New product",
            categories: [
              { name: "womens shoes", route: "女鞋" },
              { name: "mens shoes", route: "男装鞋" },
            ],
          },
        ],
        image: {
          title: "Baby shoe List",
          src: "https://cbu01.alicdn.com/img/ibank/2020/860/405/15205504068_889907066.search.jpg",
        },
      },
      {
        id: "luggage market",
        subCategories: [
          {
            id: "womens bags",
            categories: [
              { name: "womens canvas bag", route: "女式帆布包" },
              { name: "womens genuing leather bag", route: "女士真皮包" },
            ],
          },
          {
            id: "backpack",
            categories: [
              { name: "leisure sports bag", route: "休闲运动包" },
              { name: "computer business bag", route: "电脑商务包" },
              { name: "mens backpack", route: "男士背包" },
            ],
          },
          {
            id: "women's classic",
            categories: [
              { name: "small package", route: "小包装" },
              { name: "diamond chain bag", route: "钻石链条包" },
              { name: "Fringed bag", route: "流苏包" },
              { name: "Diana bag", route: "戴安娜包" },
            ],
          },
        ],
        image: {
          title: "Buckle bag",
          route: "搭扣包",
          src: "https://cbu01.alicdn.com/img/ibank/O1CN019LoGCH2B6s3b0Dpc0_!!2551128290-0-cib.search.jpg",
        },
      },
    ],
  },
  "Handbags Wallets": {
    id: "Handbags Wallets",
    mainCategories: [
      {
        id: "Bags",
        subCategories: [
          {
            id: "Handbags",
            categories: [
              { name: "Men's Handbags", route: "英表" },
              { name: "Purses", route: "机械表" },
              { name: "Womens's handbags", route: "数字手表" },
              { name: "Womens's clutches", route: "数字手表" },
              { name: "Womens's backpacks", route: "数字手表" },
            ],
          },
        ],
      },
      {
        id: "Wallets",
        subCategories: [
          {
            id: "Wallets,Purses",
            categories: [
              { name: "Wallets", route: "凉鞋" },
              { name: "Cardholders", route: "男装鞋" },
              { name: "Wallets,Purses", route: "滑板鞋" },
              { name: "Holders and covers for id-cards", route: "滑板鞋" },
              { name: "Cases for mobile phones", route: "滑板鞋" },
            ],
          },
        ],
      },
      {
        id: "Suitcases, travel bags",
        subCategories: [
          {
            id: "Travel bags",
            categories: [
              { name: "Backpacks", route: "女式帆布包" },
              { name: "Shoulder Bag", route: "女士真皮包" },
              { name: "Waist Bags", route: "女士真皮包" },
              { name: "Large Bags", route: "女士真皮包" },
              { name: "Suitcases", route: "女士真皮包" },
              { name: "Accessories suitcases", route: "女士真皮包" },
            ],
          },
          {
            id: "backpack",
            categories: [
              { name: "leisure sports bag", route: "休闲运动包" },
              { name: "computer business bag", route: "电脑商务包" },
              { name: "mens backpack", route: "男士背包" },
            ],
          },
          {
            id: "women's classic",
            categories: [
              { name: "small package", route: "小包装" },
              { name: "diamond chain bag", route: "钻石链条包" },
              { name: "Fringed bag", route: "流苏包" },
              { name: "Diana bag", route: "戴安娜包" },
            ],
          },
        ],
        image: {
          title: "Buckle bag",
          route: "搭扣包",
          src: "https://cbu01.alicdn.com/img/ibank/O1CN019LoGCH2B6s3b0Dpc0_!!2551128290-0-cib.search.jpg",
        },
      },
    ],
  },
  "Sports Apparel": {
    id: "Sports Apparel",
    mainCategories: [
      {
        id: "sportswear market",
        subCategories: [
          {
            id: "sports accessories",
            categories: [
              { name: "fanny pack", route: "腰包" },
              { name: "backpack", route: "背包" },
              { name: "arm bag", route: "臂包" },
              { name: "scarf", route: "围巾" },
              { name: "gloves", route: "手套" },
            ],
          },
          {
            id: "dance",
            categories: [
              { name: "dance costume", route: "舞蹈服装" },
              { name: "Latin dance", route: "拉丁舞" },
              { name: "belly dance", route: "肚皮舞" },
            ],
          },
          {
            id: "women's shoes",
            categories: [
              { name: "sports shoes", route: "运动鞋" },
              { name: "gym clothes", route: "运动服" },
              { name: "sports trousers", route: "运动裤" },
              { name: "sports bra", route: "运动文胸" },
            ],
          },
          {
            id: "yoga fitness",
            categories: [
              { name: "yoga clothes", route: "瑜伽服" },
              { name: "sports bra", route: "运动文胸" },
              { name: "gym clothes", route: "运动服" },
            ],
          },
          {
            id: "Cycling supplies",
            categories: [
              { name: "cycling mask", route: "骑行面具" },
              { name: "Bicycle Light", route: "自行车灯" },
              { name: "Bike bag", route: "自行车包" },
              { name: "inflator", route: "气筒" },
            ],
          },
        ],
        image: {
          title: "correction bell",
          route: "修正钟",
          src: "https://cbu01.alicdn.com/img/ibank/O1CN01haew8H1kMRtrTZeHe_!!2938064669-0-cib.search.jpg",
        },
      },
      {
        id: "Sports equipment Market",
        subCategories: [
          {
            id: "yoga fitness",
            categories: [
              { name: "yoga mat", route: "瑜伽垫" },
              { name: "jump rope", route: "跳绳" },
              { name: "Rejection of fat", route: "排斥脂肪" },
              { name: "Hula Hoop", route: "呼啦圈" },
              { name: "treadmill", route: "跑步机" },
            ],
          },
          {
            id: "Health Repair",
            categories: ["foot bag", "beauty equipment", "sauna"],
          },
          {
            id: "fishing supplies",
            categories: [
              { name: "fishing reel", route: "渔线轮" },
              { name: "fishing bait", route: "鱼饵" },
              { name: "fishing protection", route: "钓鱼保护" },
              { name: "fishing clothing", route: "钓鱼服" },
            ],
          },
          {
            id: "Cycling supplies",
            categories: [
              { name: "foldable bicycle", route: "折叠自行车" },
              { name: "Ridding gloves", route: "骑行手套" },
              { name: "Inflator", route: "气筒" },
              { name: "mountain bike", route: "山地自行车" },
            ],
          },

          {
            id: "Outdoor travels",
            categories: [
              { name: "face mask", route: "口罩" },
              { name: "telescope", route: "望远镜" },
              { name: "bike", route: "自行车" },
              { name: "folding chair", route: "折叠椅" },
              { name: "gloves", route: "手套" },
            ],
          },
        ],
        image: {
          title: "Tennis",
          route: "网球",
          src: "https://cbu01.alicdn.com/img/ibank/2020/691/684/21612486196_129667670.search.jpg",
        },
      },
    ],
  },
  "Children's clothing": {
    id: "Children's clothing",
    mainCategories: [
      {
        id: "Children's clothing market",
        subCategories: [
          {
            id: "children's",
            categories: [{ name: "childrens wear", route: "童装" }],
          },
          {
            id: "children's",
            categories: [
              { name: "childrens t-shirt", route: "儿童 t 恤" },
              { name: "childrens bedding clothes", route: "儿童床上用品" },
              { name: "childrens underwear", route: "儿童内衣" },
            ],
          },
          {
            id: "children's",
            categories: [
              {
                name: "spring and summer childrens socks",
                route: "春夏童袜",
              },
              { name: "sleeping clothes", route: "睡衣" },
            ],
          },
        ],
      },
      {
        id: "Mother and baby market",
        subCategories: [
          {
            id: "cross-border",
            categories: [
              { name: "mother sandals", route: "凉鞋" },
              { name: "nursing pad", route: "护理垫" },
              { name: "Breast milk storage", route: "母乳储存" },
              { name: "baby pool", route: "婴儿游泳池" },
            ],
          },
          {
            id: "baby sleeping",
            categories: [
              { name: "smock", route: "罩衫" },
              { name: "children sleeping bag", route: "儿童睡袋" },
              { name: "saliva towel", route: "口水巾" },
            ],
          },
          {
            id: "Security",
            categories: [
              { name: "Anti collison supplies", route: "防撞用品" },
              { name: "Anti lost", route: "防丢" },
              { name: "bed rail", route: "床栏杆" },
            ],
          },
        ],
      },
      {
        id: "toy market",
        subCategories: [
          {
            id: "creative nov..",
            categories: [
              { name: "vent decompression", route: "排气减压" },
              { name: "blind box", route: "盲盒" },
            ],
          },

          {
            id: "business op..",
            categories: [
              {
                name: "Explosive business opportunities",
                route: "爆炸性的商业机会",
              },
            ],
          },
        ],
      },
    ],
  },
  "Home Furnishings": {
    id: "Home Furnishing",
    mainCategories: [
      {
        id: "Home Furnishings Market",
        subCategories: [
          {
            id: "daily use",
            categories: [
              { name: "warm stickers", route: "暖贴" },
              { name: "insect and moth proof", route: "防虫防蛀" },
              { name: "windbreaker", route: "风衣" },
            ],
          },
          {
            id: "housekeeping",
            categories: [
              { name: "drying rack", route: "晾衣架" },
              { name: "Coat hanger", route: "衣架" },
              { name: "Vanity mirror", route: "化妆镜" },
              { name: "Toilet mat", route: "马桶垫" },
            ],
          },
          {
            id: "Disposable",
            categories: [
              { name: "travel essentials", route: "旅行必备品" },
              { name: "Disposable daily mouth", route: "一次性日用嘴" },
              { name: "other one-time", route: "其他一次性" },
            ],
          },
          {
            id: "Outing",
            categories: [
              { name: "flashlight", route: "手电筒" },
              { name: "headlamp", route: "头灯" },
              { name: "raincoat", route: "雨衣" },
              { name: "windbreaker", route: "风衣" },
              { name: "poncho", route: "雨披" },
            ],
          },
        ],
        image: {
          title: "Rain boot list",
          route: "雨靴清单",
          src: "https://cbu01.alicdn.com/img/ibank/O1CN01tlVQ0F1oIYygyBzP1_!!6000000005202-0-cib.search.jpg",
        },
      },
      {
        id: "Home Textiles and Home Furnishings Market",
        subCategories: [
          {
            id: "bed linen",
            categories: [
              { name: "hotel linen", route: "酒店布草" },
              { name: "Duvet Covers", route: "羽绒被套" },
              { name: "gift towel", route: "礼品毛巾" },
            ],
          },
          {
            id: "style home",
            categories: [
              { name: "painting", route: "绘画" },
              { name: "photo frame", route: "相框" },
              { name: "decorative fabric", route: "装饰布" },
            ],
          },
        ],
        image: {
          title: "Alluminium ladder",
          route: "铝梯",
          src: "https://cbu01.alicdn.com/img/ibank/O1CN014PGj8s1VzdcXFsEYt_!!2903652724-0-cib.search.jpg",
        },
      },
    ],
  },
  "Home imporovement": {
    id: "Home imporovement",
    mainCategories: [
      {
        id: "Home improvement building materials Market",
        subCategories: [
          {
            id: "Hardware",
            categories: [
              { name: "curtain accessories", route: "窗帘配件" },
              { name: "door suction", route: "门吸" },
              { name: "Furniture Hardware", route: "家具五金" },
            ],
          },
          {
            id: "Home impro..",
            categories: [
              { name: "stone", route: "石头" },
              { name: "plate", route: "盘子" },
              { name: "line board", route: "线路板" },
              { name: "Integrated ceiling", route: "集成吊顶" },
              { name: "glue", route: "胶水" },
            ],
          },
          {
            id: "floor tiles",
            categories: [
              { name: "wall tiles", route: "墙砖" },
              { name: "floor tiles", route: "地砖" },
              { name: "laminate floor", route: "强化木地板" },
            ],
          },
          {
            id: "study children",
            categories: [
              { name: "study desk and chair", route: "学习桌椅" },
              { name: "children bed", route: "儿童床" },
              { name: "computer desk", route: "电脑桌" },
            ],
          },
          {
            id: "Kitchen bath",
            categories: [
              { name: "kitchen bath cover", route: "厨房浴罩" },
              { name: "kitchen accessories", route: "厨房配件" },
            ],
          },
        ],
        image: {
          title: "downlight",
          route: "筒灯",
          src: "https://cbu01.alicdn.com/img/ibank/O1CN01HI31JL1u9l9XdZcuF_!!2212910205995-0-cib.search.jpg",
        },
      },
      {
        id: "Lighting Market",
        subCategories: [
          {
            id: "table lamp",
            categories: [
              { name: "candle light", route: "烛光" },
              { name: "night light", route: "小夜灯" },
              { name: "lampshade", route: "灯罩" },
            ],
          },
          {
            id: "outdoor light",
            categories: [
              { name: "rice bubble", route: "米泡" },
              { name: "landscape lights", route: "景观灯" },
              { name: "road lightning", route: "道路闪电" },
              { name: "solar light", route: "太阳能灯" },
            ],
          },
        ],
        image: {
          title: "Bulb",
          route: "电灯泡",
          src: "https://cbu01.alicdn.com/img/ibank/O1CN01cR6rbn1ir18JrDm3c_!!992514465-0-cib.search.jpg",
        },
      },
    ],
  },
  "Office Culture/Pet": {
    id: "Office Culture/Pet",
    mainCategories: [
      {
        id: "Office culture and education market",
        subCategories: [
          {
            id: "Display",
            categories: [
              { name: "trophy", route: "杯" },
              { name: "medal", route: "勋章" },
              { name: "touch all-in-one", route: "触摸一体机" },

              { name: "display stand", route: "展示支架" },
            ],
          },
          {
            id: "Atmosphere",
            categories: [
              { name: "banner", route: "横幅" },
              { name: "snow spray", route: "雪花" },
            ],
          },
        ],
        image: {
          title: "Portable Bag List",
          route: "手提包清单",
          src: "https://cbu01.alicdn.com/img/ibank/O1CN01VIeeoq2HtJhASpwqB_!!2219969208-0-cib.search.jpg",
        },
      },
      {
        id: "Pet Gardeining Market",
        subCategories: [
          {
            id: "daily use",
            categories: [
              { name: "pet clothing", route: "宠物服装" },
              { name: "pet accessories", route: "宠物配件" },
              { name: "dog toilet", route: "狗厕所" },
              { name: "diaper pad", route: "尿布垫" },
              { name: "cat litter", route: "猫砂" },
            ],
          },
          {
            id: "pet travel",
            categories: [
              { name: "pet box/bag", route: "宠物箱/袋" },
              { name: "pet mug", route: "宠物杯" },
              { name: "Leash", route: "皮带" },
              { name: "muzzle", route: "枪口" },
              { name: "collar dog tag", route: "项圈狗牌" },
            ],
          },
        ],
        image: {
          title: "dog food",
          route: "狗粮",
          src: "https://cbu01.alicdn.com/img/ibank/2020/377/323/23465323773_522667998.search.jpg",
        },
      },
    ],
  },
  "Food,Drink": {
    id: "Food,Drink",
    mainCategories: [
      {
        id: "Food and beverage market",
        subCategories: [
          {
            id: "Alcoholic",
            categories: [
              { name: "dairy beverages", route: "乳制品饮料" },
              { name: "nice wine", route: "好酒" },
              { name: "Liquor", route: "酒" },
              { name: "Carbonated drinks", route: "碳酸饮料" },
            ],
          },
          {
            id: "Casual snack",
            categories: [
              { name: "pudding", route: "布丁" },
              { name: "hard candy", route: "硬糖" },
              { name: "fish snacks", route: "鱼零食" },
              { name: "vegeterian meat", route: "素肉" },
              { name: "fondant", route: "软糖" },
            ],
          },
        ],
        image: {
          title: "Cranberry Cookie",
          route: "蔓越莓曲奇",
          src: "https://cbu01.alicdn.com/img/ibank/O1CN01z51uRR2GB3p1dh6ry_!!3200068976-0-cib.search.jpg",
        },
      },
      {
        id: "Fresh food market",
        subCategories: [
          {
            id: "dried mushroom",
            categories: [
              { name: "shiitake mushroom", route: "香菇" },
              { name: "kelp seaweed", route: "海带紫菜" },
              { name: "wild fungi", route: "野生菌类" },
            ],
          },
          {
            id: "Russian food",
            categories: [
              { name: "Russian pastries", route: "俄罗斯糕点" },
              { name: "Russian wine", route: "俄罗斯葡萄酒" },
              { name: "Russian honey", route: "俄罗斯蜂蜜" },
            ],
          },
        ],
        image: {
          title: "Bulk Tea",
          route: "散装茶",
          src: "https://cbu01.alicdn.com/img/ibank/O1CN01OJUga91aU6QlnOmbD_!!2649693332-0-cib.search.jpg",
        },
      },
    ],
  },
  "Beauty & Makeup": {
    id: "Beauty & Makeup",
    mainCategories: [
      {
        id: "Beauty & Makeup Market",
        subCategories: [
          {
            id: "Makeup",
            categories: [
              { name: "eyebrow pencil", route: "眉笔" },
              { name: "blush", route: "脸红" },
              { name: "mascara", route: "睫毛膏" },
            ],
          },
          {
            id: "beauty tools",
            categories: [
              { name: "makeup brush", route: "化妆刷" },
              { name: "eyebrow knife", route: "眉刀" },
              { name: "fake eyelashes", route: "假睫毛" },
              { name: "hair comb", route: "头发梳" },
            ],
          },
          {
            id: "Facial",
            categories: [
              { name: "mens skin care", route: "男士护肤" },
              { name: "Facial mask", route: "面膜" },
              { name: "care kit", route: "护理包" },
              { name: "facial serum", route: "面部精华" },
              { name: "eye care", route: "眼睛护理" },
            ],
          },
          {
            id: "Downstrea..",
            categories: [
              { name: "floor cleaning tablets", route: "地板清洁片" },
              { name: "Fragnance beads", route: "香珠" },
              { name: "U-shaped toothbrush", route: "U型牙刷" },
            ],
          },
          {
            id: "Nail Products",
            categories: [
              { name: "Nail stickers", route: "指甲贴" },
              { name: "Polisher", route: "抛光机" },
              { name: "Phototherapy lamp", route: "光疗灯" },
              { name: "manicure", route: "修指甲" },
              { name: "Nail Pen", route: "美甲笔" },
            ],
          },
        ],
      },
      {
        id: "Gehujiaqing Market",
        subCategories: [
          {
            id: "laundry clea...",
            categories: [
              { name: "Laundry soap", route: "洗衣皂" },
              { name: "Laudnry detergent", route: "洗衣粉" },
              { name: "dry cleaner", route: "干洗店" },
              { name: "fabric softener", route: "织物柔软剂" },
            ],
          },
          {
            id: "home cleaning",
            categories: [
              { name: "glass cleaner", route: "玻璃清洁剂" },
              { name: "carpet dry cleaner", route: "地毯干洗剂" },
              { name: "Air condition cleaner", route: "空调清洁剂" },
            ],
          },
          {
            id: "Deaodrant",
            categories: [
              { name: "household dehumidifier", route: "家用除湿机" },
              { name: "charcoal bag", route: "木炭袋" },
              { name: "Formaldehyde scavenger", route: "甲醛清除剂" },
            ],
          },
          {
            id: "Paper wipes",
            categories: [
              { name: "kitchen paper", route: "厨房用纸" },
              { name: "paper napkin", route: "餐巾纸" },
              { name: "toilet paper", route: "卫生纸" },
              { name: "tissue paper", route: "卫生纸" },
            ],
          },
          {
            id: "Wig featured",
            categories: [
              { name: "Wig long curly hair", route: "假发长卷发" },
              { name: "long straight wig", route: "长直假发" },
              { name: "real hair wig", route: "真发假发" },
            ],
          },
        ],
      },
    ],
  },
  Digital: {
    id: "Digital",
    mainCategories: [
      {
        id: "digital market",
        subCategories: [
          {
            id: "mobile phone",
            categories: [
              { name: "cellphone battery", route: "手机电池" },
              { name: "phone film", route: "电话膜" },
              { name: "phone case", route: "手机壳" },
              { name: "data line", route: "数据线" },
            ],
          },
          {
            id: "smart device",
            categories: [
              { name: "smart tutoring machine", route: "智能辅导机" },
              { name: "smart wristband", route: "智能手环" },
              { name: "smart watch strap", route: "智能手表表带" },
            ],
          },
        ],
      },
      {
        id: "home appliance market",
        subCategories: [
          {
            id: "audio and video",
            categories: [
              { name: "card speaker", route: "卡音箱" },
              {
                name: "audio and video electrical accessories",
                route: "音视频电器配件",
              },
            ],
          },
          {
            id: "home devices",
            categories: [
              { name: "household waste disposal", route: "生活垃圾处理" },
              { name: "Mite removal machine", route: "除螨机" },
            ],
          },
          {
            id: "Two Season",
            categories: [
              {
                name: "mosquito killer mosquito lamp",
                route: "灭蚊灯灭蚊灯",
              },
            ],
          },
        ],
      },
      {
        id: "Auto Supplies market",
        subCategories: [
          {
            id: "vehicle",
            categories: [
              { name: "mini scooter", route: "迷你滑板车" },
              { name: "adult quad bike", route: "成人四轮摩托车" },
              { name: "electric car", route: "电子车" },
            ],
          },
          {
            id: "safe driving",
            categories: [
              { name: "driving recorder", route: "行车记录仪" },
              { name: "Safety hammer tool", route: "安全锤工具" },
              { name: "Child safety seat", route: "儿童安全座椅" },
            ],
          },
          {
            id: "auto parts",
            categories: [
              { name: "tail", route: "尾巴" },
              { name: "flashing lights", route: "闪光灯" },
              { name: "car lights", route: "汽车灯" },
            ],
          },
        ],
      },
    ],
  },
};

export default CATEGORY_TREE;
