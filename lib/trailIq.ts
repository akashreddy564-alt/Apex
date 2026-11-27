/**
 * Trail IQ: one hiking question a day on Home. Etiquette, safety, maps and
 * famous trails, with the why after you answer. Same question for everyone on
 * a given day. Pure, so it runs under node tests.
 */

export interface TrailQuestion {
  id: string;
  question: string;
  /** The first answer is the right one; they're shuffled for display. */
  answers: readonly [string, string, string];
  why: string;
}

export const TRAIL_QUESTIONS: readonly TrailQuestion[] = [
  {
    id: 'right-of-way-uphill',
    question: 'On a narrow trail, who has the right of way?',
    answers: ['The hiker going uphill', 'The hiker going downhill', 'Whoever is faster'],
    why: 'Climbing is harder to restart, and uphill hikers have a narrower view. Downhill hikers step aside.',
  },
  {
    id: 'yield-horses',
    question: 'Hikers, mountain bikers and horses meet. Who yields to whom?',
    answers: ['Everyone yields to horses; bikes yield to hikers', 'Hikers yield to everyone', 'Horses yield to bikes'],
    why: 'Horses spook easily, so everyone gives them room. Bikers are the fastest and most maneuverable, so they yield to both.',
  },
  {
    id: 'lnt-principles',
    question: 'How many Leave No Trace principles are there?',
    answers: ['Seven', 'Three', 'Twelve'],
    why: 'Plan ahead, durable surfaces, dispose of waste, leave what you find, minimize fire, respect wildlife, be considerate.',
  },
  {
    id: 'water-200ft',
    question: 'Leave No Trace says to camp at least how far from lakes and streams?',
    answers: ['200 feet', '20 feet', 'Half a mile'],
    why: 'About 70 adult steps. It protects the water and the plants along the shore, and leaves room for animals to drink.',
  },
  {
    id: 'cathole',
    question: 'How deep should a cathole be?',
    answers: ['6 to 8 inches', '1 inch', '3 feet'],
    why: 'Deep enough to cover, shallow enough that the soil’s microbes can still break it down. Dig it 200 feet from water.',
  },
  {
    id: 'ten-essentials',
    question: 'Which of these is one of the Ten Essentials?',
    answers: ['A headlamp', 'A camp chair', 'A Bluetooth speaker'],
    why: 'The list: navigation, light, sun protection, first aid, a knife, fire, shelter, extra food, extra water and extra clothes.',
  },
  {
    id: 'blue-blazes',
    question: 'On the Appalachian Trail, what do blue blazes mark?',
    answers: ['Side trails to water, shelters and views', 'The main trail', 'Closed sections'],
    why: 'White blazes mark the A.T. itself. Blue ones lead off it.',
  },
  {
    id: 'double-blaze',
    question: 'You see two blazes stacked on a tree. What does it mean?',
    answers: ['A turn or junction is coming', 'You’re halfway', 'The trail ends'],
    why: 'A double blaze is a heads-up. On some trails the top blaze is offset toward the direction of the turn.',
  },
  {
    id: 'cairn',
    question: 'What should you do with a cairn on the trail?',
    answers: ['Follow it, and leave it alone', 'Add a rock for luck', 'Knock it down'],
    why: 'Cairns mark routes where a trail is hard to see. Building new ones or knocking them over can lead people astray.',
  },
  {
    id: 'switchbacks',
    question: 'Why shouldn’t you cut a switchback?',
    answers: ['It erodes the slope', 'It’s slower', 'Switchbacks are private land'],
    why: 'Shortcuts strip plants and send water straight down the hill, which washes the trail out.',
  },
  {
    id: 'lapse-rate',
    question: 'About how much colder does it get for every 1,000 ft you climb?',
    answers: ['About 3.5°F', 'About 1°F', 'About 10°F'],
    why: 'That’s the standard rate in still air. A 4,000 ft climb can mean a summit 14°F colder than the trailhead, before wind.',
  },
  {
    id: 'naismith',
    question: 'Naismith’s rule adds how much time for every 2,000 ft of climb?',
    answers: ['About an hour', 'About 10 minutes', 'About 4 hours'],
    why: 'The classic rule: an hour per 3 miles, plus an hour per 2,000 ft up. Adjust it to your own pace.',
  },
  {
    id: 'whitney',
    question: 'What’s the highest peak in the lower 48 states?',
    answers: ['Mount Whitney', 'Mount Rainier', 'Pikes Peak'],
    why: 'Whitney, in California’s Sierra Nevada, tops out at 14,505 ft.',
  },
  {
    id: 'denali',
    question: 'What’s the highest peak in North America?',
    answers: ['Denali', 'Mount Whitney', 'Mount Logan'],
    why: 'Denali, in Alaska, rises to 20,310 ft.',
  },
  {
    id: 'rainier',
    question: 'Which is the most glaciated peak in the lower 48?',
    answers: ['Mount Rainier', 'Mount Hood', 'Longs Peak'],
    why: 'Rainier carries more glacier ice than any other peak in the contiguous United States.',
  },
  {
    id: 'at-length',
    question: 'About how long is the Appalachian Trail?',
    answers: ['About 2,200 miles', 'About 900 miles', 'About 4,000 miles'],
    why: 'It shifts a little each year with reroutes, and runs through 14 states.',
  },
  {
    id: 'at-south',
    question: 'Where does the Appalachian Trail start in the south?',
    answers: ['Springer Mountain, Georgia', 'Clingmans Dome, Tennessee', 'Stone Mountain, Georgia'],
    why: 'Northbound thru-hikers start on Springer Mountain and finish on Katahdin in Maine.',
  },
  {
    id: 'at-north',
    question: 'Which mountain marks the Appalachian Trail’s northern end?',
    answers: ['Katahdin', 'Mount Washington', 'Mount Mansfield'],
    why: 'Katahdin, in Maine’s Baxter State Park.',
  },
  {
    id: 'triple-crown',
    question: 'Hiking’s Triple Crown is the A.T., the PCT and which other trail?',
    answers: ['The Continental Divide Trail', 'The John Muir Trail', 'The Colorado Trail'],
    why: 'Together the three cover close to 8,000 miles.',
  },
  {
    id: 'pct-states',
    question: 'The Pacific Crest Trail runs from Mexico to Canada through which states?',
    answers: ['California, Oregon and Washington', 'California and Nevada', 'Arizona, Utah and Idaho'],
    why: 'About 2,650 miles along the Sierra Nevada and the Cascades.',
  },
  {
    id: 'jmt-end',
    question: 'The John Muir Trail runs from Yosemite Valley to the top of which mountain?',
    answers: ['Mount Whitney', 'Half Dome', 'Mount Shasta'],
    why: 'About 211 miles through the High Sierra, finishing on the highest summit in the lower 48.',
  },
  {
    id: 'half-dome',
    question: 'What do you need to climb Half Dome’s cables in season?',
    answers: ['A permit', 'A rope and harness', 'Nothing'],
    why: 'Yosemite runs a lottery for daily permits while the cables are up, roughly late May to October.',
  },
  {
    id: 'yellowstone-first',
    question: 'Which was the first national park?',
    answers: ['Yellowstone', 'Yosemite', 'Great Smoky Mountains'],
    why: 'Congress made Yellowstone a national park in 1872.',
  },
  {
    id: 'bear-distance',
    question: 'In Yellowstone, how far must you stay from bears?',
    answers: ['100 yards', '25 feet', '10 yards'],
    why: 'And at least 25 yards from other animals, like bison and elk. A football field is about 100 yards.',
  },
  {
    id: 'black-bear',
    question: 'A black bear is walking toward you. What do you do?',
    answers: ['Stand tall, talk firmly, back away slowly', 'Run downhill', 'Climb a tree'],
    why: 'Running can trigger a chase, and black bears climb well. Make yourself big and give it room to leave.',
  },
  {
    id: 'storms',
    question: 'In the Rockies in summer, when do thunderstorms usually build?',
    answers: ['In the afternoon', 'At dawn', 'Around midnight'],
    why: 'That’s why people start high climbs early and aim to be off summits and ridges by early afternoon.',
  },
  {
    id: 'boil',
    question: 'How long should you boil water to make it safe to drink?',
    answers: ['1 minute at a rolling boil', '10 seconds', '20 minutes'],
    why: 'One minute is enough at most elevations. Above about 6,500 ft, the CDC says boil for 3.',
  },
  {
    id: 'cotton',
    question: 'Why do hikers say “cotton kills”?',
    answers: ['Wet cotton stops keeping you warm', 'It’s flammable', 'It attracts bugs'],
    why: 'Cotton soaks up sweat and rain and dries slowly. Wool and synthetics keep insulating when damp.',
  },
  {
    id: 'hypothermia',
    question: 'Can you get hypothermia at 50°F?',
    answers: ['Yes, if you’re wet and in the wind', 'No, it has to be below freezing', 'Only at high altitude'],
    why: 'Many hypothermia cases happen between 30°F and 50°F, when rain and wind pull heat out faster than you make it.',
  },
  {
    id: 'ams',
    question: 'Altitude sickness most often starts above about what elevation?',
    answers: ['8,000 ft', '3,000 ft', '18,000 ft'],
    why: 'Headache, nausea and fatigue are the early signs. Going down is the most reliable cure.',
  },
  {
    id: 'treeline',
    question: 'In Colorado, about where is treeline?',
    answers: ['About 11,500 ft', 'About 6,000 ft', 'About 16,000 ft'],
    why: 'Above it, trees can’t grow, so there’s no shelter from wind or lightning.',
  },
  {
    id: 'contours-close',
    question: 'On a topo map, contour lines packed close together mean…',
    answers: ['Steep ground', 'Flat ground', 'A trail'],
    why: 'Each line is a step in elevation. The closer they are, the more you climb per step.',
  },
  {
    id: 'contours-v',
    question: 'Where contour lines cross a stream, which way do the Vs point?',
    answers: ['Upstream', 'Downstream', 'North'],
    why: 'Water carves its valley into the slope, so the Vs point uphill, toward where the stream comes from.',
  },
  {
    id: 'false-summit',
    question: 'What’s a false summit?',
    answers: ['A rise that looks like the top but isn’t', 'A peak with no trail', 'A summit sign in the wrong spot'],
    why: 'From below, a nearer shoulder can hide the true top. Your map, or Apex’s profile, tells you how much is left.',
  },
  {
    id: 'saddle',
    question: 'What’s a saddle, or col?',
    answers: ['The low point on a ridge between two peaks', 'A flat summit', 'A kind of switchback'],
    why: 'Trails often cross ridges at saddles, since they’re the lowest way over.',
  },
  {
    id: 'scree-talus',
    question: 'What’s the difference between scree and talus?',
    answers: ['Scree is small, loose rock; talus is big boulders', 'They’re the same thing', 'Talus is sand'],
    why: 'Scree slides under your feet. Talus is boulder-hopping, where the rocks can shift or wobble.',
  },
  {
    id: 'class-3',
    question: 'In the Yosemite Decimal System, what’s Class 3?',
    answers: ['Scrambling with your hands', 'A flat walk', 'Roped technical climbing'],
    why: 'Class 1 is hiking, 2 is easy scrambling, 3 needs hands, 4 often gets a rope, and 5 is technical climbing.',
  },
  {
    id: 'mt-washington',
    question: 'Mount Washington, New Hampshire, once recorded a wind gust of…',
    answers: ['231 mph', '95 mph', '400 mph'],
    why: 'In April 1934. It stood as the world record for 62 years, and the summit’s weather still turns hikers back.',
  },
  {
    id: 'grand-canyon',
    question: 'From the Grand Canyon’s South Rim, about how far do you drop to the Colorado River?',
    answers: ['Nearly a mile', 'About 1,000 ft', 'About 3 miles'],
    why: 'Around 4,500 ft. Going down is optional; coming back up isn’t, so turn around with plenty of water and daylight.',
  },
  {
    id: 'fkt',
    question: 'What does FKT stand for?',
    answers: ['Fastest Known Time', 'Full Kit Trek', 'First Known Trail'],
    why: 'The fastest anyone is known to have done a route, with GPS proof. Apex is happy with slower ones.',
  },
  {
    id: 'thru-hike',
    question: 'What’s a thru-hike?',
    answers: ['A long trail end to end in one go', 'A loop that ends where it started', 'A hike through a tunnel'],
    why: 'Hikers who finish a long trail in pieces over years are section hikers.',
  },
  {
    id: 'poles',
    question: 'Where do trekking poles help most?',
    answers: ['Going downhill, easing your knees', 'On flat pavement', 'Only in snow'],
    why: 'They take some of each step’s load off your legs, which your knees feel most on long descents.',
  },
  {
    id: 'sun-fingers',
    question: 'At arm’s length, each finger between the sun and the horizon is about how much daylight?',
    answers: ['15 minutes', '1 minute', '2 hours'],
    why: 'A rough rule, and less accurate far from the equator, but handy for knowing when to turn around.',
  },
  {
    id: 'water-hour',
    question: 'In mild weather, about how much water do hikers drink per hour?',
    answers: ['About half a liter', 'A sip', 'Three liters'],
    why: 'More in heat or on steep climbs. Drink before you’re thirsty, and carry extra.',
  },
];

