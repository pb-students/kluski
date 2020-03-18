#!/usr/bin/env node

const chalk = require('chalk')
const np2 = require('next-pow-2')
const prompts = require('prompts')

const POWERS = {
  1: 0,
  2: 1,
  4: 2,
  8: 3,
  16: 4,
  32: 5,
  64: 6,
  128: 7,
  256: 8,
  512: 9,
  1024: 10
}

const ALPHABET = 'abcdefghijklmnopqrstuvwxyz'

const replaceAt = (str, idx, char) => {
  const arr = str.split('')
  arr[idx] = char
  return arr.join('')
}

const toBinary = (number, bits) => {
  const bin = number.toString(2)
  return ('0'.repeat(bits) + bin).slice(bin.length)
}

const expandImplicant = (implicant) => {
  const idx = implicant.indexOf('-')
  if (!~idx) return [ implicant ]

  return [
    ...expandImplicant(replaceAt(implicant, idx, '0')),
    ...expandImplicant(replaceAt(implicant, idx, '1'))
  ]
}

const parseMethod = (method) => {
  const words = method.split('+')
  let bits = 0
  const res = []

  for (const word of words) {
    const elements = []
    let isNegated = false
    let currentElement = null

    for (const char of word.split('')) {
      if (!ALPHABET.includes(char) && char !== '!') {
        continue
      }

      if (currentElement !== null) {
        const bit = ALPHABET.indexOf(currentElement)
        elements.push({ bit, value: +!isNegated })
        bits = Math.max(bits, bit)

        isNegated = false
        currentElement = null
      }

      switch (char) {
        case '!':
          isNegated = !isNegated
          break

        default:
          currentElement = char
      }
    }

    if (currentElement !== null) {
      const bit = ALPHABET.indexOf(currentElement)
      elements.push({ bit, value: +!isNegated })
      bits = Math.max(bits, bit)
    }

    res.push(elements)
  }

  return {
    bits: bits + 1,
    words: res,
    fn (data) {
      const binary = toBinary(+data, bits + 1)
      for (const word of res) {
        let success = true

        for (const { bit, value } of word) {
          success = success && (+binary[bit] === value)
        }

        if (success) {
          return {
            result: true,
            word
          }
        }
      }

      return {
        result: false,
        word: null
      }
    }
  }
}

const humanWord = (word) => {
  if (word === null) return '?'

  let res = ''
  for (const { bit, value } of word) {
    res += `${value === 0 ? '!' : ''}${ALPHABET[bit]}`
  }

  return res
}

const humanImplicant = (implicant, mode = 1) => {
  let res = ''
  for (let i = 0; i < implicant.length; ++i) {
    const char = implicant[i]
    if (char === '1') {
      res += ALPHABET[i]
    }
    if (char === '0') {
      res += '!' + ALPHABET[i]
    }
  }

  return res
}

const truths = (method) => {
  if (typeof method === 'string') {
    method = parseMethod(method)
  }

  const { bits, fn } = method
  const indexes = []

  let i = 0
  const max = 2 ** bits

  console.log(ALPHABET.slice(0, bits), '| f')

  const outputs = {}
  while (i < max) {
    const humanBits = toBinary(i, bits)
    const res = +fn(i).result

    console.log(humanBits, '|', res.toString())

    outputs[res] = (outputs[res] || 0) + 1

    if (res) {
      indexes.push(i)
    }

    i += 1
  }

  console.log(`\ntrue:  ${outputs[1]}\nfalse: ${outputs[0]}`)
  console.log(`\nindexes: ${indexes.join(', ')}`)
}

const truthDiff = (method, valid) => {
  if (typeof method === 'string') {
    method = parseMethod(method)
  }

  const { bits, fn } = method

  let i = 0
  const max = 2 ** bits

  console.log(ALPHABET.slice(0, bits), '| f | e | error')

  while (i < max) {
    const binary = i.toString(2)
    const humanBits = ('0'.repeat(bits) + binary).slice(binary.length)
    const { result, word } = fn(i)

    const correct = valid.includes(i)

    if (result !== correct) {
      console.log(chalk.red(`${humanBits} | ${+result} | ${+correct} | ${humanWord(word)}`))
    } else {
      console.log(chalk.green(`${humanBits} | ${+result} | ${+correct}`))
    }

    i += 1
  }
}

