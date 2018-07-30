const fs = require('fs');
const fetch = require('node-fetch');
const jwt = require('jsonwebtoken');
const program = require('commander');
const colors = require('colors');
const crypto = require('crypto');
const path = require('path');
const { Spinner } = require('cli-spinner');

const generateKey = (bits) => crypto.randomBytes(Math.ceil(bits / 8)).toString('base64');
const keySize = 512;

function environmentFile(environment) {
  return `./config/${environment}.json`;
}

program
  .command('call <api>')
  .alias('c')
  .option('--env [environment]', 'The environment to run, defaults to development', 'development')
  .option('-V --verbose', 'Run in verbose mode')
  .action(async (api, {env, verbose}) => {
    const {
      host,
      systemSecret
    } = JSON.parse(fs.readFileSync(environmentFile(env)).toString());

    console.log(`Triggering api ${colors.cyan(host)}${colors.cyan(api)} in environment ${colors.green(env)}`);

    const key = Buffer.from(systemSecret, 'base64');

    try {
      const spinner = new Spinner('processing.. %s');
      spinner.setSpinnerString(18);
      spinner.start();

      const result = await fetch(`${host}${api}`, {
        method: 'POST',
        headers: {
          authorization: `jwt ${jwt.sign({}, key, { algorithm: 'HS256', expiresIn: '5 min' })}`
        }
      });

      spinner.stop(true);

      if (!result.ok) {
        console.error(colors.red(`[${result.status}]`), await result.text());
      } else {
        console.log(colors.green(`[${result.status}]`), await result.text());
      }
    } catch (ex) {
      if (verbose) {
        console.error(colors.red(ex.message), ex);
      } else {
        console.error(colors.red(ex.message));
      }
    }
  });

program
  .command('generate')
  .alias('g')
  .option('--env [environment]', 'The environment to run, defaults to development', 'development')
  .action(({ env }) => {
    console.log(`Generating new secret for environment ${colors.green(env)}`)

    const config = JSON.parse(fs.readFileSync(environmentFile(env)).toString());

    config.systemSecret = generateKey(keySize);

    fs.writeFileSync(environmentFile(env), JSON.stringify(config, null, 4));
  });

program.parse(process.argv);
