const { eva } = require('./common')

test('arithmetic', it => {
  const is = eva(it)

  is('1 + 1', 2)
  is('1 + 2 * 3', 7)
  is('(1 + 2) * 3', 9)
  is('10 / 2', 5)
})

test('assignment', it => {
  const is = eva(it)

  is(`a = {} a.b = 'hi' a `, { b: 'hi' })
  is(`a=[1] b=[2] b` , [2])
})
