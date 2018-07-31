const { spawn } = require('child_process');
const http = require('http');
const events = require('events');
const webpack = require('webpack');
const _ = require('lodash');
const path = require('path');
const webpackConfig = require(path.resolve(process.cwd(), './webpack.config'));
const Logger = require('bunyan');
const colors = require('colors');

const DATASTORE_PORT = 9000;

const levelMap = {
  info: colors.white,
  error: colors.red,
  warn: colors.yellow,
};

const componentColors = {
  server: colors.blue,
  webpack: colors.magenta,
  datastore: colors.cyan,
  dsui: colors.green,
};

class BunyanStream {
  write(rec) {
    const level = Logger.nameFromLevel[rec.level];
    const time = rec.time instanceof Date ? rec.time.toISOString() : rec.time;
    const formattedTime = `[${time.substr(11, 12)}]`.white;
    const message = rec.msg.replace(/\n$/, '');

    const levelColor = levelMap[level] || colors.white;
    const component = rec.component || rec.name;
    const service = rec.service ? `/${rec.service}` : '';
    const componentColor = componentColors[component] || colors.white;
    console.log(
      `${formattedTime} ${componentColor(component + service)} ${levelColor(
        level + ':',
      )} ${message}`,
    );
  }
}

const { logger, loggingStream } = setupLogging();

const { buildEvents, stopWebpack } = setupWebpack(logger);

const { stopServer, startServer } = setupServer(
  logger,
  loggingStream,
  buildEvents,
);

const { stopDatastore, startDatastore } = setupDatastore(logger, buildEvents);
const { startDsui, stopDsui } = setupDsui(logger);

buildEvents.once('reload', startServer);
startDatastore();
startDsui();

// Handle process stop
process.on('SIGINT', async function() {
  logger.info('Caught interrupt signal');

  await Promise.all([stopWebpack(), stopDatastore(), stopDsui(), stopServer()]);

  logger.info('Shutting down');
  process.exit();
});

function setupLogging() {
  const loggingStream = new BunyanStream();

  // Logging
  const logger = new Logger({
    name: 'Development Server',
    streams: [
      {
        level: 'info',
        stream: loggingStream,
        type: 'raw',
      },
    ],
  });

  return {
    loggingStream,
    logger,
  };
}

function setupWebpack(logger) {
  const webpackInstance = webpack(webpackConfig);

  const eventEmitter = new events.EventEmitter();

  const webpackLogger = logger.child({
    component: 'webpack',
  });

  // Webpack
  webpackLogger.info('Starting up compiler');
  const webpackWatcher = webpackInstance.watch(
    {
      ignored: ['node_modules', 'dist'],
    },
    (err, stats) => {
      if (err) {
        webpackLogger.error('Error', err);
      } else {
        const info = stats.toJson();

        if (stats.hasErrors()) {
          info.errors.forEach(error => {
            webpackLogger.error(error);
          });
          return;
        }

        if (stats.hasWarnings()) {
          info.warning.forEach(warning => {
            webpackLogger.warning(warning);
          });
          return;
        }

        webpackLogger.info('Rebuilt server - sending trigger to restart');
        eventEmitter.emit('reload', { hash: stats.hash });
      }
    },
  );

  return {
    buildEvents: eventEmitter,
    stopWebpack: () => {
      return new Promise(resolve => {
        webpackLogger.trace('Killing webpack');

        webpackWatcher.close(() => resolve());
      });
    },
  };
}

