# Team Data

Place team JSON data files here.

## Format (team_<id>.json)

```json
{
  "id": "home",
  "name": "State Bulldogs",
  "abbreviation": "STB",
  "primaryColor": "#1e40af",
  "secondaryColor": "#ffffff",
  "arena": "Memorial Arena",
  "city": "Springfield",
  "conference": "ACC"
}
```

## Current implementation

Teams are hard-coded in `src/game/data/defaults.ts`.
Move to JSON files here as the dynasty/recruiting system is built out.
