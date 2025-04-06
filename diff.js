import {diffChars} from 'diff';
import chalk from 'chalk';

const one = 'beep boop bluh';
const other = 'beep boob blah';

const diff = diffChars(one, other);

diff.forEach((part) => {
  // green for additions, red for deletions
  let text = part.added ? chalk.bgRgb(139, 0, 0)(part.value) :
             part.removed ? chalk.bgRgb(0, 100, 0)(part.value) :
                            part.value;
  process.stderr.write(text);
});

console.log();
