/**
 * App – root component that switches between screens based on game state.
 */

import "pepjs";
import { useGameStore } from "./store/gameStore";
import MainMenu from "./screens/MainMenu";
import GameScreen from "./screens/GameScreen";
import SeasonHub from "./screens/SeasonHub";
import RecruitingScreen from "./screens/RecruitingScreen";

export default function App() {
  const screen = useGameStore((s) => s.screen);

  switch (screen) {
    case "menu":
      return <MainMenu />;
    case "game":
      return <GameScreen />;
    case "season":
      return <SeasonHub />;
    case "recruiting":
      return <RecruitingScreen />;
    default:
      return <MainMenu />;
  }
}