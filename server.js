#!/usr/bin/env node

const program = require('commander');

program
  .version(require('./package').version, '-v, --version')
  .command('start', 'start the development server', { isDefault: true })
  .command('system', 'regenerate the system secret for an environment')
  .alias('s')
  .parse(process.argv);
