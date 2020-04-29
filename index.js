#!/usr/bin/env node

const fs = require('fs')
const chalk = require('chalk')
const cp = require('child_process')
const ora = require('ora')
const path = require('path')
const base = process.cwd()

const packageJson = path.resolve(base, 'package.json')

const msg = {
  fail: ' ~{ƒA1l-€∂// ',
  skip: ' [> ↷ ↷ ↷ >] ',
  ok: ' \\(*＾▽＾*)/ '
}

const options = {
  discardStdin: false,
  spinner: {
    frames: [
      '▉▊▋▌▍▎▏▎▍▌▋▊▉',
      '▊▋▌▍▎▏▎▍▌▋▊▉▉',
      '▋▌▍▎▏▎▍▌▋▊▉▉▊',
      '▌▍▎▏▎▍▌▋▊▉▉▊▋',
      '▍▎▏▎▍▌▋▊▉▉▊▋▌',
      '▎▏▎▍▌▋▊▉▉▊▋▌▍',
      '▏▎▍▌▋▊▉▉▊▋▌▍▎',
      '▎▍▌▋▊▉▉▊▋▌▍▎▏',
      '▍▌▋▊▉▉▊▋▌▍▎▏▎',
      '▌▋▊▉▉▊▋▌▍▎▏▎▍',
      '▋▊▉▉▊▋▌▍▎▏▎▍▌',
      '▊▉▉▊▋▌▍▎▏▎▍▌▋',
      '▉▉▊▋▌▍▎▏▎▍▌▋▊',
      '▉▊▋▌▍▎▏▎▍▌▋▊▉',
      '▊▋▌▍▎▏▎▍▌▋▊▉▉',
      '▋▌▍▎▏▎▍▌▋▊▉▉▊',
      '▌▍▎▏▎▍▌▋▊▉▉▊▋',
      '▍▎▏▎▍▌▋▊▉▉▊▋▌',
      '▎▏▎▍▌▋▊▉▉▊▋▌▍',
      '▏▎▍▌▋▊▉▉▊▋▌▍▎',
      '▎▍▌▋▊▉▉▊▋▌▍▎▏',
      '▍▌▋▊▉▉▊▋▌▍▎▏▎',
      '▌▋▊▉▉▊▋▌▍▎▏▎▍',
      '▋▊▉▉▊▋▌▍▎▏▎▍▌',
      '▊▉▉▊▋▌▍▎▏▎▍▌▋',
      '▉▉▊▋▌▍▎▏▎▍▌▋▊'
    ]
  }
}

const shrink = (o, keys) => {
  for (let key in o) {
    if (o.hasOwnProperty(key)) {
      if (keys.includes(key)) {
        o[key] = Object.keys(o[key]).filter(k => o[key][k][0] === '^' || (verbose && console.log('skipping ' + k)))
      } else {
        delete o[key]
      }
    }
  }
  return o
}

const rand = (...args) => args[Math.round(Math.random() * (args.length - 1))]
const readPkg = () => JSON.parse(fs.readFileSync(packageJson, 'utf8'))

const keys = ['dependencies', 'devDependencies', 'peerDependencies', 'optionalDependencies']
const verbose = !!process.argv[2]

const isLargerVersion = (v1, v2) => {
  // '^1.2.3' '3.1.2'
  const v1Prefix = v1[0] === '^' ? '^' : ''
  const v2Prefix = v2[0] === '^' ? '^' : ''

  // hard-coded versions are always larger
  if (v1Prefix && !v2Prefix) {
    return true
  } else if (v2Prefix && !v1Prefix) {
    return false
  } else {
    const v1Parts = v1
      .replace('^', '')
      .split('.')
      .map(v => +v) // unary operator
    const v2Parts = v2
      .replace('^', '')
      .split('.')
      .map(v => +v)

    for (let i = 0, l = v1Parts.length; i < l; i++) {
      if (v1Parts[i] > v2Parts[i]) {
        return true
      } else if (v2Parts[i] > v1Parts[i]) {
        return false
      }
    }
  }
}

const syncDependencies = async () => {
  const pkg = readPkg() // we need the updated one

  verbose && console.log('Syncing dependencies')

  keys.forEach(pDep => {
    if (!pkg[pDep]) return

    Object.keys(pkg[pDep]).forEach(mod => {
      keys.forEach(dep => {
        if (pDep === dep || !pkg[dep] || !pkg[dep][mod]) return
        const compareResult = isLargerVersion(pkg[pDep][mod], pkg[dep][mod])

        if (compareResult === true) {
          verbose && console.log(`syncing ${pDep} -> ${dep} ${mod}: ${pkg[pDep][mod]} -> ${pkg[dep][mod]}`)
          pkg[dep][mod] = pkg[pDep][mod]
        } else if (compareResult === false) {
          verbose && console.log(`syncing ${dep} -> ${pDep} ${mod}: ${pkg[dep][mod]} -> ${pkg[pDep][mod]}`)
          pkg[pDep][mod] = pkg[dep][mod]
        }
      })
    })
  })

  fs.writeFileSync(packageJson, JSON.stringify(pkg, null, 2))
}

const vLog = d => verbose && process.stdout.write(d.toString())

const updateModules = (type, modules) =>
  new Promise((res, rej) => {
    switch (type) {
      case 'peerDependencies':
        modules.unshift('-P')
        break
      case 'devDependencies':
        modules.unshift('-D')
        break
      case 'optionalDependencies':
        modules.unshift('-O')
        break
    }

    modules.unshift('add')

    verbose && console.log('  yarn', modules.join(' '))

    const cmd = cp.spawn('yarn', modules, { cwd: base })

    cmd.stdout.on('data', vLog)
    cmd.stderr.on('data', vLog)

    cmd.on('close', code => (code ? rej() : res()))
  })

;(async () => {
  const spinner = verbose ? null : ora(options)
  const v =
    !verbose &&
    setInterval(() => {
      spinner.color = rand('red', 'green', 'yellow', 'blue', 'magenta', 'cyan')
    }, 5000)

  const deps = shrink(readPkg(), keys)

  verbose && console.log('Removing yarn.lock and node_modules')

  const nodeModules = path.resolve(base, 'node_modules')
  const lockFile = path.resolve(base, 'yarn.lock')

  cp.execSync(`rm -rf ${nodeModules} ${lockFile}`)

  for (let i in keys) {
    if (!keys.hasOwnProperty(i)) continue
    const key = keys[i]

    if (!verbose) {
      spinner.text = `Updating ${key}`
      spinner.start()
    } else {
      console.log(`Updating ${key}`)
    }

    if (!deps[key]) {
      !verbose && spinner.stopAndPersist({ symbol: chalk.blue(msg.skip) })
    } else {
      await updateModules(key, deps[key])
        .then(() => !verbose && spinner.stopAndPersist({ symbol: chalk.green(msg.ok) }))
        .catch(() => !verbose && spinner.stopAndPersist({ symbol: chalk.red(msg.fail) }))
    }
  }

  !verbose && (spinner.text = 'Synching dependencies')

  const synced = await syncDependencies()
    .then(() => true)
    .catch(() => false)

  !verbose && spinner.stopAndPersist({ symbol: chalk[synced ? 'green' : 'red'](msg[synced ? 'ok' : 'fail']) })
  !verbose && spinner.stop()
  v && clearInterval(v)

  console.log('DONE')
})()