const DAY_MS = 86_400_000;

/** Days since 2024-01-01 in local time. */
export function dayNumber(at: Date = new Date()): number {
  return Math.round((new Date(at.getFullYear(), at.getMonth(), at.getDate()).getTime() - new Date(2024, 0, 1).getTime()) / DAY_MS);
}

/** Today's question: everyone gets the same one, in a fixed shuffled order. */
export function questionForDay(day: number): TrailQuestion {
  const n = TRAIL_QUESTIONS.length;
  // 17 is coprime with the list length, so every question comes up once per cycle.
  const step = n % 17 === 0 ? 1 : 17;
  return TRAIL_QUESTIONS[(((day * step) % n) + n) % n]!;
}

/** The three answers in display order, and which one is right. Fixed per question and day. */
export function shuffledAnswers(q: TrailQuestion, day: number): { answers: string[]; correct: number } {
  const correctSlot = (((day + q.id.length) % 3) + 3) % 3;
  const wrong = [q.answers[1], q.answers[2]];
  if (day % 2 === 0) wrong.reverse();
  const answers = [...wrong];
  answers.splice(correctSlot, 0, q.answers[0]);
  return { answers, correct: correctSlot };
}

export interface IqState {
  /** day number → the answer index picked */
  picks: Record<string, number>;
  /** day number → whether it was right */
  right: Record<string, boolean>;
}

/** Days in a row answered, ending today (or yesterday, if today isn't answered yet). */
export function answerStreak(state: IqState, today: number): number {
  let day = state.picks[String(today)] !== undefined ? today : today - 1;
  let n = 0;
  while (state.picks[String(day)] !== undefined) {
    n += 1;
    day -= 1;
  }
  return n;
}

/** Right answers over all time. */
export function rightCount(state: IqState): number {
  return Object.values(state.right).filter(Boolean).length;
}
