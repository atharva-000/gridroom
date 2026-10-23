import type { Scenario } from '../engine/contract';
export type Action = 'toggleSolar' | 'toggleEV';
export type GoalType = 'maxSolar' | 'fixLowWithSolar' | 'fixLowWithFewestDelays';
export interface Level {
  id: number; name: string; lesson: string; hint: string;
  scenario: Scenario; segmentLengthM: number; numHomes: number;
  startSolar: number[]; startEV: number[]; action: Action;
  smartInvertersAllowed: boolean; goal: GoalType; goalText: string;
  stars: [number, number, number];
}
export const LEVELS: Level[] = [
  { id: 1, name: 'Sunny Spring Noon', lesson: 'Houses close to the transformer can take more solar than houses at the end of the street.', hint: 'Try putting solar on the houses nearest the transformer first.', scenario: 'spring', segmentLengthM: 40, numHomes: 25, startSolar: [], startEV: [], action: 'toggleSolar', smartInvertersAllowed: false, goal: 'maxSolar', goalText: 'Put solar on at least 10 homes with no house too high.', stars: [10, 14, 17] },
  { id: 2, name: 'The Long Street', lesson: 'Longer wires mean bigger voltage rise, so long streets fill up faster.', hint: 'Same idea as Level 1, but with less room. Start near the transformer.', scenario: 'spring', segmentLengthM: 60, numHomes: 25, startSolar: [], startEV: [], action: 'toggleSolar', smartInvertersAllowed: false, goal: 'maxSolar', goalText: 'Put solar on at least 7 homes with no house too high.', stars: [7, 11, 14] },
  { id: 3, name: 'Heat Wave Afternoon', lesson: 'When everyone runs AC, voltage sags at the end of the street. Solar at the far end props it back up.', hint: 'Where is the voltage lowest? Put solar there.', scenario: 'heatwave', segmentLengthM: 60, numHomes: 25, startSolar: [], startEV: [], action: 'toggleSolar', smartInvertersAllowed: false, goal: 'fixLowWithSolar', goalText: 'Fix every house that is too low, using as few solar homes as possible.', stars: [25, 7, 5] },
  { id: 4, name: 'Evening Rush', lesson: 'Electric cars charging at once can drag voltage down. Delaying a few to late night fixes it.', hint: 'Which cars are farthest from the transformer?', scenario: 'evening', segmentLengthM: 40, numHomes: 25, startSolar: [], startEV: [3, 7, 11, 15, 18, 20, 22, 24], action: 'toggleEV', smartInvertersAllowed: false, goal: 'fixLowWithFewestDelays', goalText: 'Tap cars to delay charging until 11 PM. Fix every low house with as few delays as possible.', stars: [4, 3, 2] },
  { id: 5, name: 'Smart Inverters', lesson: 'Smart inverters absorb a little reactive power to pull voltage down, so more homes can go solar on the same wires.', hint: "You can't reach the goal with the switch off. Turn on smart inverters.", scenario: 'spring', segmentLengthM: 40, numHomes: 25, startSolar: [], startEV: [], action: 'toggleSolar', smartInvertersAllowed: true, goal: 'maxSolar', goalText: 'Put solar on at least 19 homes with no house too high.', stars: [19, 20, 21] },
];
