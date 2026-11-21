/**
 * Route notes for the catalog trails, keyed by the catalog `id`
 * (data/catalogTrails.json). Every claim is checkable on the managing agency's
 * page in the comment above its entry. Anything we couldn't verify there is
 * left out, so some entries are empty.
 *
 * Flags come only from this fixed set.
 */
export const TRAIL_FLAGS = [
  'Permit required',
  'Chains section',
  'Seasonal closure',
  'Exposure',
  'Water crossing',
  'Shuttle',
] as const;

export type TrailFlag = (typeof TRAIL_FLAGS)[number];

export interface TrailNote {
  /** One sentence, 25 words or fewer. */
  route?: string;
  flags?: TrailFlag[];
}

export const TRAIL_NOTES: Record<string, TrailNote> = {
  // Angels Landing
  // https://www.nps.gov/thingstodo/hike-angels-landing.htm
  // https://www.nps.gov/zion/planyourvisit/angels-landing-hiking-permits.htm
  '63cfe6e0-2d47-4a81-b087-a146d1fd9a4f': {
    route: 'From The Grotto up the sandy West Rim Trail to Scout Lookout, then a steep, narrow ridge with chains to the summit.',
    flags: ['Permit required', 'Chains section', 'Exposure'],
  },

  // Colchuck Lake
  // https://www.fs.usda.gov/r06/okanogan-wenatchee/recreation/stuart-lake-trailhead
  // https://fs.usda.gov/r06/okanogan-wenatchee/recreation/enchantments
  '79f6296e-bccc-4b95-ba71-13d0bba7f9af': {
    route: 'From the Stuart Lake Trailhead on Stuart Lake Trail #1599, then the Colchuck Lake Trail #1599A to the lake.',
    flags: ['Permit required'],
  },

  // Delicate Arch
  // https://www.nps.gov/arch/planyourvisit/delicate-arch.htm
  '51305ce6-7964-4265-8c8a-21acb430e9d3': {
    route: 'A steadily uphill trail past the Wolfe Ranch cabin and a wall of Ute petroglyphs to the arch.',
  },

  // Emerald Lake
  // https://www.nps.gov/romo/planyourvisit/exploring-the-bear-lake-road-corridor.htm
  '5cca20ac-16a2-46b9-b597-30a29c08c477': {
    route: 'From the Bear Lake Trailhead, 1.7 miles and 771 feet up to Emerald Lake.',
  },

  // Franconia Ridge Loop
  // No managing-agency page with route details found; left empty.
  'dd9d8995-c64d-49ee-a90c-83f7394b2fc0': {},

  // Half Dome via the Mist Trail
  // https://www.nps.gov/yose/planyourvisit/halfdome.htm
  'cbc31687-3c8f-47c0-9e80-29a1d9f47eea': {
    route: 'From Happy Isles past Vernal and Nevada falls and Little Yosemite Valley, then two cables up the last 400 feet.',
    flags: ['Permit required'],
  },

  // Lake Serene
  // https://www.fs.usda.gov/r06/mbs/recreation/lake-serene-trailhead
  '107ec6a2-9f2b-4a75-8629-9c0c215e5f67': {
    route: 'From the Lake Serene Trailhead on Lake Serene Trail 1068, which also gives access to Bridal Veil Falls.',
  },

  // Lands End Trail
  // https://www.nps.gov/goga/planyourvisit/landsend.htm
  '24880992-d9c5-4c49-9dbe-9f0876f710ef': {
    route: 'Along rocky cliffs above the ocean past the Sutro Baths ruins, with views of the shore, headlands and Golden Gate.',
  },

  // Mailbox Peak
  // https://dnr.wa.gov/node/557
  '48bfae60-c5b5-4265-bf59-3f32312ff347': {
    route: 'A switchback trail off SE Middle Fork Road with views of the Cascade Range and the Snoqualmie Valley.',
  },

  // Mission Peak
  // https://ebparks.org/maps/mission-peak
  '6f08aebe-511b-4713-8956-dfa86e049fdd': {
    route: 'From the east end of Stanford Avenue off Mission Boulevard up to the summit of Mission Peak.',
  },

  // Mount Bierstadt
  // https://www.fs.usda.gov/r02/psicc/recreation/trails/mount-bierstadt-trail-711
  'e43b8a50-8d6f-4673-b606-2a96b8c8c209': {
    route: 'From Guanella Pass on a boardwalk over the willow wetlands to Scott Gomer Creek, then up the rocky west ridge.',
    flags: ['Seasonal closure'],
  },

  // Mount Monadnock
  // https://www.nhstateparks.org/visit/state-parks/monadnock-state-park
  'f61e0662-637d-4f35-997f-4f54f76001a7': {
    route: "From the state park headquarters, the most direct route to Monadnock's bare, rocky 3,165-foot summit.",
  },

  // Mount Si
  // https://dnr.wa.gov/MountSi
  '347521d0-cdd1-4515-8d27-14f2c79cd75f': {
    route: 'From the trailhead on Mt. Si Road up the renovated Mount Si Trail, past the Snag Flats display two miles up.',
  },

  // Mount Tallac
  // https://www.fs.usda.gov/r05/laketahoebasin/recreation/mt-tallac-trailhead
  // https://fs.usda.gov/r05/eldorado/wilderness/desolation-wilderness (day use permits required)
  '08c7ee33-4b58-403e-ae16-e16d1001a090': {
    route: 'Past Floating Island and Cathedral lakes, then steep and strenuous up the front face of the mountain.',
    flags: ['Permit required'],
  },

  // Mount Washington via Tuckerman Ravine
  // https://fs.usda.gov/r09/whitemountain/recreation/hermit-lake-shelters
  'd9076369-f466-4770-95f0-2cdfbd60fa96': {
    route: 'From Pinkham Notch up the Tuckerman Ravine Trail, past Hermit Lake at 2.4 miles, into the ravine.',
  },

  // Navajo Loop and Queen's Garden
  // https://home.nps.gov/brca/planyourvisit/qgnavajocombo.htm
  'a2f99a1d-e220-4f2c-bc23-855786ef9b8e': {
    route: "Down Queen's Garden, up the Navajo Loop to Sunset Point; its Wall Street side closes in freeze-thaw months, Two Bridges stays open.",
  },

  // Quandary Peak
  // https://www.fs.usda.gov/r02/whiteriver/recreation/quandary-peak-th-47
  '8cfe7985-fe7d-40be-9039-c103334c60f4': {
    route: 'A quarter mile up McCullough Gulch Road from the lot, then above timberline to the summit.',
  },

  // Rattlesnake Ledge
  // https://www.seattle.gov/utilities/environment-and-conservation/our-watersheds/cedar-river-watershed/rattlesnake-ledge
  'da0b97be-7935-4c25-b3f3-89e4eb5c2ce3': {
    route: 'Two miles up to a ledge with views of the Cedar River watershed, Rattlesnake Lake and Chester Morse Lake.',
  },

  // Royal Arch
  // https://bouldercolorado.gov/trail/royal-arch
  '4296f0ba-5905-4cef-83cd-743075740105': {
    route: 'From the Chautauqua Trailhead via Bluebell Road, then loose rock, tight switchbacks and large steps to the arch.',
  },

  // Sky Pond
  // https://www.nps.gov/romo/planyourvisit/exploring-the-bear-lake-road-corridor.htm
  // https://www.nps.gov/romo/learn/news/two-incidents-in-loch-vale-area-early-this-week-related-to-falls-on-snow.htm
  '33b2c0f7-6a3d-4302-bb8e-0cc5d4089928': {
    route: 'From the Glacier Gorge Trailhead, 4.2 miles and 1,726 feet up to Sky Pond, beyond Loch Vale.',
  },

  // Skyline Trail
  // https://www.nps.gov/mora/planyourvisit/skyline-trail.htm
  'c5dcc250-3a14-40e5-87d0-d596668f602b': {
    route: 'From Paradise up to Panorama Point, past the Stevens-Van Trump Memorial, then down Paradise Valley by Myrtle Falls.',
  },

  // Upper Yosemite Fall
  // https://www.nps.gov/yose/planyourvisit/yosemitefallstrail.htm
  '143e21c0-a318-4e9b-aa85-7b2254541565': {
    route: 'From Camp 4, dozens of switchbacks to Columbia Rock, then a steep, rocky climb to the top of the fall.',
  },
};

/** Notes for a trail, or `{}` when there are none. */
export function trailNotes(id: string): TrailNote {
  return TRAIL_NOTES[id] ?? {};
}
