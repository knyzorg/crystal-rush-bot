# Crystal Rush Bot

My Crystal Rush bot for CodinGame's Crystal Rush

## Features

 - Adverserial mining priorization scheme
   - Prioritize unmined, ore-rich cells
   - Place traps whenever possible
   - The enemy bot has no means to detect with certainty where the bombs are, while friendlies do
   - This strategy helps cut off the same supply of ore to the enemy while maintaining our own
 - Trap Detection
   - Rich heuristic-based analysis for detecting enemy traps
 - Greedy Kamikaze
   - Sets off traps when the gains outweigh the losses
 - Opportunistic Kamikaze
   - If the bot is empty-handed and has the opportunity to destroy an enemy bot which is carrying a crystal, it will do so
  
## Commit History

The commit history is not very meaningful. It is a copy-paste of the submission history from the CodinGame IDE, so there we're any commit messages. I tried annonating them after-the-fact for this repository.

Some of the commits were me messing around, or breaking syntax and are consequently excluded from the history.
