module.exports = function(grunt) {

  // Project configuration.
  grunt.initConfig({
    pkg: grunt.file.readJSON('package.json'),
    clean: {
      dist: ["dist"]
    },
    exec: {
      tsc_package: 'node_modules/typescript/bin/tsc -p ./source/',
      npm_pack: {
        cmd: 'npm pack ./package',
        cwd: 'dist/'
      },
      tns_install: {
        cmd: 'tns install',
        cwd: 'examples/SimpleBackgroundHttp'
      },
      tns_plugin_install: {
        cmd: 'tns plugin add ../../dist/package',
        cwd: 'examples/SimpleBackgroundHttp'
      },
      run_ios_emulator: {
        cmd: 'tns run ios --emulator --device iPhone-6',
        cwd: 'examples/SimpleBackgroundHttp'
      },
      run_android_emulator: {
        cmd: 'tns run android --emulator',
        cwd: 'examples/SimpleBackgroundHttp'
      }
    },
    copy: {
      package: {
        files: [
          { expand: true, cwd: 'source', src: ['**/*.js', '**/*.xml', '**/*.jar', 'package.json', 'README.md', 'imagepicker.d.ts'], dest: 'dist/package' }
        ]
      }
    },
    mkdir: {
      dist: {
        options: {
          create: ["dist/package"]
        }
      }
    }
  });

  grunt.loadNpmTasks('grunt-exec');
  grunt.loadNpmTasks('grunt-contrib-copy');
  grunt.loadNpmTasks('grunt-contrib-clean');
  grunt.loadNpmTasks('grunt-mkdir');

  grunt.registerTask('http-dev', 'Host handle uploads.', function() {

    var done = this.async();

    var http = require("http");
    var fs = require("fs");

    var server = http.createServer(function(request, response) {
      var Throttle = require("stream-throttle").Throttle;

      var fileName = request.headers["file-name"];
      console.log(request.method + "Request! Content-Length: " + request.headers["content-length"] + ", file-name: " + fileName);
      console.dir(request.headers);

      var out = "tests/www/uploads/upload-" + new Date().getTime() + "-" + fileName;
      console.log("Output in: " + out);

      var total = request.headers["content-length"];
      var current = 0;

      var shouldFail = request.headers["should-fail"];

      request.pipe(new Throttle({ rate: 1024 * 512 })).pipe(fs.createWriteStream(out, { flags: 'w', encoding: null, fd: null, mode: 0666 }));

      request.on('data', function(chunk) {
        current += chunk.length;
        
        if (shouldFail && (current / total > 0.25)) {
          console.log("Error ");
          var body = "Denied!";
          response.writeHead(408, "Die!", { "Content-Type": "text/plain", "Content-Length": body.length, "Connection": "close" });
          response.write(body);
          response.end();
          console.log("Terminated with error: [" + out + "]: " + current + " / " + total + "  " + Math.floor(100 * current / total) + "%");
        } else {
          console.log("Data [" + out + "]: " + current + " / " + total + "  " + Math.floor(100 * current / total) + "%");
        }
      });

      request.on('end', function () {
        setTimeout(function() {
          console.log("Done (" + out + ")");
          var body = "Upload complete!";
          response.writeHead(200, "Done!", { "Content-Type": "text/plain", "Content-Length": body.length });
          response.write(body);
          response.end();
        }, 10000);
      });

      request.on('error', function(e) {
        console.log('error!');
        console.log(e);
      });
    });

    server.listen(8083);
    console.log("Server is listening");
  });

  // Default task(s).
  grunt.registerTask('default', [
    'clean:dist',
    'exec:tsc_package',
    'mkdir:dist',
    'copy:package',
    'exec:npm_pack',
    'exec:tns_install',
    'exec:tns_plugin_install'
  ]);

  grunt.registerTask('ios', [
    'default',
    'exec:run_ios_emulator'
  ]);

  grunt.registerTask('android', [
    'default',
    'exec:run_android_emulator'
  ])
};

