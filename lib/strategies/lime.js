'use babel'

import xmlParser from 'xml2json'
import path from 'path'
import fs from 'fs'

function readFile(file) {
  return new Promise((resolve, reject) => {
    fs.readFile(file, (err, data) => {
      err ? reject(err) : resolve(data)
    })
  })
}

const parseOptions = {
  arrayNotation: true,
  object: true
}

function parseXml(data) {
  return new Promise((resolve, reject) => {
    try {
      const json = xmlParser.toJson(data, parseOptions)
      resolve(json)
    } catch (err) {
      reject(err)
    }
  })
}

function looksLikeProjectXml(xml) {
  if (!xml.project) {
    return false
  }

  const project = xml.project[0]
  if (!project.app) {
    return false
  }

  const app = project.app[0]
  if (typeof app.main !== 'string') {
    return false
  }

  return true
}

function nope(err) {
  console.error(err)
  return false
}

const targetFlags = {
  flash: ['web'],
  html5: ['minify'],
  mac: ['neko', '32', '64'],
  windows: ['neko'],
  linux: ['neko', '32', '64'],
  ios: ['simulator'],
  android: ['emulator'],
  blackberry: ['simulator'],
  emscripten: [],
  tvos: ['simulator'],
  tizen: ['simulator'],
  webos: ['simulator'],
}

export default class LimeStrategy {
  static config = {
    limePath: {
      title: 'Path to the lime or openfl executable',
      type: 'string',
      default: 'lime',
      order: 1
    },
    limeTargets: {
      title: 'Comma-separated list of supported targets',
      type: 'string',
      default: 'flash,html5,mac,windows,linux,ios,android,blackberry,emscripten,tvos,tizen,webos',
      order: 2
    },
    limeCommands: {
      title: 'Comma-separated list of supported commands',
      type: 'string',
      default: 'test,build,clean,rebuild,run,update,deploy,display',
      order: 3
    }
  }

  constructor(cwd) {
    this.cwd = cwd
  }

  isEligible() {
    return (
      readFile(`${this.cwd}/project.xml`)
        .then(parseXml)
        .then(looksLikeProjectXml)
        .catch(nope)
    )
  }

  settings() {
    const list = []
    const limePath = atom.config.get('build-haxe.limePath')
    const limeBinary = path.parse(limePath).name
    const targetNames = atom.config
      .get('build-haxe.limeTargets')
      .split(',')

    const commands = atom.config
      .get('build-haxe.limeCommands')
      .split(',')

    function makeTask(command, target, flagName) {
      const flag = flagName ? `-${flagName}` : ''
      list.push({
        name: `${limeBinary}: ${command} ${target} ${flag}`,
        atomCommandName: `${limeBinary}:${command}-${target}${flag}`,
        args: [ command, target ].concat(flag ? flag : [])
      })
    }

    const targets = []
    for (let name of targetNames) {
      targets.push({
        name,
        flags: targetFlags[name]
      })
    }

    for (let command of commands) {
      for (let target of targets) {
        makeTask(command, target.name)
        for (let flag of target.flags) {
          makeTask(command, target.name, flag)
        }
      }
    }

    return list.map(command => {
      if (command.debug) command.args.push('-debug')
      command.exec = limePath
      command.sh = false
      command.env = {}
      command.cwd = atom.project.getPaths()[0]
      return command
    })
  }
}
