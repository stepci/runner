const { checkResult } = require('./../dist/matcher')

function f (
  { params, check },
  captures,
  cookies,
  schemaValidator,
  options,
  config
) {
  const stepResult = {
    type: '@yourcompany/plugin',
  }

  if (check) {
    stepResult.checks = {}

    if (check.reply) {
      stepResult.checks['reply'] = checkResult(params.hello, check.reply)
    }
  }

  return stepResult
}

module.exports = {
  default: f
}
