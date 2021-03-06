import * as expreva from '../../src'

var $ = document.querySelector.bind(document)
var $$ = function(sel) {
  return Array.prototype.slice.call(document.querySelectorAll(sel))
}
var $textarea = $('.section-expression textarea')
var $runAction = $('.evaluate-button')

var $instructions = $('.section-instructions code')
var $result = $('.section-result code')
var $resultCanvas = $('.section-result .result-canvas')
var $resultError = $('.section-error code')
var $resultErrorContainer = $('.section-error')

var env = expreva.env = expreva.createEnvironment({
  say(txt) {
    $resultCanvas.innerText = txt
  }
})

$textarea.focus()

console.log('expreva', expreva)
expreva.log = true
console.log('To disable logs, set expreva.log=false')

function log() {
  if(expreva.log) console.log.apply(console.log, arguments)
}

function clearText() {
  var arg
  for (var i=0, len=arguments.length; i < len; i++) {
    arg = arguments[i]
    if (!arg) {
      continue
    }
    arg.innerText = ''
  }
}

function setText(el, value) {
  el.innerText = value
}

function renderValue(val) {
  return expreva.valueToPrettyString(val)
}

function renderInstructions(instr) {
  return expreva.syntaxTreeToPrettyString(instr)
}

function clearError() {
  clearText($resultError)
  $resultErrorContainer.classList.add('hide')
}

function setError(msg) {
  setText($resultError, msg)
  $resultErrorContainer.classList.remove('hide')
}

var lastExpression

function render() {

  var expression, instructions, result

  expression = $textarea.value
  // if (expression===lastExpression) return
  $resultCanvas.innerText = ''

  lastExpression = expression

  try {

    instructions = expreva.parse(expression)

    if (instructions==null) {
      log('Empty result after parse')
      clearText($instructions, $result, $resultError)
      return
    }

    $instructions.innerText = renderInstructions(instructions)

    log('Parsed', instructions)
    clearError()

  } catch(e) {

    log('Parse error', e)
    setError(e.message)

    // Partially parsed Instructions
    $instructions.innerText = renderInstructions(expreva.instructions)

    clearText($result)
    return
  }

  try {

    result = expreva.evaluate(instructions, env)

    log('Result', result)

    setText($result, renderValue(result))
    clearError()

  } catch(e) {
    log('Evaluate error', e)
    clearText($result)
    setError(e.message)
  }

}

var debounce = function(fn, duration) {
  var timer = null
  return function() {
    if (!timer) return fn()
    clearTimeout(timer)
    timer = setTimeout(fn, duration)
  }
}

var scheduleRender = debounce(render, 5)

$runAction.addEventListener('click', function() {
  scheduleRender()
  $textarea.focus()
})

$textarea.addEventListener('keyup', () => {
  if ($textarea.value===lastExpression) return
  setTimeout(render(), 0)
})

function renderExpr(el) {
  $textarea.value = el.innerText
  $textarea.focus()
  scheduleRender()
}

$$('code.expr').map(function(el) {
  el.addEventListener('click', function() {
    lastExpression = ''
    renderExpr(el)
  })
})

scheduleRender()
