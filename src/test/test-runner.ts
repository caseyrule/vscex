import * as path from 'path';
import * as glob from 'glob';
import * as tty from 'tty';
import * as sourceMapSupport from 'source-map-support';
import * as Mocha from 'mocha';

// Linux: prevent a weird NPE when mocha on Linux requires the window size from the TTY
// Since we are not running in a tty environment, we just implement the method statically
if (!(<any>tty).getWindowSize) {
  (<any>tty).getWindowSize = () => {
    return [80, 75];
  };
}

var mocha: Mocha;

export = {
  configure: (
    opts = {
      ui: 'tdd',
      reporterOptions: {
        useColors: true
      }
    }
  ) => {
    mocha = new Mocha(opts);
  },

  run: (testsRoot, clb) => {
    // Enable source map support
    sourceMapSupport.install();
    // Glob test files
    glob('**/**.test.js', { cwd: testsRoot }, (error, files) => {
      if (error) {
        return clb(error);
      }
      try {
        // Fill into Mocha
        files.forEach(f => {
          return this.mocha.addFile(path.join(testsRoot, f));
        });
        // Run the tests
        this.mocha.run(failures => {
          clb(null, failures);
        });
      } catch (error) {
        return clb(error);
      }
    });
  }
};