const kluski = (truths) => {
  const size = np2(truths.reduce((a, n) => Math.max(a, n), 0))
  const bits = POWERS[size]
  const binaries = truths.map(n => toBinary(n, bits))

  const grouped = Array(bits + 1).fill([])
  for (const binary of binaries) {
    const group = binary.split('').reduce((a, n) => a + (+n), 0)
    grouped[group].push(binary)
  }

  const traverse = (groups, prevImplicants = [], log = []) => {
    const col = []

    for (const group of groups) {
      for (const num of group) {
        col.push(num)
      }

      if (groups.indexOf(group) !== groups.length - 1) {
        col.push(' '.repeat(bits))
      }
    }

    const next = []
    let nextPass = false

    const used = {}
    const { length } = groups
    for (let i = 0; i < length - 1; ++i) {
      const masked = new Set()

      const masks = groups[i]
      const group = groups[i + 1]

      for (const mask of masks) {
        for (const binary of group) {
          let diff = -3

          for (let j = 0; j < bits; ++j) {
            const cmask = mask[j]
            const cbin = binary[j]

            if (cmask === '-') {
              if (cbin !== '-') {
                diff = -2
              }
            }

            if (cmask === '0') {
              if (cbin === '1') {
                if (diff === -3) {
                  diff = j
                } else {
                  diff = -1
                }
              }
            }
          }

          if (diff > -1) {
            masked.add(replaceAt(mask, diff, '-'))
            nextPass = true
            used[mask] = true
            used[binary] = true
          } else {
            used[mask] = used[mask] || false
            used[binary] = used[binary] || false
          }
        }
      }

      next.push(masked)
    }

    log.push(col)

    if (nextPass) {
      const primeImplicants = []

      for (const [ candidate, isUsed ] of Object.entries(used)) {
        if (!isUsed) {
          primeImplicants.push(candidate)
        }
      }

      return traverse(next, [ ...prevImplicants, ...primeImplicants ], log)
    }

    // Get max rows
    let maxRows = 0
    for (const col of log) {
      maxRows = Math.max(col.length, maxRows)
    }

    // Start printing row by row
    for (let i = 0; i < maxRows; ++i) {
      let res = ''

      for (let k = 0; k < log.length; ++k) {
        if (k !== 0) {
          res += ` ${chalk.gray('|')} `
        }

        if (log[k][i] === undefined) {
          res += ' '.repeat(bits)
        } else {
          res += log[k][i]
        }
      }

      console.log(res)
    }

    const primeImplicants = [ ...prevImplicants ]

    for (const group of groups) {
      for (const pi of group) {
        primeImplicants.push(pi)
      }
    }

    console.log()

    // Select essential ones
    const map = {}
    for (const implicant of primeImplicants) {
      map[implicant] = Array(size).fill(false)

      for (const binary of expandImplicant(implicant)) {
        const idx = parseInt(binary, 2)
        map[implicant][idx] = true
      }
    }

    // Sum up the columns
    const sums = {}
    for (const positions of Object.values(map)) {
      for (let i = 0; i < size; ++i) {
        sums[i] = sums[i] || 0
        sums[i] += positions[i]
      }
    }

    const methodBuilder = new Set()

    const hasSingleColumn = {}
    for (const [ implicant, positions ] of Object.entries(map)) {
      for (let i = 0; i < size; ++i) {
        if (positions[i] && sums[i] === 1) {
          hasSingleColumn[implicant] = true
          methodBuilder.add(humanImplicant(implicant))
        }
      }
    }

    console.log('Chosen implicants:')
    for (const [ implicant, positions ] of Object.entries(map)) {
      const row = positions.map(x => x ? 'x' : ' ').join(' ')
      const hi = humanImplicant(implicant)
      console.log(
        implicant,
        hasSingleColumn[implicant] ? chalk.blue(row) : chalk.gray(row),
        hasSingleColumn[implicant] ? chalk.green(hi) : chalk.gray(hi)

      )
    }
    console.log()

    console.log('Generated method:')
    const method = [...methodBuilder].join(' + ')
    console.log(chalk.blue(method))
    console.log()

    console.log('Check against truths table:')
    truthDiff(method, truths)
  }

  console.log('Kluski:')
  return traverse(grouped)
}

// Menu memory
const memory = {
  function: '!ab',
  truth: [0]
}

// Action utils
const requestTruthTable = async () => {
  const { value } = await prompts({
    name: 'value',
    type: 'list',
    initial: memory.truth.join(', '),
    message: 'Truth table indexes'
  })

  return (memory.truth = value.map(n => +n))
}

const requestFunction = async () => {
  const { value } = await prompts({
    name: 'value',
    type: 'text',
    initial: memory.function,
    message: 'Function'
  })

  return (memory.function = value)
}

// Menu loop
;(async function () {
  while (true) {
    const { action } = await prompts([{
      message: 'Select action',
      type: 'select',
      name: 'action',
      choices: [
        { title: 'Generate function with Quine-McCluskey', value: 0 },
        { title: 'Generate truth table', value: 1 },
        { title: 'Test function against truth table', value: 2 },
        { title: 'Exit', value: 3 }
      ]
    }])

    switch (action) {
      case 0:
        kluski(await requestTruthTable())
        break

      case 1:
        truths(await requestFunction())
        break

      case 2:
        truthDiff(await requestFunction(), await requestTruthTable())
        break

      case 3:
        process.exit()
        break
    }

    console.log()
  }
})()