function setupServer(logger, loggingStream, buildEvents) {
  // Server
  const serverLogger = logger.child({
    component: 'server',
  });
  let child;
  const startServer = () => {
    child = spawn('node', ['./dist/server.js', '--debug-brk']);

    child.stdout.on('data', data => {
      const string = data.toString('utf8').split('\n');

      string.forEach(line => {
        if (line === '') {
          return;
        }

        try {
          const payload = JSON.parse(line);
          loggingStream.write({
            ...payload,
            component: 'server',
          });
        } catch (ex) {
          serverLogger.info(line);
        }
      });
    });

    child.stderr.on('data', data => {
      const string = data.toString('utf8').split('\n');

      string.forEach(line => {
        if (line === '') {
          return;
        }

        try {
          const payload = JSON.parse(line);
          loggingStream.write({
            ...payload,
            component: 'server',
          });
        } catch (ex) {
          serverLogger.error(line);
        }
      });
    });

    const hotReload = () => {
      child.kill('SIGUSR2');
    };

    buildEvents.on('reload', hotReload);

    child.once('close', () => {
      child = undefined;
      serverLogger.warn(
        'Server crashed waiting for restart trigger to restart',
      );
      buildEvents.removeListener('reload', hotReload);
      buildEvents.once('reload', startServer);
    });
  };

  return {
    stopServer: () => {
      return new Promise(resolve => {
        if (child) {
          serverLogger.trace('Killing server');

          child.kill('SIGINT');

          child.once('close', () => {
            serverLogger.info('Server successfully shutdown');
            resolve();
          });
        } else {
          resolve();
        }
      });
    },
    startServer,
  };
}

function setupDsui(logger) {
  const dsuiLogger = logger.child({ component: 'dsui' });
  let dsui;
  const startDsui = () => {
    // poll the status URL until the datastore emulator is ready
    dsuiLogger.info('Waiting for Datastore emulator to start');
    const timeout = setInterval(() => {
      let body = '';
      http.get(
        {
          hostname: 'localhost',
          port: DATASTORE_PORT,
          path: '/',
          agent: false,
        },
        res => {
          res.on('data', data => {
            body += data;
          });
          res.on('end', () => {
            if (res.statusCode == 200) {
              dsuiLogger.info('Datastore emulator is ready, starting DSUI');
              clearInterval(timeout);
              const gcloud = spawn('gcloud', [
                'beta',
                'emulators',
                'datastore',
                'env-init',
                '--format=json',
              ]);
              gcloud.stdout.on('data', data => {
                const datastoreConfig = JSON.parse(data);
                _.forEach(datastoreConfig, (value, key) => {
                  process.env[key] = value;
                });
              });

              gcloud.once('close', () => {
                dsui = spawn('npm', ['run', 'dsui']);
                dsui.stdout.on('data', dsuiData => {
                  const string = dsuiData.toString('utf8');
                  dsuiLogger.info(string);
                });

                dsui.stderr.on('data', dsuiData => {
                  const string = dsuiData.toString('utf8');
                  dsuiLogger.error(string);
                });
              });
            }
          });
        },
      );
    }, 2000);
  };

  const stopDsui = () => {
    return new Promise(resolve => {
      if (dsui) {
        dsuiLogger.info('Killing DSUI');
        dsui.kill('SIGINT');
        dsui.once('close', () => {
          logger.info('DSUI successfully shutdown');
          resolve();
        });
      } else {
        resolve();
      }
    });
  };

  return { startDsui, stopDsui };
}

function setupDatastore(logger, buildEvents) {
  const datastoreLogger = logger.child({
    component: 'datastore',
  });
  let datastore;
  const startDatastore = () => {
    datastoreLogger.info('Starting datastore emulator');
    datastore = spawn('gcloud', [
      'beta',
      'emulators',
      'datastore',
      'start',
      `--host-port=localhost:${DATASTORE_PORT}`,
    ]);

    datastore.stdout.on('data', data => {
      let string = data.toString('utf8');
      if (string.startsWith('[datastore] ')) {
        string = string.substring(12);
      }
      if (string !== '\n') {
        datastoreLogger.info(string);
      }
    });

    datastore.stderr.on('data', data => {
      let string = data.toString('utf8');
      if (string.startsWith('[datastore] ')) {
        string = string.substring(12);
      }
      if (string !== '\n') {
        datastoreLogger.info(string);
      }
    });

    datastore.once('close', () => {
      datastore = undefined;
      datastoreLogger.warn('Datastore crashed will restart after changes');
      buildEvents.once('reload', startDatastore);
    });
  };

  return {
    stopDatastore: () => {
      return new Promise(resolve => {
        if (datastore) {
          datastoreLogger.trace('Killing datastore');

          datastore.kill('SIGINT');

          datastore.once('close', () => {
            logger.info('Datastore successfully shutdown');
            resolve();
          });
        } else {
          resolve();
        }
      });
    },
    startDatastore,
  };
}
