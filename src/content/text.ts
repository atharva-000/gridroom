export const TAGLINE = "Why can't every house go solar? Run the grid, then check a real street.";

export const DISCLAIMER =
  'GridRoom is a learning tool built on a model, not a utility measurement or advice about buying solar. ' +
  'Not affiliated with PSE&G, JCP&L, the NJ Board of Public Utilities, or the U.S. House of Representatives.';

export const INTRO_CARDS = [
  {
    title: 'Voltage is like water pressure',
    body: 'Power lines work a bit like water pipes. Power comes into a street and flows to each house. Voltage is like the water pressure. It has to stay in a safe range: not too low and not too high.',
  },
  {
    title: 'When everyone has solar',
    body: "At noon, solar panels often make more power than a home uses. The extra flows back up the street and pushes the pressure up, most of all at the far end. Above the safe limit, equipment can be damaged, so the utility can't connect more solar there. How much solar a street can safely take is its hosting capacity.",
  },
  {
    title: 'Smart inverters',
    body: 'Every solar system has an inverter, a box that turns solar power into the kind a home uses. Smart inverters can also nudge voltage down when it gets high, using reactive power. That lets more homes go solar on the same wires.',
  },
];

export const PRIVACY =
  "The address is sent only to OpenStreetMap's free search service to find the street. GridRoom has no server and doesn't save it.";

export const MAPS_EXPLAINED =
  "New Jersey utilities publish maps of how much more solar their circuits can take. On PSE&G's map, red means less than 100 kW of room, yellow 100 to 1,000 kW, and green more than 1,000 kW. JCP&L's map shows an estimated number at each transformer. That room is shared by every street on the circuit. GridRoom uses it to estimate how full the wires already are before power reaches the street.";

export const MEANING = {
  fits: 'In this model, the street has room for solar on this home with the neighbors marked. The utility still makes the real decision in its own review when an installer applies.',
  smartFixes: 'In this model, the far end of the street would go too high, but smart inverters bring it back into range. Smart inverter settings are part of what utilities review.',
  full: 'In this model, the street is close to its limit. In real life that can mean the utility asks for upgrades before approving more solar.',
  unknown: "The result depends a lot on how full the circuit already is. Checking the utility's map narrows it down.",
  noHome: 'Mark a home in the "Check the map" step to see whether adding solar there fits.',
};

export const LIMITATIONS = [
  "The wires, transformer and loads are representative values. Utilities don't publish real circuit data.",
  "The utility map's room is shared by the whole circuit, not just this street.",
  'My Street models a sunny spring noon and checks voltage limits only.',
  'OpenStreetMap can miss or mislabel buildings.',
];

export const SOURCES = [
  { label: 'NJ Board of Public Utilities, 2026 grid modernization RFI', url: 'https://www.nj.gov/bpu/pdf/publicnotice/RFI%20Notice-2026.pdf' },
  { label: 'PSE&G Solar Power Suitability Map', url: 'https://nj.pseg.com/saveenergyandmoney/solarandrenewableenergy/solarpowersustanibility' },
  { label: 'JCP&L Solar Accommodation Map', url: 'https://firstenergycorp.com/feconnect/newjersey/solar-accommodation-map.html' },
  { label: 'pandapower', url: 'https://www.pandapower.org/' },
  { label: 'OpenStreetMap copyright and license', url: 'https://www.openstreetmap.org/copyright' },
];

export const PSEG_MAP_URL = SOURCES[1].url;
export const JCPL_MAP_URL = SOURCES[2].url;
