const { createLogger, format, transports } = require('winston');
const path = require('path');

var options = {
  file: {
    filename: 'logs/app.log',
    //handleExceptions: true,
    json: true,
    maxsize: 50*1024, //50MB
    maxFiles: 10,
    colorize: false,
  }
}

var optionsError = {
  file: {
    level: 'error',
    filename: 'logs/master-error.log',
    //handleExceptions: true,
    json: true,
    maxsize: 50*1024, //50MB
    maxFiles: 10,
    colorize: false,
  }
}

const logger = caller => {
  return createLogger({
    level: 'debug',
    format: format.combine(
      format.label({ label: path.basename(caller) }),
      format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
      format.printf(
        info =>
          `${info.timestamp} ${info.level} [${info.label}]: ${info.message}`
      )
    ),
    transports: [    
      new transports.File(optionsError.file),
      new transports.File(options.file)
    ]
  });
};



module.exports = logger;


