// NPC lines for the town. Edit freely: only the text matters to the game.
export const VOICES = {
  wacky: { speed: 18, label: 'wacky' }, // ms per letter for the typewriter
  flat: { speed: 34, label: 'flat' },
  sarcastic: { speed: 26, label: 'sarcastic' },
};

export const NPCS = [
  {
    id: 'mallow',
    name: 'Pilot Mallow',
    voice: 'sarcastic',
    look: 'suit',
    coat: 'cream',
    storied: true,
    romance: true,
    home: 'mallow',
    greet: [
      'Oh, it\'s you. Mind the dent in my suit. It has seniority.',
      'Hello. I was not waiting by the window. The window was waiting for me.',
      'Ah, a visitor. Do wipe your paws, this is a very nearly clean home.',
    ],
    chat: [
      'I flew for forty years. Now I water a plant. It is thriving, which is more than I can say for my knees.',
      'The tavern does a lovely soup. Unit-9 will tell you it is "adequate". That is a rave review.',
      'Don\'t mind the suit. It\'s retired, like me. Neither of us has been told.',
      'Pip zooms past my window every morning. I\'ve started timing it. Seven seconds. Show-off.',
      'Quiet nights are nice. I just wish the sky would stop being so interesting.',
      'I do not have a favourite star. I have several. Do not ask me to rank them.',
    ],
    gift: {
      liked: ['syrup', 'snack'],
      loved: ['video'],
      likedLine: 'Syrup? For me? Well. I suppose I could find a use for it. Possibly on toast.',
      lovedLine: 'A cat video. I will watch it once. Alone. Possibly four times. Thank you.',
      meh: 'How thoughtful. I will put it somewhere safe, which is to say, near the bin.',
    },
    bye: 'Off you go, then. Mind the stairs. I won\'t be watching you leave.',
    story: {
      0: [
        'You\'re standing very close to my doorstep. Is there a reason, or just ambition?',
        'I don\'t chat with strangers. It spoils the mystery, and I\'ve invested heavily in mystery.',
        'Go on, have a wander. The moon is small, but it keeps people busy.',
      ],
      1: [
        'Fine, you can stay a minute. Don\'t touch the helmet.',
        'The observatory used to have a grand lens. You could see halfway to forever.',
        'Now it\'s all fogged and dusty. Orla says it\'s "fine". Orla says that about everything.',
        'Not that I care about lenses. I just notice things. It\'s a pilot habit.',
      ],
      2: [
        'All right. I\'ll say it once. I flew to Velvet Reach, years ago.',
        'It was the best trip of my life. I may have mentioned it zero times since.',
        'I had a star chart for the way back. It tore in three pieces, and I never fetched them.',
        'One is behind the observatory lens. One is on the old cinema projector reel. One is in a stuck crate at the spaceport.',
      ],
      3: [
        'I\'ve been thinking. You\'ve earned my flight key. Bring me the three chart pieces and it\'s yours to borrow.',
        'The rocket also wants a Moon rock for its fuel cell. A small one. Not your favourite.',
        'And some fare coins, for the gate cat. Even adventures have paperwork.',
        'Don\'t crash it. Or do, but tell the rocket it was my idea.',
      ],
      4: [
        'I made two cups of tea this morning. I told myself it was an accident.',
        'You make the moon feel less quiet. Don\'t let it go to your head.',
        'Walk with me to the fountain? Slowly. I have the pace of a cautious comet.',
      ],
      5: [
        'Good morning, my dear. I\'ve made far too much toast again.',
        'The plant has been moved to the window. It likes your side of the room.',
        'I used to chase stars. Now I\'m quite content with one very good home.',
        'Kettle is on. Come and sit. The sky will still be there in the morning.',
      ],
    },
    askOut: {
      yes: 'Walk with you under the moon ring? Yes. I\'d like that. Don\'t make it weird.',
      notYet: 'That\'s kind of you, but we\'ve barely finished the tea. Perhaps once we know each other better.',
    },
    propose: {
      yes: 'A star ring. Oh. Yes. Yes, of course, you silly, wonderful cat.',
      notYet: 'I\'m honoured, truly. But let\'s take the long route first. Stars take their time.',
      noRing: 'A proposal with no ring? Bold. Come back with a Star ring and I shall be speechless.',
    },
    married: [
      'Home is the best place I have ever landed. Please don\'t tell the other pilots.',
      'You\'re humming again. I\'ve decided it\'s my favourite engine noise.',
      'Tea, toast, and you. I\'d call it a perfect flight plan.',
    ],
  },
  {
    id: 'zib',
    name: 'Zib',
    voice: 'wacky',
    look: 'alien',
    coat: 'mint',
    home: 'market',
    greet: [
      'HELLO! Three eyes, all of them delighted to see you!',
      'Oh! A customer! Or a friend! Or both! Both is best!',
      'Welcome, welcome! Mind the bolts, they roll when they are excited!',
    ],
    chat: [
      'Bolts! Have you ever REALLY looked at a bolt? Tiny, spiral, perfect!',
      'My left eye sees the stall. My right eye sees the sky. My middle eye is on a break!',
      'I fixed a toaster today! It now makes tiny rainbows! Nobody asked, but still!',
      'The rocket at the spaceport is a RUSTY legend! I could polish it for a year!',
      'I tried sleeping upside down! Do NOT recommend! Great for ideas though!',
      'Everything is better with a spanner! Soup! Hugs! Mondays!',
    ],
    gift: {
      liked: ['dust', 'snack'],
      loved: ['rock'],
      likedLine: 'Ooh! Shiny! Fizzy! A good item! My eyes are all sparkling at once!',
      lovedLine: 'A MOON ROCK! I am going to name it Kevin! Then I am going to hug Kevin!',
      meh: 'Oh! Interesting! I shall put it on the shelf and think about it with all three eyes!',
    },
    bye: 'Bye bye! Come back soon! Bring bolts! Or snacks! Or both!',
  },
  {
    id: 'unit9',
    name: 'Unit-9',
    voice: 'flat',
    look: 'visor',
    coat: 'grey',
    home: 'tavern',
    greet: [
      'hello. the bar is open. the stools are also open.',
      'welcome. i have soup, and a spare silence if you need one.',
      'good evening. or morning. my clock is not sure either.',
    ],
    chat: [
      'i have polished this glass for six hours. it is the same glass. it is very clean.',
      'a customer once asked for something "surprising". i gave them a spoon. they cried.',
      'i do not sleep. i idle. there is a difference. mostly in the paperwork.',
      'the soup is adequate. i have been told this is a compliment.',
      'i enjoy the quiet between orders. it hums at about 40 hertz.',
      'someone left a hat here in spring. it is still here. i have grown fond of it.',
    ],
    gift: {
      liked: ['syrup', 'rock'],
      loved: ['snack'],
      likedLine: 'this is acceptable. i will place it on the good shelf.',
      lovedLine: 'a vat snack. my circuits are doing something warm. thank you. i will not mention it again.',
      meh: 'noted. i will file it under things.',
    },
    bye: 'goodbye. i will be here. i am always here. it is my whole thing.',
  },
  {
    id: 'pip',
    name: 'Pip',
    voice: 'wacky',
    look: 'jet',
    coat: 'ginger',
    home: 'town',
    greet: [
      'WHEEE! Oh, hi! Sorry, still going round the fountain!',
      'Hello hello hello! I\'m on lap forty-two!',
      'You\'re here! Quick, say something before I zoom away!',
    ],
    chat: [
      'My jetpack goes BRRRRR! Unit-9 says I should say "brr" more quietly! I did not!',
      'The fountain is the best fountain! It has a splash and a splish! Both!',
      'I zoomed over the market and knocked a bolt off! Zib says I owe her a bolt! Fair!',
      'Do you know what is above the moon? MORE MOON! Probably! I\'m going to check!',
      'I\'m not too small for the rocket. I\'m just a small person ready for big things!',
      'Naps are for later! Zoomies are for NOW!',
    ],
    gift: {
      liked: ['snack', 'video'],
      loved: ['syrup'],
      likedLine: 'Ooh, for me?! Thank you thank you thank you! Zooooom!',
      lovedLine: 'SYRUP! The golden stuff! I\'m going to be the fastest cat in the whole sky!',
      meh: 'Oh! A thing! Thank you! I\'ll take it for a quick flight!',
    },
    bye: 'Bye! I\'m going round the fountain again! See you in a lap!',
  },
  {
    id: 'orla',
    name: 'Orla',
    voice: 'flat',
    look: 'visor',
    coat: 'lilac',
    home: 'observatory',
    greet: [
      'oh. hello. i was resting my eyes. for the last hour.',
      'welcome to the observatory. mind the telescope. it bites. not really.',
      'hello. is it night yet. i never know. the dome has no clock.',
    ],
    chat: [
      'stars are very far away. this is my favourite thing about them.',
      'i wrote down a comet last week. then i fell asleep. then i lost the note.',
      'the big lens is foggy now. i keep meaning to clean it. i keep meaning a lot of things.',
      'a blinking violet light sits past the moon\'s ring. i call it a trick of the eyes. mostly.',
      'tea helps me stay awake. so does a nap. i use both.',
      'visitors are nice. they talk, and i get to nod. nodding is an art.',
    ],
    gift: {
      liked: ['rock', 'reel'],
      loved: ['dust'],
      likedLine: 'oh. this is nice. i will look at it later. when i am awake.',
      lovedLine: 'moon dust. this is the good kind. i may actually clean something. thank you.',
      meh: 'thank you. i will put it near the telescope and stare at it thoughtfully.',
    },
    bye: 'goodbye. the sky will still be here. it is very reliable.',
  },
];

export const CLUE_TEXT = {
  lens: {
    title: 'The foggy lens',
    need: 'The big lens in the observatory is thick with dust. A little Moon dust would polish it clear.',
    found: 'Through the clear lens, a piece of chart: "a blinking violet dot beyond the moon\'s ring".',
  },
  reel: {
    title: 'The snapped reel',
    need: 'The old cinema projector reel has snapped. A fresh Film reel would get it running again.',
    found: 'The film flickers on, and a chart piece slips out: "follow the ring west, then the glow turns violet".',
  },
  hatch: {
    title: 'The stuck hatch',
    need: 'A crate hatch at the spaceport is stuck fast. A drop of Syrup might loosen it.',
    found: 'The hatch pops open. Inside is a chart piece: "land softly where the velvet clouds begin".',
  },
};

export const PLANET_TEXT = {
  locked: 'The rocket coughs and stays put. It wants a chart, a fuel cell, and a flight key first.',
  ready: 'Chart in paw, fuel cell glowing, key turned. All set. Launch for Velvet Reach?',
  launched: 'The rocket hums and lifts, and soft violet light fills the window. Velvet Reach, at last.',
};
