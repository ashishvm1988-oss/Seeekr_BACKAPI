module.exports = {
    apps: [
      {
        name: "core-api",         // Application name
        script: "./src/app.js",           // Command to run
        autorestart: true,        // Automatically restart on failure
        restart_delay: 5000,      // Delay before restarting (in milliseconds)
        watch: false,             // Set to true to watch for file changes and auto-restart
        max_restarts: 10
      }
    ]
  };