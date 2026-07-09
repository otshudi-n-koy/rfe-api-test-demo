module.exports = {
  default: {
    requireModule: ['ts-node/register'],
    require: [
      'src/steps/**/*.ts',
      'src/support/**/*.ts',
      'src/mft/**/*.ts'
    ],
    format: [
      'progress',
      'json:reports/cucumber-report.json'
    ],
    formatOptions: { snippetInterface: 'async-await' },
    paths: ['features/**/*.feature']
  }
}