# Logo and Team Data Sources

This prototype stores local image assets so the page and generated poster work reliably offline and avoid canvas cross-origin failures.

Team identity and event data were compiled from official/public sources:

- NBA Finals schedule and matchup: https://www.nba.com/news/2026-nba-finals-schedule
- VALORANT Masters London teams and logos: https://liquipedia.net/valorant/VCT/2026/Stage_2/Masters
- IEM Cologne Major 2026 teams and logos: https://liquipedia.net/counterstrike/Intel_Extreme_Masters/2026/Cologne
- IEM Cologne Major 2026 team count cross-check: https://www.hltv.org/
- FIFA World Cup 2026 tournament information: https://www.fifa.com/en/tournaments/mens/worldcup/canadamexicousa2026

Image sources used by the local assets:

- NBA team logos: ESPN public team logo CDN.
- World Cup national teams: public flag images from FlagCDN.
- Esports team icons: downloaded from the corresponding Liquipedia tournament pages with `scripts/sync-esports-assets.mjs`.
- Event backgrounds: NBA.com Finals schedule art, VALORANT Esports Masters London art, ESL FACEIT Group IEM Cologne Major art, and FIFA Store World Cup 2026 poster art.

These assets are for a personal prototype. Use licensed official artwork before publishing commercially.
